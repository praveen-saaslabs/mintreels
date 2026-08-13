# Development

## Prerequisites

- Node.js 20+
- pnpm 10+
- Docker (MySQL 8, Redis, api, worker, web)
- FFmpeg (worker host, for audio extraction)

## Install

```bash
pnpm install
cp .env.example .env
```

Fill `.env` locally. Do not commit it. Never put secrets in source files.

## Environment variables

See `.env.example`. Required later for running services:

- `DATABASE_URL` (MySQL connection string)
- `MYSQL_ROOT_PASSWORD`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE` for Docker Compose
- `REDIS_URL`
- `FILESTACK_API_KEY` (and optional `FILESTACK_APP_SECRET` if Filestack security policies are on)
- `PYAI_API_KEY` and `PYAI_BASE_URL` (default `https://api.pyai.com`) for PyAI
- `JOB_MAX_ATTEMPTS` (default 4), `JOB_RETRY_BASE_DELAY_MS` (default 5000), `JOB_STEP_STALE_TIMEOUT_MS` (default 1800000)

## Run the full stack

```bash
docker compose up --build
```

Services:

| Service | URL |
| --- | --- |
| Web | http://127.0.0.1:5173 |
| API | http://127.0.0.1:3000 |
| phpMyAdmin | http://127.0.0.1:8080 |
| MySQL | `127.0.0.1:3306` |
| Redis | `127.0.0.1:6379` |

`DATABASE_URL` inside containers points at `mysql:3306`. On the host use `127.0.0.1:3306`.

## Run packages locally (outside Docker)

```bash
pnpm --filter @mintreels/web dev
pnpm --filter @mintreels/api start
pnpm --filter @mintreels/worker start
```

API health: `GET http://127.0.0.1:3000/health`

## Notes

- IDs are auto-increment integers (not UUIDs).
- Validation/DTOs live in `@mintreels/schema` (zod).
- Long-running AI/media work belongs in the worker, not HTTP handlers.
- The worker consumes BullMQ queue `mintreels`, job name `ingest-video` (full sequential pipeline via `job_steps`).
- Poll ingest progress with `GET /api/recordings/:id/processing`. Transcription uses PyAI job polling, not webhooks.
- FFmpeg is required on the worker for audio extraction.
