# Providers

MintReels never calls vendor SDKs from `apps/web`, `apps/api`, or `packages/domain`.

```text
Application
    ↓
Provider Interface
    ↓
PyAI Adapter (or S3 / BullMQ adapter)
```

## SpeechProvider

`packages/ai/src/speech-provider.ts`

- `transcribe(input)` → timestamped `Transcript`
- Default: PyAI (`packages/ai/src/providers/pyai/speech.ts`)

## LLMProvider

`packages/ai/src/llm-provider.ts`

- `summarize(transcript)` → `Summary`
- `generateHooks(transcript)` → `Hook[]`
- Default: PyAI (`packages/ai/src/providers/pyai/llm.ts`)

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
- Default: S3-compatible (`packages/storage/src/s3.ts`) via `@aws-sdk/client-s3`

## QueueProvider

`packages/queue/src/provider.ts`

- `enqueue(job)`
- Default: BullMQ (`packages/queue/src/bullmq.ts`)

## Configuration

```env
AI_PROVIDER=pyai
KNOWLEDGE_BASE_PROVIDER=pyai
STORAGE_PROVIDER=s3
QUEUE_PROVIDER=bullmq
```
