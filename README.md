# MintReels

Open-source video intelligence and clipping application.

## Features

- Video recordings
- Speech-to-text
- Transcripts
- Summaries
- VTT subtitles
- AI hooks
- Video clips
- Recording Knowledge Bases
- Global Knowledge Base

## Architecture

- React
- TypeScript
- PostgreSQL
- Redis
- FFmpeg
- PyAI
- PyAI Knowledge Base

```mermaid
flowchart TD
  web[Web] --> api[API]
  api --> db[(PostgreSQL metadata)]
  api --> storage[Object storage]
  api --> queue[Redis / BullMQ]
  queue --> worker[Worker]
  worker --> speech[SpeechProvider]
  worker --> llm[LLMProvider]
  worker --> kb[KnowledgeBaseProvider]
  worker --> media[FFmpeg]
  speech --> pyaiSpeech[PyAI adapter]
  llm --> pyaiLlm[PyAI adapter]
  kb --> pyaiKb[PyAI KB adapter]
```

This repository is a scaffold: package boundaries, provider interfaces, and placeholders. Recording, transcription, and clipping features are not implemented yet.

## Quick start

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm dev
```

See [docs/development.md](docs/development.md), [docs/architecture.md](docs/architecture.md), and [docs/providers.md](docs/providers.md).
