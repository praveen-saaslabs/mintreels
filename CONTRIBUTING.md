# Contributing to MintReels

Thanks for taking the time to contribute. Small, focused changes that match [docs/architecture.md](docs/architecture.md) land fastest.

By participating, you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

## Prerequisites

- Node.js 20+
- pnpm 10+ (`packageManager` in the root `package.json`)
- Docker (MySQL 8, Redis, Qdrant — or the full stack)
- FFmpeg on the host if you run the worker outside Docker

## Setup

```bash
git clone https://github.com/praveen-saaslabs/mintreels.git
cd mintreels
cp .env.example .env
pnpm install
```

Fill `.env` locally. Do not commit it. Never put secrets in source files.

Quickest path: `docker compose up --build` then open [http://127.0.0.1:5173](http://127.0.0.1:5173). Host-mode and seed notes: [README.md](README.md) and [docs/development.md](docs/development.md).

## Checks before you open a PR

```bash
pnpm lint
pnpm typecheck
```

Keep PRs small. Prefer one concern per PR (bug fix, docs, or a single feature slice).

## Architecture constraints

MintReels owns product logic. Vendors provide capabilities through adapters:

```text
MintReels Domain → Capability Interface → Provider/Adapter → Vendor
```

- `apps/web`, `apps/api`, and `packages/domain` must not import PyAI, AWS SDKs, BullMQ, or FFmpeg.
- Wire concrete implementations only at composition roots: `apps/api/src/providers/` and `apps/worker/src/providers.ts`.
- MySQL stores metadata only — not embeddings, vector chunks, or video binaries.
- Long-running work belongs in the worker, with visible job state and bounded retries.

**Ask before** changing storage, queue, AI, or knowledge-base strategy. If a major decision changes, update [docs/architecture.md](docs/architecture.md) in the same PR.

## Pull requests

1. Fork and branch from `main`.
2. Match existing TypeScript style (strict types, small composable services).
3. Run `pnpm lint` and `pnpm typecheck`.
4. Describe *why* the change exists. Link an issue when there is one.

Questions about direction belong in an issue, not a surprise architecture PR.
