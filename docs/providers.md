# Providers

MintReels never calls vendor SDKs from `apps/web`, `apps/api`, or `packages/domain`.

```text
Application
    ↓
Provider Interface
    ↓
PyAI Adapter (or Filestack / BullMQ adapter)
```

## SpeechProvider

`packages/ai/src/speech-provider.ts`

- `submitTranscription(input)` → `TranscriptionSubmission` (`providerJobId` + status)
- `getTranscriptionStatus(providerJobId)` / `getTranscriptionResult(providerJobId)` — **poll** PyAI `GET /v1/transcription/jobs/{id}` (no webhooks)
- `transcribe(input)` — convenience: submit + poll + map to timestamped `Transcript`
- Default: PyAI (`packages/ai/src/providers/pyai/speech.ts`) via `@pyai/sdk` **only inside that adapter**
- Jobs are submitted as multipart `audio` (OpenAPI) so PyAI does not need a public `audio_url`. Status/result still use the SDK. Webhooks are not required.

## VoiceProvider

`packages/ai/src/voice-provider.ts`

- `listVoices()` → stock voice catalog (`GET /v1/voices`)
- `synthesize({ text, voiceId?, format? })` → audio bytes (`POST /v1/audio/speech`, model `pyai-speak`, `stream: false`)
- Default: PyAI (`packages/ai/src/providers/pyai/voice.ts`) via HTTP fetch inside the adapter (not from apps/web)
- API proxy: `GET /api/voices` (auth cookie). Browser never receives `PYAI_API_KEY`.
- Used by: clip title/CTA voiceover on `render-clip`, and transcript overdub (`apply-overdub`)
- Key scope required: `voice:synthesize`. Voice cloning (`/v1/voice/clones`) is out of MVP.

## LLMProvider

`packages/ai/src/llm-provider.ts`

- `summarize(transcript)` → `Summary`
- `generateHooks(transcript, options)` → `HookCandidate[]` (`options` carries `loadHookConfig()` weights + `maxCandidates`)
- `generateActionItems(transcript)` → timestamped action items
- `askTranscript(transcript, question)` → `{ intent, text, clipQuery }` (`question` | `clip` | `other`)
- `generateSocialCopy(context)` → `{ title, description }` for clip share copy (`social-copy-v1` prompt; heuristic fallback)
- Default: OpenAI-compatible (`packages/ai/src/providers/openai-compatible/llm.ts`) via `LLM_PROVIDER=openai` (or `nvidia`)
- `summarize` / `generateActionItems` / `generateSocialCopy` call Chat Completions with `response_format` (`json_schema` strict, fallback `json_object`)
- `generateHooks` sends deterministic semantic windows (`packages/ai/src/semantic-windows.ts`) with the `hooks-v2` prompt, and returns segment IDs — never timestamps. `packages/ai/src/hook-candidates.ts` resolves segment IDs to milliseconds, divides the 0–10 dimension scores by 10, and applies the configured weights
- `packages/ai/src/extractive-hooks.ts` is the fallback when the LLM call fails or yields nothing usable
- Speech stays `AI_PROVIDER=pyai`. Do not point LLM at PyAI — `@pyai/sdk` has Recap only, no chat/summarize/action-items API

## EmbeddingProvider

`packages/ai/src/embedding-provider.ts`

- `embed(texts)` → `number[][]` (batched)
- `provider` / `model` / `dimensions` metadata for versioning
- Default (Part 3): OpenAI-compatible (`EMBEDDING_PROVIDER`, `EMBEDDING_MODEL`)
- PyAI has no confirmed embedding endpoint — do not invent one
- The PyAI KB adapter does **not** store vectors in MySQL

## VectorStoreProvider

`packages/ai/src/vector-store-provider.ts`

- `upsert` / `search` / `delete` / `deleteByRecordingId` / `healthCheck`
- Search is recording-scoped (`recordingId` required)
- Default: self-hosted Qdrant service (`VECTOR_STORE_PROVIDER=qdrant`, `QDRANT_URL`, optional `QDRANT_API_KEY`, `QDRANT_COLLECTION=hook_vectors`, `QDRANT_TRANSCRIPT_COLLECTION=transcript_windows`)
- Two derived indexes — hook clustering and transcript windows; MySQL remains canonical and rebuildable
- Do not import Qdrant types outside `packages/ai/src/providers/qdrant/`

## KnowledgeBaseProvider

`packages/knowledge/src/provider.ts`

- create / get / delete knowledge bases
- add / remove documents
- search
- Default: PyAI (`packages/knowledge/src/adapters/pyai`)
- Mapper keeps PyAI request/response shapes inside the adapter

## StorageProvider

`packages/storage/src/provider.ts`

- `upload` / `download` / `getSignedUrl` / `delete` / `createVideoThumbnail`
- Default: Filestack (`packages/storage/src/filestack.ts`). Frontend uploads and sends a CDN URL; the worker downloads that URL, stores extracted audio, and requests a Filestack video thumbnail (`video_convert=preset:thumbnail`, midpoint `thumbnail_offset`) for ingest recordings and after clip upload.

## QueueProvider

`packages/queue/src/provider.ts`

- `enqueue(job)`
- Default: BullMQ (`packages/queue/src/bullmq.ts`)

## Configuration

```env
AI_PROVIDER=pyai
LLM_PROVIDER=openai
KNOWLEDGE_BASE_PROVIDER=pyai
STORAGE_PROVIDER=filestack
QUEUE_PROVIDER=bullmq
EMBEDDING_PROVIDER=openai
VECTOR_STORE_PROVIDER=qdrant
# PYAI_API_KEY must include Hear scopes + voice:synthesize for Speak (clip VO / overdub)
```

LLM adapter (`openai` | `nvidia`) reads:

| Provider | Key | Base URL | Model default |
| --- | --- | --- | --- |
| `openai` | `OPENAI_API_KEY` | optional `OPENAI_BASE_URL` | `gpt-4o-mini` (`OPENAI_MODEL`) |
| `nvidia` | `NVIDIA_API_KEY` | `https://integrate.api.nvidia.com/v1` | `meta/llama-3.1-8b-instruct` (`NVIDIA_MODEL`) |
