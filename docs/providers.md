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
- Default: PyAI (`packages/ai/src/providers/pyai/llm.ts`) — extractive MVP until Recap/chat is available

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

- `upload` / `download` / `getSignedUrl` / `delete`
- Default: Filestack (`packages/storage/src/filestack.ts`). Frontend uploads and sends a CDN URL; the worker downloads that URL and stores extracted audio.

## QueueProvider

`packages/queue/src/provider.ts`

- `enqueue(job)`
- Default: BullMQ (`packages/queue/src/bullmq.ts`)

## Configuration

```env
AI_PROVIDER=pyai
KNOWLEDGE_BASE_PROVIDER=pyai
STORAGE_PROVIDER=filestack
QUEUE_PROVIDER=bullmq
```
