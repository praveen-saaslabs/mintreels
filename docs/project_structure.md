# Architecture

MintReels is a TypeScript monorepo for video intelligence: upload recordings, transcribe them, generate summaries and VTT, maintain knowledge bases, suggest hooks, and export clips.

## Monorepo

| Path | Package | Role |
| --- | --- | --- |
| `apps/web` | `@mintreels/web` | React UI |
| `apps/api` | `@mintreels/api` | HTTP API |
| `apps/worker` | `@mintreels/worker` | Background jobs |
| `packages/domain` | `@mintreels/domain` | Domain types and rules |
| `packages/schema` | `@mintreels/schema` | Zod schemas (validation + DTO source of truth) |
| `packages/db` | `@mintreels/db` | MySQL 8 metadata (TypeORM) |
| `packages/ai` | `@mintreels/ai` | Speech, LLM, embeddings |
| `packages/knowledge` | `@mintreels/knowledge` | Knowledge Base provider |
| `packages/media` | `@mintreels/media` | FFmpeg-based media ops |
| `packages/storage` | `@mintreels/storage` | Object storage |
| `packages/queue` | `@mintreels/queue` | Job queue |

Applications depend on provider **interfaces**, not vendor SDKs. PyAI-specific code lives only in:

- `packages/ai/src/providers/pyai`
- `packages/knowledge/src/adapters/pyai`

## API

The API is a NestJS app (`apps/api`). Feature modules use controller + service + optional zod DTO (`ZodValidationPipe` + `@mintreels/schema`). HTTP handlers enqueue work; they do not run transcription, summarization, KB sync, hook generation, or clip rendering inline.

Placeholder routes:

- `POST/GET /api/recordings`
- `GET/DELETE /api/recordings/:id` (soft-delete cascades children; Filestack kept until purge)
- `GET /api/recordings/:id/transcript`
- `GET /api/recordings/:id/transcript.vtt`
- `GET /api/recordings/:id/summary`
- `POST /api/recordings/:id/add-to-global-kb`
- `GET /api/recordings/:id/hooks`
- `POST /api/recordings/:id/hooks/generate`
- `POST /api/recordings/:id/hooks/:hookId/export`
- `POST /api/recordings/:id/moments/search`
- `POST /api/recordings/:id/moments/ask`
- `GET/POST /api/knowledge-bases`
- `POST /api/clips`
- `GET /api/clips`
- `GET /api/clips/filters`
- `GET /api/clips/:id`
- `DELETE /api/clips/:id`
- `GET /api/projects`
- `GET /api/projects/sidebar`
- `DELETE /api/projects/:id`
- `GET /api/workspace/user`
- `GET /api/workspace/stats`
- `GET /api/settings`

## Worker

Jobs in `apps/worker/src/jobs`:

- `ingest-video`
- `transcribe`
- `summarize`
- `generate-hooks`
- `sync-knowledge-base`
- `render-clip`

Each job is `queued`, `running`, then `success` or `failed`, with bounded retries.

## AI providers

`SpeechProvider`, `LLMProvider`, `EmbeddingProvider`, and `VectorStoreProvider` are defined in `@mintreels/ai`. PyAI is the default speech implementation (`AI_PROVIDER=pyai`). Embeddings and the vector store are OpenAI-compatible + Qdrant (see `docs/ai-video-analysis-architecture.md`).

## Knowledge Base adapter

`KnowledgeBaseProvider` is the only KB API the app uses. MySQL stores `provider` and `provider_knowledge_base_id` (and document provider IDs). Embeddings stay in the provider. A local/pgvector adapter is intentionally not implemented.

Scopes:

- **Recording KB** — one knowledge base per recording
- **Global KB** — project-wide; `add-to-global-kb` adds a recording document through the provider

## Storage

`StorageProvider` is Filestack. The frontend uploads and sends a CDN URL; MySQL stores the URL/handle, not file bytes.

## Queue

`QueueProvider.enqueue` is implemented with Redis + BullMQ.

## Media pipeline

```text
Video Upload → Object Storage → Recording
  → INGEST_VIDEO → Extract Audio
  → SpeechProvider → Timestamped Transcript
  → VTT + Summary → Recording KB → Hooks → Ready
```

Ingest also generates a recording poster (`recordings.thumbnail_storage_key` → public `thumbnailUrl` on recording/processing/project GETs). Clip pipeline (MVP): selected hook → `POST .../hooks/:hookId/export` → `render-clip` → FFmpeg trim + encode → Filestack video + thumbnail → `clips.storageKey` / `clips.thumbnail_storage_key` (public `videoUrl` / `thumbnailUrl`). Crop, subtitles, and signed download are not implemented yet.
