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

## LLMProvider

`packages/ai/src/llm-provider.ts`

- `summarize(transcript)` → `Summary`
- `generateHooks(transcript)` → `Hook[]`
- `generateActionItems(transcript)` → timestamped action items
- Default: OpenAI-compatible (`packages/ai/src/providers/openai-compatible/llm.ts`) via `LLM_PROVIDER=openai` (or `nvidia`)
- `summarize` / `generateActionItems` call Chat Completions with `response_format` (`json_schema` strict, fallback `json_object`)
- `generateHooks` stays extractive (`packages/ai/src/extractive-hooks.ts`)
- Speech stays `AI_PROVIDER=pyai`. Do not point LLM at PyAI — `@pyai/sdk` has Recap only, no chat/summarize/action-items API

## EmbeddingProvider

`packages/ai/src/embedding-provider.ts`

- `embed(text)` → `number[]`
- Used only if a future local KB needs embeddings. The PyAI KB adapter does **not** store vectors in MySQL.

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
- Default: Filestack (`packages/storage/src/filestack.ts`). Frontend uploads and sends a CDN URL; the worker downloads that URL, stores extracted audio, and after clip upload requests a Filestack video thumbnail (`video_convert=preset:thumbnail`).

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
```

LLM adapter (`openai` | `nvidia`) reads:

| Provider | Key | Base URL | Model default |
| --- | --- | --- | --- |
| `openai` | `OPENAI_API_KEY` | optional `OPENAI_BASE_URL` | `gpt-4o-mini` (`OPENAI_MODEL`) |
| `nvidia` | `NVIDIA_API_KEY` | `https://integrate.api.nvidia.com/v1` | `meta/llama-3.1-8b-instruct` (`NVIDIA_MODEL`) |
