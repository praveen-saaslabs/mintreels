# Development

## Prerequisites

- Node.js 20+
- pnpm 10+
- Docker (MySQL 8, Redis, api, worker, web)
- FFmpeg (later, for media jobs)

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
- `S3_*` for object storage
- `PYAI_API_KEY` and `PYAI_BASE_URL` for PyAI

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
