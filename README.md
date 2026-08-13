# MintReels

Open-source video intelligence and clipping app: upload a recording, get a timestamped transcript, summary, knowledge base, AI hooks, and exported clips.

Stack: React + NestJS + TypeORM + MySQL 8 + Redis. Validation lives in `@mintreels/schema` (zod). IDs are auto-increment integers.

## Prerequisites

- Docker Desktop (or Docker Engine + Compose)
- Optional, for running outside Docker: Node.js 20+, pnpm 10+

## Start (Docker)

```bash
cp .env.example .env
docker compose up --build
```

First boot installs workspace deps inside the containers; give it a minute.

| Service | URL |
| --- | --- |
| Web | http://127.0.0.1:5173 |
| API | http://127.0.0.1:3000 |
| API health | http://127.0.0.1:3000/health |
| phpMyAdmin | http://127.0.0.1:8080 |
| MySQL | `127.0.0.1:3306` |
| Redis | `127.0.0.1:6379` |

phpMyAdmin login (dev defaults): user `mintreels`, password `mintreels`.

Stop:

```bash
docker compose down
```

Source is bind-mounted. API and worker reload with Node `--watch`. If a host edit does not reload on Docker Desktop for Mac, restart that service: `docker compose restart api`.

## Environment

Copy `.env.example` to `.env`. Do not commit `.env`. Never put real secrets in source.

Inside Docker, Compose always uses `mysql:3306` and `redis:6379` (it ignores a host `DATABASE_URL` / `REDIS_URL` so a `.env` copied from `.env.example` still works). On the host (local pnpm), keep those URLs on `127.0.0.1`.

### Required to boot the stack

| Variable | Dev default | Purpose |
| --- | --- | --- |
| `MYSQL_ROOT_PASSWORD` | `mintreels` | MySQL root password |
| `MYSQL_USER` | `mintreels` | App DB user |
| `MYSQL_PASSWORD` | `mintreels` | App DB password |
| `MYSQL_DATABASE` | `mintreels` | Database name |
| `DATABASE_URL` | `mysql://mintreels:mintreels@127.0.0.1:3306/mintreels` | TypeORM connection (host). In Compose this becomes `...@mysql:3306/...` |
| `REDIS_URL` | `redis://127.0.0.1:6379` | Queue / Redis (host). In Compose: `redis://redis:6379` |
| `PORT` | `3000` | API port (set in Compose) |

### Required later for real AI / storage / jobs

| Variable | Purpose |
| --- | --- |
| `PYAI_API_KEY` | PyAI speech / LLM / KB |
| `PYAI_BASE_URL` | PyAI API base URL |
| `S3_ENDPOINT` | Optional custom S3-compatible endpoint (R2, MinIO) |
| `S3_REGION` | Object storage region |
| `S3_BUCKET` | Bucket name |
| `S3_ACCESS_KEY_ID` | Storage access key |
| `S3_SECRET_ACCESS_KEY` | Storage secret |

### Provider switches (defaults)

```env
AI_PROVIDER=pyai
KNOWLEDGE_BASE_PROVIDER=pyai
STORAGE_PROVIDER=s3
QUEUE_PROVIDER=bullmq
```

The API boots without PyAI/S3 keys (providers are constructed lazily). Transcription, KB, and clip jobs will fail until those vars are set.

## Run locally without Docker

```bash
cp .env.example .env
# start only MySQL + Redis + phpMyAdmin
docker compose up -d mysql redis phpmyadmin
pnpm install
pnpm --filter @mintreels/api start
pnpm --filter @mintreels/worker start
pnpm --filter @mintreels/web dev
```

Keep `DATABASE_URL` and `REDIS_URL` pointed at `127.0.0.1`.

## More

- Architecture: `docs/architecture.md`
- Dev notes: `docs/development.md`
- Providers: `docs/providers.md`
- Frontend auth: `docs/auth-frontend.md`
- Frontend GET APIs: `docs/api-frontend.md`
