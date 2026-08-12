# Development

## Prerequisites

- Node.js 20+
- pnpm 10+
- Docker (PostgreSQL and Redis)
- FFmpeg (later, for media jobs)

## Install

```bash
pnpm install
cp .env.example .env
```

Fill `.env` locally. Do not commit it. Never put secrets in source files.

## Environment variables

See `.env.example`. Required later for running services:

- `DATABASE_URL`
- `REDIS_URL`
- `S3_*` for object storage
- `PYAI_API_KEY` and `PYAI_BASE_URL` for PyAI
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` for Docker Compose

## Run database

```bash
docker compose up -d postgres
```

`DATABASE_URL` should point at `127.0.0.1:5432`.

## Run Redis

```bash
docker compose up -d redis
```

`REDIS_URL` should point at `127.0.0.1:6379`.

## Start web

```bash
pnpm --filter @mintreels/web dev
```

Vite serves the UI on port 5173 and proxies `/api` to the API.

## Start API

```bash
pnpm --filter @mintreels/api dev
```

API listens on port 3000.

## Start worker

```bash
pnpm --filter @mintreels/worker dev
```

Or start everything:

```bash
pnpm dev
```

## Typecheck

```bash
pnpm typecheck
```
