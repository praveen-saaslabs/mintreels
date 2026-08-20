# AI Video Analysis Architecture

Shared context for the hook-discovery pipeline. Read this before implementing any part.

Source prompt: internal AI-video-analysis plan. MintReels already has most of the ingest/transcript spine; this work adds LLM hook discovery, embeddings, a swappable vector store, dedup/ranking, and clip boundaries.

---

## 1. Current architecture

### Transcript spine (already done)

- Canonical store: `transcript_segments` (`recording_id`, `sequence`, `start_ms`, `end_ms`, `speaker`, `text`) — integer milliseconds.
- Parent `transcripts` row holds metadata, optional full text, and `raw_response` JSON (provider words / caption URLs).
- VTT is generated on read (`GET /api/recordings/:id/transcript.vtt`), not stored as a blob.
- PyAI Hear transcription via `SpeechProvider` (`packages/ai/src/providers/pyai`). Confirmed endpoint: `POST/GET /v1/transcription/jobs`.

### Analysis today

Worker pipeline (`apps/worker/src/pipeline/orchestrator.ts`):

```text
CRITICAL (sequential, hard-fail)
  AUDIO_EXTRACTION → AUDIO_UPLOAD → TRANSCRIPTION → TRANSCRIPTION_PERSIST

ANALYSIS (Promise.all — already parallel)
  SUMMARY | ACTION_ITEMS | HOOKS

TRAILING (sequential, soft-fail → Partial)
  CLIP_RECOMMENDATIONS  (no-op: skipped, "hooks already are clip windows")
```

- Summary + action items: OpenAI-compatible LLM with structured JSON (`LLM_PROVIDER=openai|nvidia`).
- Hooks: **LLM discovery** on the OpenAI-compatible adapter (Part 2) — deterministic 20–60s semantic windows, `hooks-v2` prompt, segment IDs resolved to milliseconds server-side, weighted dimension scoring. The extractive heuristic (`packages/ai/src/extractive-hooks.ts`) is the fallback; the PyAI adapter still uses it directly.
- `HOOK_EMBEDDINGS` embeds hooks (OpenAI-compatible) and upserts to Qdrant (Part 3).
- `CLIP_RECOMMENDATIONS` runs dedup → diversity ranking → clip boundaries (Part 4).

### Persistence today

| Table       | Role                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------- |
| `hooks`     | AI clip-window suggestions: `title`, `hook`, `reason`, `start_ms`, `end_ms`, `score` (0..1) |
| `summaries` | text + `action_items` JSON + `key_points` JSON                                              |
| `clips`     | rendered exports (optional `hook_id`)                                                       |

API: `GET /api/recordings/:id/hooks` returns the current shape (id, recordingId, title, hook, reason, startMs, endMs, score, createdAt). Web UI formats `score.toFixed(2)` assuming 0..1.

No `hook_candidates`, `clip_suggestions`, or `recording_ai_analysis` tables.

### Providers today

| Interface               | Production impl               | Notes                                |
| ----------------------- | ----------------------------- | ------------------------------------ |
| `SpeechProvider`        | `PyAISpeechProvider`          | Confirmed                            |
| `LLMProvider`           | `OpenAICompatibleLLMProvider` | Chat Completions + `response_format` |
| `EmbeddingProvider`     | interface only                | `PyAILLMProvider.embed` throws       |
| `KnowledgeBaseProvider` | `PyAIKnowledgeBaseProvider`   | stub — every method throws           |
| `StorageProvider`       | Filestack                     |                                      |
| `QueueProvider`         | BullMQ                        |                                      |
| Vector store            | **does not exist**            |                                      |

Composition roots: `apps/worker/src/providers.ts`, `apps/api/src/providers/factories.ts`.

### Jobs / Docker

- Only `ingest-video` is registered. Other job files are stubs.
- Step runner: DB checkpoint per `job_steps` row, max 4 attempts, exponential backoff, audit log.
- Docker: single `docker/Dockerfile.dev` (`node:22-alpine` + ffmpeg). Worker bind-mounts the repo. No LanceDB volume yet.
- Config: no `packages/config`; env via `EnvKey` + ad-hoc `process.env` readers.

---

## 2. Proposed architecture

```text
                         VIDEO
                           │
                           ▼
                    SpeechProvider (PyAI)
                           │
                           ▼
                  transcript_segments (MySQL, ms)
                           │
                           ▼
                    Semantic windows (deterministic)
                           │
                           ▼
                      LLMProvider
             ┌─────────────┼─────────────┐
          Summary     Action Items    Hooks (segment IDs)
                                           │
                                           ▼
                                  hooks rows (MySQL)
                                           │
                                           ▼
                               EmbeddingProvider (batch)
                                           │
                                           ▼
                              VectorStoreProvider
                                           │
                                        Qdrant
                                           │
                                    Dedup + rank
                                           │
                                 ClipBoundaryService
                                           │
                              hooks.status = selected
                              clip_start_ms / clip_end_ms
```

### Non-negotiables

- MySQL is canonical. LanceDB is a derived index, rebuildable from `hooks`.
- LLM returns **segment IDs**, never timestamps. Backend derives `startMs`/`endMs` from `transcript_segments`.
- Integer milliseconds everywhere.
- Business logic depends on `EmbeddingProvider` + `VectorStoreProvider`, never LanceDB/OpenAI/PyAI types.
- Do not invent PyAI endpoints. Embeddings and chat stay on the OpenAI-compatible provider until PyAI actually exposes them.
- Score scale stays **0..1** (UI + existing column). LLM may score 0–10; mapper divides by 10.
- Extend `hooks` in place. Do **not** add `hook_candidates` / `clip_suggestions`. `status` distinguishes candidate vs selected vs rejected. `clips` remains rendered output.

### Pipeline after all parts

```text
CRITICAL (unchanged, sequential)
  AUDIO_EXTRACTION → AUDIO_UPLOAD → TRANSCRIPTION → TRANSCRIPTION_PERSIST

ANALYSIS (unchanged Promise.all)
  SUMMARY | ACTION_ITEMS | HOOKS   ← LLM candidates + scoring live here

TRAILING
  HOOK_EMBEDDINGS                  ← Part 3 (new JobStepName)
  CLIP_RECOMMENDATIONS             ← Part 4 (dedup, rank, clip boundaries)
```

HOOKS stays in the parallel analysis phase. Embeddings/dedup/ranking/clips depend on candidates existing, so they stay sequential after ANALYSIS.

### Schema (hooks table, extended)

New columns (nullable unless noted):

- `start_segment_id`, `end_segment_id`
- `hook_type` (HookType enum)
- `context_text`
- dimension scores 0..1: `quality_score`, `standalone_score`, `curiosity_score`, `emotional_score`, `specificity_score`, `shareability_score`, `novelty_score`, `controversy_score`, `headline_score`
- `score` — final weighted score, still 0..1
- `status` — HookStatus, `VARCHAR(32)` default `candidate` (MySQL 8.4 rejects `TEXT` defaults)
- `embedding_status` — EmbeddingStatus, `VARCHAR(32)` default `pending`
- `clip_start_ms`, `clip_end_ms`
- `provider`, `model`, `prompt_version`

Indexes: `(recording_id, start_ms)`, `(recording_id, status)`.

### Capability contracts

```ts
interface EmbeddingProvider {
  readonly provider: string;
  readonly model: string;
  readonly dimensions: number;
  embed(texts: string[]): Promise<number[][]>;
}

interface VectorStoreProvider {
  upsert(items: VectorItem[]): Promise<void>;
  search(vector: number[], options: VectorSearchOptions): Promise<VectorSearchResult[]>;
  delete(ids: string[]): Promise<void>;
  deleteByRecordingId(recordingId: number): Promise<void>;
  healthCheck(): Promise<void>;
}
```

Vector id = `String(hook.id)` (deterministic, idempotent upsert). Search always filters by `recordingId`. `fetch(ids)` returns stored vectors so dedup reuses them without re-embedding.

Vector impl: **Qdrant** as a self-hosted Docker service, chosen by `VECTOR_STORE_PROVIDER=qdrant` (`QDRANT_URL`). In-memory fake for tests. The collection is created lazily on first upsert with the embedding width; changing `EMBEDDING_MODEL` needs a collection rebuild, not a migration. (LanceDB was the original plan but its Alpine prebuilds were unreliable under Docker.)

### Scoring

Weights from `loadHookConfig()` (not hardcoded in business logic):

```text
finalScore =
  0.22 * quality +
  0.15 * standalone +
  0.12 * curiosity +
  0.08 * emotional +
  0.08 * specificity +
  0.08 * shareability +
  0.04 * novelty +
  0.12 * controversy +
  0.11 * headline
```

All dimensions stored 0..1. Configurable via the Settings UI (database-first) with environment variable fallbacks.

### Dedup (Part 4)

Greedy grouping, not K-means. Compare each candidate to cluster representative; similarity ≥ `HOOK_SIMILARITY_THRESHOLD` (default 0.85) joins the cluster; keep highest `score`. Then diversity-aware top `HOOK_FINAL_COUNT` (default 10) across `HookType`.

### Clip boundaries (Part 4)

```text
clipStartMs = max(0, hook.startMs - CLIP_PREROLL_MS)
clipEndMs   = min(recording.durationMs, hook.endMs + CLIP_POSTROLL_MS)
```

Do not cross into an unrelated neighboring segment; preserve integer ms.

---

## 3. Confirmed vs unconfirmed PyAI capabilities

| Capability                             | Status            | Evidence                                               |
| -------------------------------------- | ----------------- | ------------------------------------------------------ |
| Transcription submit (multipart audio) | **Confirmed**     | `POST /v1/transcription/jobs`, model `pyai-hear`       |
| Transcription poll / result            | **Confirmed**     | SDK `transcriptionJobs.get` + optional `result_url`    |
| Diarization                            | **Confirmed**     | `diarize: true` on submit                              |
| VTT/SRT output formats                 | **Confirmed**     | `output_formats` on submit; URLs in result (ephemeral) |
| Chat / summarize / hooks LLM           | **Not confirmed** | `@pyai/sdk` Recap only; no chat endpoint used          |
| Embeddings                             | **Not confirmed** | No endpoint; `PyAILLMProvider.embed` throws            |
| Knowledge Base CRUD + search           | **Not confirmed** | Adapter fully stubbed                                  |
| Vector similarity / metadata filter    | **Not confirmed** | Do not treat PyAI KB as the hook vector store          |

Until embeddings/chat are in the PyAI OpenAPI contract: use OpenAI-compatible LLM + embedding adapters. Keep KB separate from hook clustering.

---

## 4. Files that change / are created (by part)

### Part 1 — contracts + schema (shipped)

- `docs/ai-video-analysis-architecture.md` (this file)
- `packages/schema/src/enums.ts`, `packages/schema/src/hooks.ts`, `packages/schema/src/index.ts`
- `apps/api/src/migrations/0006-hook-analysis.ts` + `migrations/index.ts`
- `packages/db/src/entities/hook.entity.ts`
- `packages/ai/src/embedding-provider.ts`, `packages/ai/src/vector-store-provider.ts`, `packages/ai/src/index.ts`
- `packages/ai/src/providers/pyai/llm.ts` (embed signature only)
- `apps/worker/src/pipeline/config.ts` + `config.test.ts`
- `.env.example`, `docker-compose.yml` (worker env)
- `.cursor/rules/provider-adapters.mdc`, `.cursor/rules/package-boundaries.mdc`
- `docs/architecture.md`, `docs/providers.md`

### Part 2 — LLM hook discovery (shipped)

- `packages/ai/src/semantic-windows.ts` — shortest segment-aligned run reaching 20s, never past 60s; short tail merges backwards
- `packages/ai/src/prompts/hooks.prompt.ts` — `hooks-v2` system prompt, strict JSON schema (segment IDs, not timestamps), window payload builder
- `packages/ai/src/hook-candidates.ts` — `HookCandidate`, response parsing, segment-ID→ms resolution, 0–10 → 0..1 normalisation, weighted score, `maxCandidates` cap
- `packages/ai/src/llm-provider.ts` — `generateHooks(transcript, options)` returns `HookCandidate[]`
- `OpenAICompatibleLLMProvider.generateHooks` calls the LLM; `generateExtractiveHooks` stays as fallback
- Weights + candidate cap come from `loadHookConfig()`; `HookScoreWeights` is defined in `packages/ai` and re-exported by the worker config
- Worker `hooks` step persists the new columns (`status=candidate`, `embeddingStatus=pending`, provider/model/promptVersion) and keeps skip-if-hooks-exist
- `GET /hooks` response shape unchanged (still 0..1 `score`)

### Part 3 — embeddings + Qdrant + Docker (shipped)

Moved from LanceDB to **Qdrant** (LanceDB's Alpine prebuilds were unreliable under Docker).

- `OpenAICompatibleEmbeddingProvider` (`packages/ai/src/providers/openai-compatible/embedding.ts`)
- `packages/ai/src/providers/qdrant/qdrant-vector-store.adapter.ts` (vendor types stay inside)
- In-memory `VectorStoreProvider` fake (`packages/ai/src/in-memory-vector-store.ts`)
- Factories: `createEmbeddingProvider()`, `createVectorStoreProvider()` in worker + API
- New `JobStepName.HookEmbeddings` + handler + orchestrator trailing step
- Docker: `qdrant` service + `qdrant_data:/qdrant/storage` volume; `QDRANT_URL` / `QDRANT_API_KEY` / `QDRANT_COLLECTION`
- Idempotent: skip already-`completed` embeddings; vector id = hook id

### Part 4 — dedup, ranking, clip boundaries (shipped)

- `packages/ai/src/hook-selection.ts` — `selectHooks()`: greedy recording-scoped grouping (cosine ≥ `HOOK_SIMILARITY_THRESHOLD`), then greedy diversity ranking across `HookType` → top `HOOK_FINAL_COUNT`
- `packages/ai/src/clip-boundaries.ts` — `computeClipBoundary()`: pre/post-roll padding clamped to recording duration + transcript extent, integer ms
- `VectorStoreProvider.fetch(ids)` added so dedup reuses stored vectors instead of re-embedding
- Implemented inside `CLIP_RECOMMENDATIONS` (no longer a no-op): marks `status=selected|rejected`, writes `clip_start_ms`/`clip_end_ms`
- Hooks without a completed embedding degrade gracefully — own cluster, ranked by score only

### Part 5 — API + standalone job + delete cleanup (shipped)

- `POST /api/recordings/:id/hooks/generate` → `HooksService.generate`: clears existing hooks + vectors, enqueues a `GENERATE_HOOKS` job (no inline LLM). Requires an existing transcript (409 otherwise).
- `generate-hooks` worker job + `executeHookPipeline` (Hooks → HookEmbeddings → ClipRecommendations), resumable per `job_steps` row
- Delete recording → `vectorStore.deleteByRecordingId` before the canonical rows
- `GET /hooks` now also returns `hookType`, `status`, `clipStartMs`, `clipEndMs`, `durationMs`

Not done (deliberately out of scope for this pass): no `RebuildRecordingEmbeddingsJob` endpoint (regeneration via `generate` covers it), no hook-edit re-embed (no hook edit endpoint exists), no unit/e2e tests.

---

## 5. Risks and assumptions

| Item                      | Assumption / risk                                                                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Score scale               | UI and DB stay 0..1. Changing to 0–10 would break `toFixed(2)` display.                                                                   |
| One `hooks` table         | API/UI keep working; `status` distinguishes candidate/selected/rejected.                                                                  |
| Qdrant collection width   | Pinned to the first upsert's embedding width. Changing `EMBEDDING_MODEL` needs a collection rebuild (drop + regenerate), not a migration. |
| Dedup transitivity        | Greedy representative comparison is approximate (documented ceiling). Upgrade path: real clustering.                                      |
| Dedup vs embeddings       | Dedup reuses stored vectors via `fetch`; hooks whose embedding failed skip grouping and rank by score only.                               |
| PyAI embeddings later     | Swap `EMBEDDING_PROVIDER`; no business-logic change.                                                                                      |
| Weaviate/pgvector later   | New `VectorStoreProvider` adapter only.                                                                                                   |
| Action items / summary    | Unchanged; stay parallel with HOOKS.                                                                                                      |
| No new standalone job yet | Full ingest still one BullMQ `ingest-video`. Resume is per `job_steps` row.                                                               |

---

## 6. Env (Part 1 loader + later factories)

```env
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small
VECTOR_STORE_PROVIDER=qdrant
QDRANT_URL=http://qdrant:6333
QDRANT_API_KEY=
QDRANT_COLLECTION=hook_vectors
QDRANT_TRANSCRIPT_COLLECTION=transcript_windows
HOOK_SIMILARITY_THRESHOLD=0.85
HOOK_MAX_CANDIDATES=50
HOOK_FINAL_COUNT=10
CLIP_PREROLL_MS=3000
CLIP_POSTROLL_MS=5000
# Hook weights are now managed via database (Settings UI)
# Environment variables serve only as fallback defaults
HOOK_WEIGHT_QUALITY=0.22
HOOK_WEIGHT_STANDALONE=0.15
HOOK_WEIGHT_CURIOSITY=0.12
HOOK_WEIGHT_EMOTIONAL=0.08
HOOK_WEIGHT_SPECIFICITY=0.08
HOOK_WEIGHT_SHAREABILITY=0.08
HOOK_WEIGHT_NOVELTY=0.04
HOOK_WEIGHT_CONTROVERSY=0.12
HOOK_WEIGHT_HEADLINE=0.11
```

**Hook Weight Configuration:**

- **Primary**: Database storage via Settings UI (`/settings` page)
- **Fallback**: Environment variables (for deployment continuity)
- **Loading**: `loadHookConfig()` tries database first, falls back to env vars
- **Access**: Read only through `EnvKey` + `loadHookConfig()` / provider factories. Do not scatter `process.env`.

---

## 7. Out of scope (all parts)

- Postgres / pgvector / Weaviate
- `hook_candidates` or `clip_suggestions` tables
- Inventing PyAI embedding/chat/KB endpoints
- Changing transcription or the parallel ANALYSIS phase
- Kubernetes, local STT/LLM, billing
