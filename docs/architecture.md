# MintReels — Project Infrastructure & Architecture Record

> This document captures the architecture decisions and project direction established in the MintReels project discussion. It is intended to be checked into the repository and used as persistent context for Cursor/AI coding agents.
>
> **Primary goal:** Build an open-source Descript-like application using PyAI as the default AI and Knowledge Base infrastructure, while keeping application capabilities behind adapter/provider interfaces.

---

# 1. Project Overview

## Product

**MintReels** is an open-source Descript-like video intelligence and clipping application.

The MVP is centered around uploaded video recordings and should provide:

1. List of video recordings
2. Speech-to-text for each recording
3. Timestamped transcript
4. Speaker identification/diarization where available
5. Summary
6. VTT subtitle output
7. Recording-level Knowledge Base
8. Ability to add a recording to a Global Knowledge Base
9. AI-suggested hooks from recordings
10. Video clipping based on selected AI hooks
11. Subtitle-burned clip exports

The central product idea is:

```text
Video
  ↓
Transcript
  ├── Summary
  ├── VTT
  ├── Knowledge Base
  ├── Search
  ├── AI Hooks
  └── Video Clips
```

The timestamped transcript is the **central data model / spine of the product**.

---

# 2. Strategic Direction

The project is intended to be an open-source alternative to products such as Descript and podcast/video clipping tools.

The hackathon context describes the broader strategy as building open-source products on top of a shared PyAI API and emphasizes:

- open-source credibility
- fast setup
- PyAI usage
- reusable AI loops
- capability registries
- clear job exits
- blocking gates
- bounded retries
- failure records
- safe parallelism
- budgets

The relevant product direction includes a "Podcast Clip Factory / Descript-lite" concept:

> Upload an episode, get hooks, titles and clip timestamps.

MintReels should therefore be optimized for a compelling workflow:

```text
Upload video
    ↓
Transcript + summary
    ↓
Knowledge Base
    ↓
AI suggested hooks
    ↓
Select hook
    ↓
Render clip
    ↓
MP4 + subtitles
```

---

# 3. Technology Direction

## Frontend

- React
- React Router
- ShadCN UI
- TypeScript

## Backend

- TypeScript
- NestJS HTTP API
- MySQL 8 + TypeORM
- Zod validation (`@mintreels/schema`)
- Redis
- Background workers

## AI

- PyAI as the default provider
- Provider/adapter interfaces around AI capabilities

## Knowledge Base

- PyAI Knowledge Base as the default and primary implementation
- `KnowledgeBaseProvider` abstraction
- No local/vector DB implementation required for MVP

## Media

- FFmpeg

## Storage

- Filestack

## Queue

- Redis + BullMQ

## Monorepo

- pnpm
- Turborepo

---

# 4. High-Level Architecture

```text
                           ┌──────────────────────┐
                           │      React App       │
                           │ Router + ShadCN      │
                           └──────────┬───────────┘
                                      │
                                      ▼
                           ┌──────────────────────┐
                           │      API Server      │
                           │                      │
                           │ Recordings           │
                           │ Transcripts          │
                           │ Summaries             │
                           │ Knowledge             │
                           │ Hooks                 │
                           │ Clips                 │
                           └──────┬───────┬───────┘
                                  │       │
                    ┌─────────────┘       └─────────────┐
                    ▼                                   ▼
             ┌────────────┐                     ┌──────────────┐
             │ MySQL 8    │                     │ Object Store │
             │            │                     │              │
             │ metadata   │                     │ videos       │
             │ jobs       │                     │ audio        │
             │ mappings   │                     │ exports      │
             └────────────┘                     └──────────────┘
                    │
                    ▼
             ┌────────────┐
             │ Job Queue  │
             │ Redis      │
             └──────┬─────┘
                    │
                    ▼
             ┌──────────────┐
             │   Workers    │
             │              │
             │ FFmpeg       │
             │ PyAI Hear    │
             │ Summarizer   │
             │ Hook finder  │
             │ KB sync      │
             │ Clip render  │
             └───────┬──────┘
                     │
          ┌──────────┴───────────┐
          ▼                      ▼
   ┌─────────────┐       ┌─────────────────────┐
   │    PyAI     │       │ KnowledgeBaseAdapter│
   │             │       │                     │
   │ Hear        │       │       PyAI KB       │
   │ LLM         │       │                     │
   └─────────────┘       └─────────────────────┘
```

---

# 5. Architectural Principle: Provider/Adapter Boundaries

The application should own product/domain logic.

PyAI should provide capabilities.

Do **not** scatter PyAI-specific calls throughout the application.

Use:

```text
MintReels Domain
       ↓
Capability Interface
       ↓
Provider / Adapter
       ↓
PyAI
```

Examples:

```text
SpeechProvider
LLMProvider
EmbeddingProvider
KnowledgeBaseProvider
StorageProvider
QueueProvider
```

The first implementation is PyAI.

Future providers can be added without rewriting product logic.

---

# 6. PyAI Dependency Strategy

MintReels is intentionally dependent on PyAI for its default AI and Knowledge Base infrastructure.

This is different from making PyAI an implementation detail that can be removed immediately.

The intended architecture is:

```text
MintReels
    │
    ├── AI capability
    │      └── PyAI provider
    │
    └── Knowledge capability
           └── PyAI KB adapter
```

PyAI is the **default and primary infrastructure**, but the application code communicates through interfaces.

Environment configuration:

```env
AI_PROVIDER=pyai
KNOWLEDGE_BASE_PROVIDER=pyai
```

---

# 7. Knowledge Base Architecture

## Decision

The app should use **PyAI's hosted Knowledge Base as the primary Knowledge Base implementation**.

Do not build a local Postgres/pgvector Knowledge Base for MVP.

The application should maintain only metadata and provider IDs in MySQL.

It should not own:

- embeddings
- vector storage
- PyAI KB chunks
- PyAI KB retrieval internals

---

# 8. Knowledge Base Adapter

Create:

```text
packages/knowledge/
└── src/
    ├── provider.ts
    ├── types.ts
    ├── errors.ts
    └── adapters/
        └── pyai/
            ├── client.ts
            ├── knowledge-base.ts
            └── mapper.ts
```

The application uses:

```ts
KnowledgeBaseProvider
```

The PyAI implementation lives only under:

```text
adapters/pyai/
```

---

# 9. KnowledgeBaseProvider Interface

Initial interface:

```ts
export interface KnowledgeBaseProvider {
  createKnowledgeBase(
    input: CreateKnowledgeBaseInput
  ): Promise<KnowledgeBase>;

  getKnowledgeBase(
    id: string
  ): Promise<KnowledgeBase>;

  deleteKnowledgeBase(
    id: string
  ): Promise<void>;

  addDocument(
    input: AddDocumentInput
  ): Promise<KnowledgeDocument>;

  removeDocument(
    input: RemoveDocumentInput
  ): Promise<void>;

  search(
    input: KnowledgeSearchInput
  ): Promise<KnowledgeSearchResult[]>;
}
```

The interface must describe MintReels's needs rather than mirror PyAI's raw API.

PyAI-specific request/response types belong inside the adapter.

---

# 10. Recording Knowledge Bases

Each recording can have a dedicated Knowledge Base.

Conceptually:

```text
Recording A
    ↓
PyAI KB A

Recording B
    ↓
PyAI KB B

Recording C
    ↓
PyAI KB C
```

After transcription:

```text
Video
  ↓
Transcript
  ↓
Create Recording KB
  ↓
Add transcript as a source/document
```

The Recording KB should be used for questions and retrieval constrained to that recording.

---

# 11. Global Knowledge Base

The project also has one Global Knowledge Base.

Conceptually:

```text
                    Global KB
                   PyAI KB XYZ
                       ▲
                       │
             ┌─────────┼─────────┐
             │         │         │
          Rec A      Rec B     Rec C
```

When the user chooses:

```text
Add to Global Knowledge Base
```

the backend uses `KnowledgeBaseProvider` to add the recording's source/document to the Global PyAI KB.

Do not copy embeddings into MySQL.

---

# 12. Knowledge Base Database Metadata

MySQL should contain:

```text
knowledge_bases
-------------------------
id
project_id
name
scope
provider
provider_knowledge_base_id
created_at
updated_at
deleted_at
```

Where:

```text
scope:
  recording
  global
```

Example:

```text
id                           kb_rec_123
scope                        recording
recording_id                 rec_456
provider                     pyai
provider_knowledge_base_id  kb_abc123
```

Global example:

```text
id                           kb_global
scope                        global
provider                     pyai
provider_knowledge_base_id  kb_xyz789
```

For documents:

```text
knowledge_documents
-------------------------
id
knowledge_base_id
provider_document_id
recording_id
source_type
title
created_at
deleted_at
```

This gives MintReels its own stable application-level identity while PyAI owns the actual Knowledge Base contents.

---

# 13. Knowledge Search Flow

```text
User:
"What did we say about pricing?"
            │
            ▼
     MintReels API
            │
            ▼
 KnowledgeBaseProvider.search()
            │
            ▼
         PyAI KB
            │
            ▼
    Relevant passages
            │
            ▼
           LLM
            │
            ▼
     Answer + sources
```

The UI should not know that the retrieval is performed by PyAI.

---

# 14. AI Provider Architecture

Create:

```text
packages/ai/
└── src/
    ├── speech-provider.ts
    ├── llm-provider.ts
    ├── embedding-provider.ts
    ├── vector-store-provider.ts
    └── providers/
        ├── pyai/
        │   ├── client.ts
        │   ├── speech.ts
        │   └── llm.ts
        ├── openai-compatible/
        └── qdrant/           # vector store adapter
```

## SpeechProvider

```ts
export interface SpeechProvider {
  transcribe(
    input: TranscriptionInput
  ): Promise<Transcript>;
}
```

```ts
export interface VoiceProvider {
  listVoices(): Promise<Voice[]>;
  synthesize(input: {
    text: string;
    voiceId?: string;
    format?: 'mp3' | 'wav' | …;
  }): Promise<{ audio: Buffer; contentType: string }>;
}
```

PyAI Speak (`GET /v1/voices`, `POST /v1/audio/speech`) powers clip title/CTA voiceover and transcript overdub. Hear (`SpeechProvider`) remains STT only — do not overload it. Cloning is out of MVP.

## LLMProvider

```ts
export interface LLMProvider {
  summarize(
    transcript: Transcript
  ): Promise<Summary>;

  generateHooks(
    transcript: Transcript,
    options: HookGenerationOptions
  ): Promise<HookCandidate[]>;
}
```

`HookGenerationOptions` carries the `loadHookConfig()` weights and candidate cap. `HookCandidate` is a `Hook` plus segment IDs, `hookType`, context text, and 0..1 dimension scores. See `docs/ai-video-analysis-architecture.md`.

## EmbeddingProvider

```ts
export interface EmbeddingProvider {
  readonly provider: string;
  readonly model: string;
  readonly dimensions: number;
  embed(texts: string[]): Promise<number[][]>;
}
```

Batch embeddings. Do not assume PyAI has an embedding endpoint — production uses the OpenAI-compatible provider (`EMBEDDING_PROVIDER`, `EMBEDDING_MODEL`). See `docs/ai-video-analysis-architecture.md`.

## VectorStoreProvider

```ts
export interface VectorStoreProvider {
  upsert(items: VectorItem[]): Promise<void>;
  search(vector: number[], options: VectorSearchOptions): Promise<VectorSearchResult[]>;
  delete(ids: string[]): Promise<void>;
  deleteByRecordingId(recordingId: number): Promise<void>;
  healthCheck(): Promise<void>;
}
```

Two rebuildable Qdrant collections behind `VectorStoreProvider` (MySQL stays canonical):

- `QDRANT_COLLECTION=hook_vectors` — hook clustering / dedup (worker ingest + regenerate-hooks).
- `QDRANT_TRANSCRIPT_COLLECTION=transcript_windows` — semantic transcript windows for prompt search.

Search always filters by `recordingId`. Apps depend on `EmbeddingProvider` / `VectorStoreProvider` only; wire Qdrant/OpenAI at composition roots. The API may `embed` + `search` for interactive moment lookup (`POST /api/recordings/:id/moments/search`) and `LLMProvider.askTranscript` for `POST /api/recordings/:id/moments/ask`. Domain services never import Qdrant.

---

# 15. Recording Data Model

Core database/domain entities:

```text
users
projects
recordings
transcripts
transcript_segments
summaries
knowledge_bases
knowledge_documents
hooks
clips
jobs
job_steps
job_audit_logs
```

Every table has nullable `deleted_at`. `NULL` = active; set = soft-deleted and excluded from lists/gets. Filestack and PyAI KB objects stay until a later purge.

---

# 16. Recording Model

Conceptually:

```text
recordings
-----------
id
project_id
title
original_filename
storage_key
audio_storage_key
thumbnail_storage_key
duration_ms
width
height
status
created_at
updated_at
deleted_at
```

Recording status:

```text
uploaded
processing
ready
failed
```

Public GETs expose `videoUrl` / `audioUrl` / `thumbnailUrl` (HTTPS Filestack CDN). Never return `storageKey` or `thumbnail_storage_key`. Thumbnail generation is best-effort during ingest.

---

# 17. Transcript Model

The canonical transcript should be stored as timestamped segments.

Do not use one giant transcript string as the primary representation.

```ts
export interface TranscriptSegment {
  id: string;
  sequence: number;
  startMs: number;
  endMs: number;
  speaker?: string;
  text: string;
}
```

Database concept:

```text
transcript_segments
-------------------
id
recording_id
sequence
start_ms
end_ms
speaker
text
```

Example:

```json
{
  "start_ms": 12450,
  "end_ms": 18320,
  "speaker": "speaker_1",
  "text": "The biggest mistake founders make is..."
}
```

---

# 18. VTT Architecture

VTT is an export artifact.

The canonical representation remains timestamped transcript segments.

Flow:

```text
TranscriptSegment[]
        ↓
VTT generator
        ↓
recording.vtt
```

This makes the transcript reusable for:

- transcript UI
- editor player caption overlay (JSON segments/words; karaoke highlight)
- search
- summary
- hooks
- clipping
- subtitle export

`GET /api/recordings/:id/transcript.vtt` remains export-only. The editor does not load VTT into `<track>`.

---

# 19. Video Processing Pipeline

The primary recording pipeline:

```text
Upload Video
    ↓
Object Storage
    ↓
Create Recording DB row
    ↓
Queue transcription job
    ↓
Extract audio using FFmpeg
    ↓
PyAI Speech Provider
    ↓
Timestamped Transcript
    ├───────────────┐
    ↓               ↓
Generate VTT     Generate Summary
    ↓               ↓
    └───────┬───────┘
            ↓
     Create Recording KB
            ↓
      Generate Hooks
            ↓
          Ready
```

Long-running operations must be background jobs.

Do not hold HTTP requests open for transcription or video rendering.

---

# 20. PyAI Speech-to-Text

The application should use the PyAI speech capability for transcription.

For batch/video processing, use an asynchronous transcription job model rather than keeping an HTTP request open.

Expected transcription output should be normalized into MintReels's transcript model.

If the provider supports:

- timestamps
- speaker diarization
- VTT

use those capabilities.

The application should not depend directly on PyAI response formats outside the PyAI adapter/provider implementation.

---

# 21. Summary Generation

After transcription:

```text
Transcript
    ↓
LLM
    ├── Summary
    ├── Key points
    ├── Topics
    ├── Action items
    └── Important quotes
```

Important quotes and claims should ideally carry transcript timestamps.

Example:

```json
{
  "quote": "The biggest mistake founders make...",
  "start_ms": 12450,
  "end_ms": 18320
}
```

This allows downstream features to remain grounded in the original video.

---

# 22. Hook Generation

Hook generation is a major product feature.

Do not ask the LLM to blindly return arbitrary clips.

Instead:

## Step 1 — Generate candidate transcript windows

Candidate windows can be based on:

- strong statements
- surprising claims
- questions
- punchlines
- emotional moments
- stories
- contrarian opinions
- useful advice
- high information density

Candidate durations can include:

```text
15 sec
30 sec
45 sec
60 sec
90 sec
```

## Step 2 — Score candidates

Example:

```json
{
  "start_ms": 12450,
  "end_ms": 42100,
  "hook": "The biggest mistake founders make...",
  "score": 0.91,
  "reason": "Strong opening and actionable insight",
  "title": "The Biggest Mistake Founders Make"
}
```

Potential score dimensions:

```text
Hook strength
Standalone context
Emotional interest
Information density
Shareability
```

The UI should show suggested hooks and allow the user to preview or create a clip.

Pipeline evolution (LLM discovery, embeddings, dedup, clip boundaries) is tracked in `docs/ai-video-analysis-architecture.md`. `score` stays 0..1. LLM returns transcript segment IDs; the backend derives millisecond timestamps.

---

# 23. Clip Architecture

When the user selects a hook (Cut clip):

```text
POST /api/recordings/:id/hooks/:hookId/export
```

The API looks up the recording video (`storageKey`) and the hook `startMs` / `endMs`, inserts a `clips` row (`queued`, `recordingId`, `hookId`, `aspectRatio` default `9:16`, `fitMode` default `fit`, `burnSubtitles` default `true`), and enqueues `render-clip` with those fields. The worker downloads the source, then FFmpeg trims + aspect framing: **Fit** (default) scales to fit and pads with a blurred copy of the same frame (layout-agnostic — preserves the full source); **Fill** center-crops then scales (opt-in). Optionally burns overlapping transcript segments as ASS. It uploads the MP4 to Filestack, then asks Filestack for a video thumbnail (`video_convert=preset:thumbnail` at the clip midpoint, FFmpeg frame upload as fallback). It stores `clip.storageKey` + `clip.thumbnailStorageKey` and sets `status: ready` (or `failed`). The UI polls `GET /api/clips/:id` and, when ready, downloads via public `videoUrl` and shows `thumbnailUrl` (HTTPS Filestack CDN).

---

Optional `voiceover` on the export/create body stores title/CTA + stock `voiceId`; after aspect/trim/burn, the worker synthesizes via `VoiceProvider` (PyAI Speak) and FFmpeg-mixes onto the clip (`pre` before or `post` after).

Transcript overdub: `PATCH /api/recordings/:id/transcript/segments/:segmentId` updates text; `POST …/overdub` with `{ voiceId }` enqueues `apply-overdub`, which synthesizes the line and replaces that audio range on the **source recording** (video timing fixed). Serialize per recording (`OVERDUB_IN_PROGRESS` if one is already queued/running). Recording-level voiceover: `POST /api/recordings/:id/voiceover` enqueues `apply-recording-voiceover`.

# 23b. Full recording export

When the user exports the whole recording from the editor:

```text
POST /api/recordings/:id/export
```

Optional body matches clip export (`aspectRatio` default `9:16`, `fitMode` default `fit`, `burnSubtitles` default `true`, optional `force`). The API snapshots current `export_*` into job metadata (`previousExport`), then stores options on the `recordings` row (`exportStatus: queued`, …), inserts a `jobs` row (`EXPORT_RECORDING`), and enqueues `export-recording`. The worker downloads the source, resolves duration (`durationMs` or ffprobe), optionally builds ASS for the full timeline, then calls the same `renderClipVideo` path (`startMs: 0` … `endMs`). It uploads the MP4 + thumbnail to Filestack and sets `exportStorageKey` / `exportThumbnailStorageKey` / `exportStatus: ready`. Only the latest `EXPORT_RECORDING` job id may write `export_*` (superseded or user-cancelled workers no-op success). `POST /api/recordings/:id/export/cancel` removes the BullMQ job when possible, marks the job `EXPORT_CANCELLED`, and restores `export_*` from `previousExport`. Public GETs expose `exportVideoUrl` / `exportThumbnailUrl` only — never storage keys. Soft-delete mid-job → no-op success; Filestack objects stay until a later purge. Re-export with different options or `force: true` overwrites the latest export columns.

---

Prompt ask (`POST /api/recordings/:id/moments/ask`) routes to transcript Q&A, clip candidates, or a funny off-topic reject. Direct search remains `POST /api/recordings/:id/moments/search`. **Cut clip** uses `POST /api/clips` with the padded `clipStartMs` / `clipEndMs` (`hookId` null). Signed `GET /api/clips/:id/download` remains unimplemented (501).

MVP render is **trim + aspect framing (fit/fill) + optional ASS caption burn-in + optional Speak voiceover mix + encode + upload + thumbnail**. Sidecar VTT download remains unimplemented.

Example conceptual input (legacy / generic create — not the product path yet):

```json
{
  "recording_id": "rec_123",
  "start_ms": 12400,
  "end_ms": 42100,
  "subtitle_style": "word_highlight"
}
```

The clip becomes a background job.

Pipeline:

```text
Selected Hook
      ↓
Clip Job
      ↓
FFmpeg
      ├── trim
      ├── crop/resize
      ├── subtitle generation
      ├── subtitle burn-in
      └── encode
      ↓
clip.mp4
clip.vtt
thumbnail.jpg
```

---

# 24. FFmpeg

FFmpeg owns media processing.

It should eventually support:

- trim
- crop
- resize
- audio normalization
- subtitle overlay
- thumbnail generation
- final encoding

Potential export formats:

```text
16:9
9:16
1:1
```

Do not implement a complete nonlinear video editor for MVP.

---

# 25. Subtitle Data

Subtitles should remain structured before rendering.

Example:

```json
[
  {
    "start": 12.4,
    "end": 14.1,
    "text": "The biggest mistake"
  },
  {
    "start": 14.1,
    "end": 15.8,
    "text": "founders make is..."
  }
]
```

The same data can be used to:

- create VTT
- display transcript
- synchronize video playback
- burn subtitles
- support word highlighting later

---

# 26. Frontend Architecture

Recommended application structure:

```text
apps/web/
└── app/
    ├── routes/
    │   ├── _index.tsx
    │   ├── recordings.tsx
    │   ├── recordings.$id.tsx
    │   ├── knowledge.tsx
    │   └── clips.tsx
    │
    ├── components/
    │   ├── recordings/
    │   ├── transcript/
    │   ├── video/
    │   ├── hooks/
    │   ├── knowledge/
    │   └── ui/
    │
    └── lib/
        ├── api.ts
        └── utils.ts
```

---

# 27. Recording Detail Page

The main recording page should eventually contain:

```text
┌─────────────────────────────────────────────────────────────┐
│ ← Recordings       My Podcast Episode 12       [Export]      │
├──────────────────────────────┬──────────────────────────────┤
│                              │                              │
│                              │ Transcript                   │
│          VIDEO               │                              │
│                              │ 00:12                        │
│             ▶                │ The biggest mistake founders │
│                              │ make is...                   │
│                              │                              │
├──────────────────────────────┴──────────────────────────────┤
│ Summary                                                     │
│ The recording discusses...                                  │
├─────────────────────────────────────────────────────────────┤
│ AI HOOKS                                                    │
│                                                             │
│ The biggest mistake... [91] [Create clip]                  │
│ Nobody tells you...     [88] [Create clip]                 │
├─────────────────────────────────────────────────────────────┤
│ Knowledge Base                                              │
│                                                             │
│ [Recording KB] [Add to Global KB]                           │
└─────────────────────────────────────────────────────────────┘
```

---

# 28. API Surface

Initial API:

## Recordings

```http
POST   /api/recordings
GET    /api/recordings
GET    /api/recordings/:id
GET    /api/recordings/:id/processing
POST   /api/recordings/:id/retry
DELETE /api/recordings/:id
```

`DELETE /api/recordings/:id` is tenant-scoped (**204**). It soft-deletes (sets `deleted_at`) jobs/steps/audit, clips, hooks, transcript, summary, recording-scoped KB rows, and the recording. Filestack media is kept for a later purge. Missing/not owned/already deleted → **404**.

## Transcript

```http
GET /api/recordings/:id/transcript
GET /api/recordings/:id/transcript.vtt
```

## Summary

```http
GET  /api/recordings/:id/summary
POST /api/recordings/:id/summary
```

## Knowledge

```http
GET  /api/knowledge-bases
POST /api/knowledge-bases

POST /api/recordings/:id/add-to-global-kb
```

## Hooks

```http
GET  /api/recordings/:id/hooks
POST /api/recordings/:id/hooks/generate
POST /api/recordings/:id/hooks/:hookId/export
POST /api/recordings/:id/export
POST /api/recordings/:id/export/cancel
POST /api/recordings/:id/moments/search
POST /api/recordings/:id/moments/ask
```

## Clips

```http
POST   /api/clips
GET    /api/clips
GET    /api/clips/filters
GET    /api/clips/:id
POST   /api/clips/:id/social-copy
DELETE /api/clips/:id
GET    /api/clips/:id/download
```

Product clip create is hook export (`POST /api/recordings/:id/hooks/:hookId/export`) or prompt-range `POST /api/clips`. `GET /api/clips/:id/download` is still 501; the UI downloads `videoUrl` from `GET /api/clips/:id`.

`POST /api/clips/:id/social-copy` generates a share title + description via `LLMProvider.generateSocialCopy` from the clip’s transcript excerpt (and optional hook context), persists `socialTitle` / `socialDescription` on the clip, and returns the public clip. Ready clips only; human-initiated share copy — not automated social posting.

`DELETE /api/clips/:id` is tenant-scoped (**204**). Soft-deletes the clip row (`deleted_at`). Does not delete the hook. Filestack video + thumbnail stay until a later purge.

## Projects

```http
GET    /api/projects
GET    /api/projects/sidebar
DELETE /api/projects/:id
```

`DELETE /api/projects/:id` soft-deletes every recording (same cascade as recording delete), then remaining project KB metadata in MySQL, then the project. PyAI KB objects are kept until a later purge. **204** / **404**.

## Workspace

```http
GET /api/workspace/user
GET /api/workspace/stats
```

## Settings

```http
GET /api/settings
```

---

# 29. Background Jobs

Every expensive operation is a job.

Initial job types:

```text
VIDEO_INGEST
TRANSCRIBE
GENERATE_SUMMARY
SYNC_KNOWLEDGE_BASE
GENERATE_HOOKS
RENDER_CLIP
```

Job model:

```text
jobs
----
id
type
recording_id
status
attempt
max_attempts          # default 4
error
error_code
error_metadata
current_step
started_at
finished_at
metadata
created_at
updated_at
deleted_at

job_steps (one row per VIDEO_INGEST step; UNIQUE job_id+step; also has deleted_at)
job_audit_logs (append-only events; never store secrets in metadata; also has deleted_at)
```

Job states:

```text
queued
  ↓
running
  ↓
success | partial | failed
```

`partial` means the transcript exists but later analysis steps failed. Max attempts per step: 4.

---

# 30. Reliability / Harness Principles

The worker architecture should support the following principles:

## Named loop

Every job has a clear outcome:

```text
success
partial
failed
```

## Blocking gates

Do not publish invalid output.

Examples:

- transcript required before summary
- transcript required before hook generation
- hook timestamps must be valid before clip rendering
- clip must render successfully before it is marked ready

## Bounded retries

Every retry must have:

- a maximum number of attempts
- the reason for retry
- final failure state

Never retry forever.

## Failure invariant

Every job leaves a record.

No silent hangs.

## Safe parallelism

Independent jobs may run concurrently.

Operations that mutate the same resource should be serialized where required.

## Budget awareness

Long-running AI/media operations should eventually support:

- token limits
- time limits
- cost limits
- retry limits

---

# 31. Storage Architecture

Use Filestack. The frontend uploads video/audio and sends the CDN URL. The worker downloads that URL and may store extracted audio back to Filestack.

MySQL stores Filestack URLs/handles, not video binaries.

---

# 32. StorageProvider

Create:

```ts
export interface StorageProvider {
  upload(
    input: UploadInput
  ): Promise<StoredObject>;

  download(
    key: string
  ): Promise<ReadableStream>;

  getSignedUrl(
    key: string
  ): Promise<string>;

  delete(
    key: string
  ): Promise<void>;

  createVideoThumbnail(
    sourceKey: string,
    options?: { atMs?: number }
  ): Promise<StoredObject>;
}
```

Initial implementation:

```text
Filestack
```

---

# 33. QueueProvider

Create:

```ts
export interface QueueProvider {
  enqueue<T>(
    job: Job<T>
  ): Promise<void>;
}
```

Initial implementation:

```text
Redis + BullMQ
```

---

# 34. Repository Structure

Use a monorepo:

```text
mintreels/
├── apps/
│   ├── web/
│   ├── api/
│   └── worker/
│
├── packages/
│   ├── domain/
│   ├── schema/
│   ├── db/
│   ├── ai/
│   ├── knowledge/
│   ├── media/
│   ├── storage/
│   ├── queue/
│   └── config/
│
├── tests/
│   ├── integration/
│   └── e2e/
│
├── docs/
│   ├── architecture.md
│   ├── development.md
│   └── providers.md
│
├── scripts/
│   ├── setup.ts
│   └── seed.ts
│
├── docker/
│   ├── Dockerfile.web
│   ├── Dockerfile.api
│   └── Dockerfile.worker
│
├── .env.example
├── .gitignore
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── README.md
└── LICENSE
```

---

# 35. Detailed Package Boundaries

## apps/web

Application/runtime.

Depends on API contracts and UI/domain types.

Should not directly import PyAI.

## apps/api

HTTP API.

Coordinates domain services and jobs.

Should not directly contain vendor-specific PyAI logic.

## apps/worker

Executes background jobs.

Uses provider interfaces.

## packages/domain

Product/domain logic.

Contains:

```text
recordings/
transcripts/
summaries/
hooks/
clips/
knowledge/
```

## packages/ai

AI capability interfaces and provider implementations.

## packages/knowledge

Knowledge Base capability interface and adapters.

## packages/media

FFmpeg/media processing.

## packages/storage

Object storage abstraction.

## packages/queue

Background queue abstraction.

## packages/db

MySQL schema (TypeORM entities) and repositories. Entity shapes align to `@mintreels/schema` zod `*RowSchema` definitions. Primary keys are auto-increment integers.

## packages/config

Shared configuration and environment validation.

---

# 36. Recommended Initial Folder Structure

For the 33-hour hackathon/MVP, start with:

```text
mintreels/
├── apps/
│   ├── web/
│   ├── api/
│   └── worker/
│
├── packages/
│   ├── schema/
│   ├── db/
│   ├── ai/
│   ├── knowledge/
│   │   └── adapters/
│   │       └── pyai/
│   ├── media/
│   ├── storage/
│   └── queue/
│
├── docs/
├── scripts/
├── docker/
├── docker-compose.yml
├── .env.example
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── README.md
└── LICENSE
```

Do not over-engineer the first release.

In particular, do not implement:

- local KB
- Kubernetes
- billing
- multi-region infrastructure
- collaborative editing
- full nonlinear video editor
- advanced authentication

unless explicitly required later.

---

# 37. Suggested Detailed Folder Structure

```text
mintreels/
├── apps/
│   ├── web/
│   │   ├── app/
│   │   │   ├── routes/
│   │   │   │   ├── _index.tsx
│   │   │   │   ├── recordings.tsx
│   │   │   │   ├── recordings.$id.tsx
│   │   │   │   ├── knowledge.tsx
│   │   │   │   └── clips.tsx
│   │   │   │
│   │   │   ├── components/
│   │   │   │   ├── recordings/
│   │   │   │   ├── transcript/
│   │   │   │   ├── video/
│   │   │   │   ├── hooks/
│   │   │   │   ├── knowledge/
│   │   │   │   └── ui/
│   │   │   │
│   │   │   ├── lib/
│   │   │   │   ├── api.ts
│   │   │   │   └── utils.ts
│   │   │   │
│   │   │   └── root.tsx
│   │   ├── public/
│   │   └── package.json
│   │
│   ├── api/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── providers/
│   │   │   ├── common/
│   │   │   ├── recordings/
│   │   │   ├── transcripts/
│   │   │   ├── summaries/
│   │   │   ├── hooks/
│   │   │   ├── clips/
│   │   │   ├── knowledge/
│   │   │   └── jobs/
│   │   └── package.json
│   │
│   └── worker/
│       ├── src/
│       │   ├── jobs/
│       │   │   ├── ingest-video.ts
│       │   │   ├── transcribe.ts
│       │   │   ├── summarize.ts
│       │   │   ├── generate-hooks.ts
│       │   │   ├── sync-knowledge-base.ts
│       │   │   ├── export-recording.ts
│       │   │   ├── apply-overdub.ts
│       │   │   ├── apply-recording-voiceover.ts
│       │   │   └── render-clip.ts
│       │   │
│       │   ├── queues/
│       │   ├── processors/
│       │   └── worker.ts
│       └── package.json
│
├── packages/
│   ├── domain/
│   │   ├── recordings/
│   │   ├── transcripts/
│   │   ├── summaries/
│   │   ├── hooks/
│   │   ├── clips/
│   │   └── knowledge/
│   │
│   ├── ai/
│   │   ├── src/
│   │   │   ├── speech-provider.ts
│   │   │   ├── llm-provider.ts
│   │   │   ├── embedding-provider.ts
│   │   │   └── providers/
│   │   │       └── pyai/
│   │   │           ├── client.ts
│   │   │           ├── speech.ts
│   │   │           └── llm.ts
│   │   └── package.json
│   │
│   ├── knowledge/
│   │   ├── src/
│   │   │   ├── provider.ts
│   │   │   ├── types.ts
│   │   │   ├── errors.ts
│   │   │   └── adapters/
│   │   │       └── pyai/
│   │   │           ├── client.ts
│   │   │           ├── knowledge-base.ts
│   │   │           └── mapper.ts
│   │   └── package.json
│   │
│   ├── media/
│   │   ├── src/
│   │   │   ├── ffmpeg.ts
│   │   │   ├── audio.ts
│   │   │   ├── video.ts
│   │   │   ├── subtitles.ts
│   │   │   └── thumbnails.ts
│   │   └── package.json
│   │
│   ├── db/
│   │   ├── src/
│   │   │   ├── data-source.ts
│   │   │   ├── db.module.ts
│   │   │   ├── entities/
│   │   │   └── repositories/
│   │   └── package.json
│   │
│   ├── schema/
│   │   ├── src/
│   │   │   ├── common.ts
│   │   │   ├── recordings.ts
│   │   │   └── ...
│   │   └── package.json
│   │
│   ├── storage/
│   │   ├── src/
│   │   │   ├── provider.ts
│   │   │   └── filestack.ts
│   │   └── package.json
│   │
│   ├── queue/
│   │   ├── src/
│   │   │   ├── provider.ts
│   │   │   └── bullmq.ts
│   │   └── package.json
│   │
│   └── config/
│       ├── src/
│       │   └── index.ts
│       └── package.json
│
├── tests/
│   ├── integration/
│   └── e2e/
│
├── docs/
│   ├── architecture.md
│   ├── development.md
│   └── providers.md
│
├── scripts/
│   ├── setup.ts
│   └── seed.ts
│
├── docker/
│   ├── Dockerfile.web
│   ├── Dockerfile.api
│   └── Dockerfile.worker
│
├── docker-compose.yml
├── .env.example
├── .gitignore
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── README.md
└── LICENSE
```

---

# 38. Environment Configuration

Initial `.env.example`:

```env
NODE_ENV=development

# Database
DATABASE_URL=

# Redis
REDIS_URL=

# Object storage
FILESTACK_API_KEY=
FILESTACK_APP_SECRET=

# PyAI
PYAI_API_KEY=
PYAI_BASE_URL=

# Providers
AI_PROVIDER=pyai
KNOWLEDGE_BASE_PROVIDER=pyai
STORAGE_PROVIDER=filestack
QUEUE_PROVIDER=bullmq
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small
VECTOR_STORE_PROVIDER=qdrant
QDRANT_URL=http://qdrant:6333
QDRANT_API_KEY=
QDRANT_COLLECTION=hook_vectors
QDRANT_TRANSCRIPT_COLLECTION=transcript_windows
MOMENT_SEARCH_LIMIT=8
MOMENT_SEARCH_MIN_SIMILARITY=0.35
```

Never commit actual credentials.

---

# 39. Docker Development

`docker compose up` should provide the full local stack:

```text
mysql (MySQL 8)
phpmyadmin (:8080)
redis
api (:3000)
worker
web (:5173)
```

Source is bind-mounted; Node `--watch` reloads api/worker. Do not introduce Kubernetes at this stage.

---

# 40. API → Worker Flow

Example:

```text
POST /api/recordings
        ↓
Create DB recording + VIDEO_INGEST job + job_steps
        ↓
Enqueue ingest-video on queue `mintreels` (payload: recordingId, jobId)
        ↓
Return { id, jobId }
```

Client polls `GET /api/recordings/:id/processing`. Worker:

Best-effort recording thumbnail (Filestack `video_convert=preset:thumbnail` at the video midpoint, FFmpeg frame upload as fallback) runs after a local video is available (or when `durationMs` is known). Ingest start skips the poster when duration is unknown so a 1s blank frame is not persisted. Failure never fails ingest. Stored as `recordings.thumbnail_storage_key`; public `thumbnailUrl` on recording/processing/project GETs.

```text
VIDEO_INGEST (single BullMQ job, sequential job_steps)
    ↓
AUDIO_EXTRACTION → AUDIO_UPLOAD
    ↓
TRANSCRIPTION (poll PyAI job; no webhook)
    ↓
TRANSCRIPTION_PERSIST
    ↓
SUMMARY ∥ ACTION_ITEMS ∥ TRANSCRIPT_EMBEDDINGS ∥ HOOKS
    ↓
HOOK_EMBEDDINGS → CLIP_RECOMMENDATIONS
```

KB sync and clip render are out of scope for this pipeline.

---

# 41. Product Priorities

Build in this order:

## Phase 1

```text
Upload
  ↓
Storage
  ↓
Transcription
  ↓
Transcript
  ↓
VTT
```

## Phase 2

```text
Transcript
  ├── Summary
  └── Recording KB
```

## Phase 3

```text
Recording KB
     ↓
Add to Global KB
     ↓
Search
```

## Phase 4

```text
Transcript
     ↓
AI Hooks
     ↓
User selection
     ↓
FFmpeg
     ↓
Clip + subtitles
```

The MVP success case:

> Upload a video and get transcript, summary, searchable knowledge, and suggested clips.

---

# 42. Design Principles

## Transcript-first

The transcript is the central representation.

## Provider abstraction

All external capabilities are accessed through interfaces.

## PyAI-first

PyAI is the default implementation and core infrastructure.

## No unnecessary duplication

Do not duplicate PyAI Knowledge Base vectors/embeddings in MySQL.

## Async by default

Long-running work belongs in workers.

## Clear failures

Every job has a visible state and failure reason.

## Bounded retries

Never retry indefinitely.

## Simple infrastructure

Prefer a few understandable services over a large distributed system.

## OSS-friendly

A developer should be able to understand the architecture and replace a provider without rewriting the product.

---

# 43. Cursor Implementation Instructions

When using this document as context, Cursor should:

1. Treat this document as the current architecture record.
2. Preserve the provider/adapter boundaries.
3. Treat PyAI as the default AI and Knowledge Base provider.
4. Do not introduce a local Knowledge Base unless explicitly requested.
5. Do not bypass `KnowledgeBaseProvider`.
6. Do not import PyAI directly into frontend/domain code.
7. Keep vendor-specific types inside provider/adapter directories.
8. Use TypeScript.
9. Use strict typing.
10. Keep background operations asynchronous.
11. Prefer small, composable services.
12. Avoid premature infrastructure.
13. Update this architecture record when a major architecture decision changes.
14. Do not silently change the storage, queue, AI provider, or KB strategy.
15. Ask before making a major architectural change.

---

# 44. Current Architectural Decisions

| Decision | Current choice |
|---|---|
| Repository | Monorepo |
| Package manager | pnpm |
| Build orchestration | Turborepo |
| Frontend | React + React Router |
| UI | ShadCN |
| Language | TypeScript |
| HTTP API | NestJS |
| Database | MySQL 8 + TypeORM |
| Validation / DTOs | Zod (`@mintreels/schema`) |
| Queue | Redis + BullMQ |
| Media | FFmpeg |
| Object storage | Filestack |
| STT | PyAI |
| LLM | PyAI/default provider |
| Knowledge Base | PyAI KB |
| KB abstraction | `KnowledgeBaseProvider` |
| Local KB | Not implemented |
| Vector DB | `VectorStoreProvider`; Qdrant (self-hosted service) |
| Background processing | Worker |
| Transcript source of truth | Timestamped transcript segments |
| Subtitle format | VTT |
| Clip generation | FFmpeg |
| AI hooks | LLM + transcript timestamps |

---

# 45. Explicit Non-Goals for Initial MVP

Do not implement unless requested:

- Full Descript-style timeline editor
- Multi-user real-time collaboration
- Comments
- Billing
- Enterprise permissions
- Kubernetes
- Microservices
- Managed/cloud vector DB services (e.g. Pinecone). Self-hosted Qdrant behind `VectorStoreProvider` is in scope.
- Local LLM
- Local STT
- Provider marketplace
- Advanced video effects
- Advanced animations
- Automated social posting
- Mobile applications

The goal is a focused, working video intelligence and clipping pipeline rather than a complete clone of Descript.

---

# 46. Target End State

The desired architecture can be summarized as:

```text
                         OPEN DESCRIPT
                              │
              ┌───────────────┴────────────────┐
              │                                │
         Product Domain                  Capability Layer
              │                                │
              │                 ┌──────────────┼──────────────┐
              │                 │              │              │
              │              AI Provider    Knowledge      Media
              │                 │           Provider       Provider
              │                 │              │              │
              │              PyAI           PyAI KB        FFmpeg
              │
              ▼
       Timestamped Transcript
              │
       ┌──────┼───────────┬─────────────┐
       │      │           │             │
    Summary  VTT        KB           Hooks
                                      │
                                      ▼
                                   Clip
                                      │
                                      ▼
                               MP4 + subtitles
```

The central architectural idea is:

> **MintReels owns the product experience and domain model. PyAI provides the AI and Knowledge Base capabilities through explicit provider/adapter boundaries.**

This document is the source of truth for the current project architecture.
