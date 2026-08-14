# MintReels GET APIs — Frontend Contract

Source of truth for wiring the web app to the Nest API. Auth cookie rules stay in [`docs/auth-frontend.md`](./auth-frontend.md). Live examples: `http://127.0.0.1:3000/docs`.

Call the API **only** through [`apps/web/app/lib/api.ts`](../apps/web/app/lib/api.ts). Add `credentials: 'include'` on every `fetch` (cookie session). Never send `Authorization: Bearer`.

To hit the real API instead of mocks:

```bash
# apps/web
VITE_USE_MOCK_DATA=false
```

(`app-providers.tsx` uses mocks unless this is exactly `"false"`.)

---

## Conventions (API ≠ home mocks)

| | Mocks (`app/lib/data/types.ts`) | Live API |
| --- | --- | --- |
| IDs | strings (`proj_q3`, `clip_1`) | **integers** (`1`, `2`) |
| Times | `"Updated 12 minutes ago"`, `"04:12 – 04:53"`, `"41s"` | ISO dates + **`startMs` / `endMs`** |
| Copy | `updatedLabel`, `jobText`, `kbLabel`, `projectLabel`, `caption` | structured fields; **format in the UI** |
| Secrets | fake `sk_live_…` | never returned |

JSON is **camelCase**. Dates are ISO strings. Empty lists are `200 []`. Missing / not owned resources are **`404 { "error": "Not found" }`** (not 403).

Canonical enum strings live in `@mintreels/schema` (`packages/schema/src/enums.ts`). Web does not depend on that package yet — copy the string values below or add the workspace dep later.

---

## Errors

```json
{ "error": "UNAUTHORIZED" }
```

| Status | When |
| --- | --- |
| `401` | Missing / invalid `auth_token` cookie |
| `400` | Non-integer `:id`, or hook export `INVALID_HOOK_RANGE` |
| `404` | Not found or not owned |
| `409` | Hook export / clip create `VIDEO_NOT_AVAILABLE`; ingest retry `INGEST_IN_PROGRESS` or `NOT_RETRYABLE`; moment search `TRANSCRIPT_REQUIRED` or `TRANSCRIPT_INDEX_NOT_READY` |
| `501` | POST/enqueue not built yet (generate summary, add-to-global-kb, signed clip download) |
| `500` | `{ "error": "Internal server error" }` |

Switch on `error`. Do not show stack traces.

---

## `api.ts` → HTTP

All paths are under `/api`. All GETs below are implemented and cookie-scoped to the logged-in user.

| `api.ts` | Method | Path |
| --- | --- | --- |
| `getRecordings()` | GET | `/recordings` |
| `getRecording(id)` | GET | `/recordings/:id` |
| `deleteRecording(id)` | DELETE | `/recordings/:id` (**204**) |
| `getRecordingProcessing(id)` | GET | `/recordings/:id/processing` |
| `createRecording(body)` | POST | `/recordings` |
| `retryRecording(id)` | POST | `/recordings/:id/retry` |
| `getTranscript(id)` | GET | `/recordings/:id/transcript` |
| `patchTranscriptSegment(id, segmentId, body)` | PATCH | `/recordings/:id/transcript/segments/:segmentId` |
| `applyTranscriptOverdub(id, segmentId, body)` | POST | `/recordings/:id/transcript/segments/:segmentId/overdub` |
| `getTranscriptOverdub(id)` | GET | `/recordings/:id/transcript/overdub` |
| `applyRecordingVoiceover(id, body)` | POST | `/recordings/:id/voiceover` |
| `getRecordingVoiceover(id)` | GET | `/recordings/:id/voiceover` |
| `getVoices()` | GET | `/voices` |
| — | GET | `/recordings/:id/transcript.vtt` (`text/vtt`) |
| `getSummary(id)` | GET | `/recordings/:id/summary` |
| `getHooks(id)` | GET | `/recordings/:id/hooks` |
| `searchMoments(id, { query })` | POST | `/recordings/:id/moments/search` |
| `askMoments(id, { query })` | POST | `/recordings/:id/moments/ask` |
| `exportHookClip(recordingId, hookId)` | POST | `/recordings/:id/hooks/:hookId/export` |
| `exportRecording(id, body?)` | POST | `/recordings/:id/export` |
| `cancelRecordingExport(id)` | POST | `/recordings/:id/export/cancel` |
| `createClip(body)` | POST | `/clips` |
| `getKnowledgeBases()` | GET | `/knowledge-bases` |
| `getClip(id)` | GET | `/clips/:id` |
| `generateClipSocialCopy(id)` | POST | `/clips/:id/social-copy` |
| `deleteClip(id)` | DELETE | `/clips/:id` (**204**) |
| `getClips()` | GET | `/clips` |
| `getClipFilters()` | GET | `/clips/filters` |
| `getProjects()` | GET | `/projects` |
| `deleteProject(id)` | DELETE | `/projects/:id` (**204**) |
| `getSidebarProjects()` | GET | `/projects/sidebar` |
| `getWorkspaceUser()` | GET | `/workspace/user` |
| `getWorkspaceStats()` | GET | `/workspace/stats` |
| `getSettings()` | GET | `/settings` |

`id` params are **numbers**. `GET /clips/filters` must stay a static path (already listed before `:id` on the server).

---

## Response shapes

### Recordings — `GET /api/recordings`, `GET /api/recordings/:id`

**No `storageKey`.** Playback URLs are `videoUrl` / `audioUrl` (`audioUrl` is `null` until extraction finishes). Poster is `thumbnailUrl` (`null` until ingest thumbnail finishes). Status: `uploaded` \| `processing` \| `ready` \| `failed`.

Latest full-video export (if any): `exportStatus` (`queued` \| `rendering` \| `ready` \| `failed`, or `null` if never exported), `exportAspectRatio`, `exportFitMode`, `exportBurnSubtitles`, `exportVideoUrl`, `exportThumbnailUrl`. Never `exportStorageKey`.

```json
{
  "id": 10,
  "projectId": 2,
  "title": "Ep. 14",
  "originalFilename": "ep14.mp4",
  "durationMs": 3600000,
  "width": 1920,
  "height": 1080,
  "status": "ready",
  "videoUrl": "https://cdn.filestackcontent.com/HANDLE",
  "audioUrl": "https://cdn.filestackcontent.com/AUDIO",
  "thumbnailUrl": "https://cdn.filestackcontent.com/THUMB",
  "exportStatus": null,
  "exportAspectRatio": null,
  "exportFitMode": null,
  "exportBurnSubtitles": null,
  "exportVideoUrl": null,
  "exportThumbnailUrl": null,
  "createdAt": "2026-08-13T08:00:00.000Z",
  "updatedAt": "2026-08-13T08:00:00.000Z"
}
```

List is an array of the same object.

### Create recording — `POST /api/recordings`

Client uploads video/audio to Filestack, then creates a project + recording:

```json
{ "title": "Ep. 14", "originalFilename": "ep14.mp4", "url": "https://cdn.filestackcontent.com/HANDLE" }
```

`201`: `{ "id": 10, "projectId": 4, "jobId": 1 }`. `url` must be HTTPS on `cdn.filestackcontent.com` (or `/api/file/{handle}`). No `storageKey` in any GET response.

### Retry ingest — `POST /api/recordings/:id/retry`

Re-enqueues the latest `VIDEO_INGEST` job after a **failed** or **partial** run. Completed steps are kept; failed/stuck steps are reset and run again. Cookie session required.

`202`: `{ "id": 10, "projectId": 4, "jobId": 1 }`. Then poll `GET /api/recordings/:id/processing`.

| Status | `error` |
| --- | --- |
| `404` | Recording not found / not owned |
| `409` | `INGEST_IN_PROGRESS` or `NOT_RETRYABLE` |

### Processing poll — `GET /api/recordings/:id/processing`

Poll while `status` is `processing`. No `storageKey`, no `raw_response`, no secrets. `videoUrl` / `audioUrl` are playback URLs (`audioUrl` is `null` until audio upload completes). `thumbnailUrl` is the recording poster (`null` until Filestack/FFmpeg thumb is stored).

When transcription has persisted, `transcript` is the full result (`text`, word-level timings in seconds, `segments`, `speakers`, `audio_seconds`, optional caption `formats`). Older recordings without stored words return `words: []`.

```json
{
  "recordingId": 10,
  "status": "processing",
  "videoUrl": "https://cdn.filestackcontent.com/HANDLE",
  "audioUrl": "https://cdn.filestackcontent.com/AUDIO",
  "thumbnailUrl": "https://cdn.filestackcontent.com/THUMB",
  "job": {
    "id": 1,
    "status": "running",
    "currentStep": "TRANSCRIPTION",
    "attempt": 1,
    "maxAttempts": 4,
    "errorCode": null,
    "errorMessage": null
  },
  "steps": [
    { "step": "AUDIO_EXTRACTION", "status": "completed", "attempt": 1 },
    { "step": "TRANSCRIPTION", "status": "processing", "attempt": 1, "provider": "pyai" }
  ],
  "transcript": {
    "id": 1,
    "language": "en",
    "text": "[speaker_1] Hello world",
    "words": [{ "word": "Hello", "start": 0, "end": 0.4, "speaker": "speaker_1" }],
    "formats": {
      "srt": "https://example.com/job.srt",
      "vtt": "https://example.com/job.vtt"
    },
    "segments": [
      { "id": 0, "start": 0, "end": 1.5, "text": "Hello world", "speaker": "speaker_1" }
    ],
    "speakers": 1,
    "audio_seconds": 1.5
  },
  "summary": { "id": 1, "text": "..." },
  "actionItems": [],
  "hooks": [],
  "audit": [{ "event": "step_started", "step": "TRANSCRIPTION", "message": "started attempt 1", "createdAt": "2026-08-13T08:00:00.000Z" }]
}
```

Job status: `queued` \| `running` \| `success` \| `failed` \| `partial`. Step status: `pending` \| `processing` \| `completed` \| `retrying` \| `failed` \| `skipped`.

### Transcript — `GET /api/recordings/:id/transcript`

Same public DTO as `processing.transcript`. Times are **seconds**. `404` if recording or transcript row is missing. Empty `segments` / `words` is `200`. Never returns `rawResponse`, `provider`, or `storageKey`.

```json
{
  "id": 1,
  "recordingId": 10,
  "language": "en",
  "text": "[speaker_1] Hello world",
  "words": [{ "word": "Hello", "start": 0, "end": 0.4, "speaker": "speaker_1" }],
  "formats": {
    "srt": "https://example.com/job.srt",
    "vtt": "https://example.com/job.vtt"
  },
  "segments": [
    { "id": 0, "start": 0, "end": 1.5, "text": "Hello world", "speaker": "speaker_1" }
  ],
  "speakers": 1,
  "audio_seconds": 1.5
}
```

`speaker` may be omitted on a segment or word. VTT: `GET /api/recordings/:id/transcript.vtt` (`Content-Type: text/vtt`) — export-only. The editor player overlays captions from this JSON transcript (segment text + word karaoke); it does not fetch VTT.

### Summary — `GET /api/recordings/:id/summary`

`404` if missing.

```json
{
  "id": 1,
  "recordingId": 10,
  "text": "The episode covers roadmap tradeoffs.",
  "createdAt": "2026-08-13T08:00:00.000Z"
}
```

### Hooks — `GET /api/recordings/:id/hooks`

Recording `404`; no hooks → `[]`. `clip` is the latest export for that hook, or `null`.

```json
[
  {
    "id": 1,
    "recordingId": 10,
    "title": "The roadmap was never a plan",
    "hook": "The roadmap was never a plan",
    "reason": "Strong contrast in the first line",
    "startMs": 252000,
    "endMs": 293000,
    "score": 0.91,
    "createdAt": "2026-08-13T08:00:00.000Z",
    "clip": {
      "id": 3,
      "status": "ready",
      "videoUrl": "https://cdn.filestackcontent.com/HANDLE",
      "thumbnailUrl": "https://cdn.filestackcontent.com/THUMB"
    }
  }
]
```

### Ask / moments — `POST /api/recordings/:id/moments/ask`

One recording-scoped prompt. The API classifies intent; the UI **switches on `kind`**. Do not classify on the client.

Cursor rule for agents: [`.cursor/rules/ask-moments-frontend.mdc`](../.cursor/rules/ask-moments-frontend.mdc). Helpers: `api.askMoments`, `api.createClip`. Reference UI: `AskMint` in `apps/web/app/components/summary/moment-search.tsx` (inline right-pane tab — not a modal, so player seek stays usable).

```json
{ "query": "What did they say about pricing?", "limit": 8 }
```

`query` 3–500 chars. Optional `limit` (default 8) only applies when the result is clip hits. `id` is the **recording** integer.

Discriminated **200** responses:

```json
{ "kind": "answer", "text": "They said the enterprise plan starts at ninety nine." }
```

```json
{
  "kind": "moments",
  "moments": [
    {
      "startMs": 12000,
      "endMs": 42000,
      "clipStartMs": 9000,
      "clipEndMs": 47000,
      "title": "The enterprise plan starts at",
      "excerpt": "We should talk about pricing. The enterprise plan starts at ninety nine.",
      "similarity": 0.82
    }
  ]
}
```

```json
{ "kind": "reject", "text": "I don't do weather, recipes, or existential dread — only this recording." }
```

| `kind` | UI |
|---|---|
| `answer` | Show `text` (transcript Q&A) |
| `moments` | Cards; seek `startMs / 1000` s; **Cut clip** with `clipStartMs` / `clipEndMs` via `POST /api/clips` (`hookId` omitted). Poll `GET /api/clips/:id`. |
| `reject` | Show `text` as a funny refusal (**not** an error toast) |

`kind: "moments"` + empty array → “No matching moments.”

`409`: `TRANSCRIPT_REQUIRED` (no transcript yet), `TRANSCRIPT_INDEX_NOT_READY` (retry ingest to build window embeddings — only blocks clip hits). Direct clip-only search remains `POST /recordings/:id/moments/search` (`{ moments }`, no `kind`).

### Hook export — `POST /api/recordings/:id/hooks/:hookId/export`

Optional body: `{ aspectRatio?: "9:16"|"1:1"|"16:9", fitMode?: "fit"|"fill", burnSubtitles?: boolean, voiceover?: { enabled, voiceId, titleText?, ctaText?, placement: "pre"|"post" } }` (defaults `9:16` / `fit` / `true`). Creates a `clips` row (`queued`) and enqueues `render-clip`. Optional `voiceover` mixes AI Speak audio onto the render. **202** with the public clip DTO. Poll `GET /api/clips/:id` while `status` is `queued` or `rendering`.

`fitMode`: **`fit`** (default) = full frame + blurred pad; **`fill`** = center crop (opt-in). Layout-agnostic — Fit preserves the whole source regardless of hosts/grid/PiP.

Idempotent when aspect + fit + burn + voiceover match: in-flight (`queued`/`rendering`) or `ready` returns the existing clip; `failed` or different options resets that row and re-enqueues.

Errors: `404` recording/hook, `400 INVALID_HOOK_RANGE`, `409 VIDEO_NOT_AVAILABLE`. Never returns `storageKey`.

```json
{
  "id": 3,
  "title": "The roadmap was never a plan",
  "recordingId": 10,
  "hookId": 1,
  "projectId": 2,
  "projectName": "Q3 Product Podcast",
  "recordingTitle": "Ep. 14",
  "startMs": 252000,
  "endMs": 293000,
  "status": "queued",
  "aspectRatio": "9:16",
  "fitMode": "fit",
  "burnSubtitles": true,
  "subtitleStyle": null,
  "videoUrl": null,
  "thumbnailUrl": null,
  "ratio": "9:16"
}
```

### Full recording export — `POST /api/recordings/:id/export`

Optional body: `{ aspectRatio?: "9:16"|"1:1"|"16:9", fitMode?: "fit"|"fill", burnSubtitles?: boolean, force?: boolean }` (defaults `9:16` / `fit` / `true` / `force` false). Sets `recordings.export_*` to `queued` and enqueues `export-recording` (previous `export_*` snapshotted in job metadata). **202** with the public recording export fields plus `jobId`. Poll `GET /api/recordings/:id` while `exportStatus` is `queued` or `rendering` (or `ready` without `exportVideoUrl`).

Idempotent when aspect + fit + burn match and `force` is omitted/false: in-flight (`queued`/`rendering`) or `ready` returns the current export fields (no re-enqueue). `failed`, different options, or `force: true` reset export keys/status and re-enqueue. Latest export only (overwrite). Only the latest `EXPORT_RECORDING` job may write `export_*`.

### Cancel export — `POST /api/recordings/:id/export/cancel`

Cancels an in-flight export (`exportStatus` `queued` or `rendering`). Best-effort BullMQ remove, marks the job `failed` with `EXPORT_CANCELLED`, restores `export_*` from the enqueue snapshot (or all `null`). **200** with public recording + `jobId`. **409 `EXPORT_NOT_IN_PROGRESS`** when nothing to cancel. Worker treats cancel like supersession (no further `export_*` writes).

Errors: `404`, `409 VIDEO_NOT_AVAILABLE` (no source video), `409 TRANSCRIPT_REQUIRED` when `burnSubtitles: true` and there are no transcript segments. Never returns `exportStorageKey`.

Editor header: **Export** (confirm dialog sends `force: true`) → poll → **Cancel** while in flight → **Download** when `exportStatus === ready` and `exportVideoUrl` is a valid HTTPS Filestack URL. Failed exports show a destructive Export control and dialog message. Download uses the client Filestack helper (same as clips).

```json
{
  "id": 10,
  "projectId": 2,
  "title": "Ep. 14",
  "originalFilename": "ep14.mp4",
  "durationMs": 3600000,
  "width": 1920,
  "height": 1080,
  "status": "ready",
  "videoUrl": "https://cdn.filestackcontent.com/HANDLE",
  "audioUrl": "https://cdn.filestackcontent.com/AUDIO",
  "thumbnailUrl": "https://cdn.filestackcontent.com/THUMB",
  "exportStatus": "queued",
  "exportAspectRatio": "9:16",
  "exportFitMode": "fit",
  "exportBurnSubtitles": true,
  "exportVideoUrl": null,
  "exportThumbnailUrl": null,
  "jobId": 42,
  "createdAt": "2026-08-13T08:00:00.000Z",
  "updatedAt": "2026-08-13T08:00:00.000Z"
}
```

### Knowledge bases — `GET /api/knowledge-bases`

`scope`: `recording` \| `global`. Includes `provider` + `providerKnowledgeBaseId` (metadata, not a secret).

```json
[
  {
    "id": 1,
    "projectId": 2,
    "name": "Global KB",
    "scope": "global",
    "provider": "pyai",
    "providerKnowledgeBaseId": "kb_abc",
    "recordingId": null,
    "createdAt": "2026-08-13T08:00:00.000Z",
    "updatedAt": "2026-08-13T08:00:00.000Z"
  }
]
```

### Clips — `GET /api/clips`, `GET /api/clips/:id`

**No `storageKey`, no signed URL, no `caption`.** Playback URL is `videoUrl` (`null` until render finishes). Poster is `thumbnailUrl` (`null` until Filestack/FFmpeg thumb is stored). `hookId` is `null` when the clip was not created from a hook. `aspectRatio` / `ratio` is the **export target** (`9:16` \| `1:1` \| `16:9`). `fitMode` is `fit` (full frame + blur pad, default) or `fill` (center crop). `burnSubtitles` is whether captions were burned in. Status: `queued` \| `rendering` \| `ready` \| `failed`. Optional `socialTitle` / `socialDescription` are AI share copy (null until generated).

`POST /api/clips` creates a clip from an owned recording time range (prompt search uses padded `clipStartMs` / `clipEndMs`, `hookId` omitted). Optional `aspectRatio` (default `9:16`), `fitMode` (default `fit`), `burnSubtitles` (default `true`), and `voiceover: { enabled, voiceId, titleText?, ctaText?, placement: "pre"|"post" }`. Hook export remains `POST /recordings/:id/hooks/:hookId/export`. Stock voices: `GET /api/voices`.

`POST /api/clips/:id/social-copy` (ready clips only) generates and persists `socialTitle` + `socialDescription` for human-initiated sharing. **409** `CLIP_NOT_READY` or `TRANSCRIPT_REQUIRED`. Share UI edits the copy then copies title + description + HTTPS `videoUrl` (not auto-posting).

```json
{
  "id": 1,
  "title": "The roadmap was never a plan",
  "socialTitle": "The roadmap was never a plan",
  "socialDescription": "A sharp take on why roadmaps fail — and what to do instead.",
  "recordingId": 10,
  "hookId": 4,
  "projectId": 2,
  "projectName": "Q3 Product Podcast",
  "recordingTitle": "Ep. 14",
  "startMs": 252000,
  "endMs": 293000,
  "status": "ready",
  "aspectRatio": "9:16",
  "fitMode": "fit",
  "burnSubtitles": true,
  "subtitleStyle": "bold_mint",
  "videoUrl": "https://cdn.filestackcontent.com/HANDLE",
  "thumbnailUrl": "https://cdn.filestackcontent.com/THUMB",
  "ratio": "9:16"
}
```

Map to mock `ClipSummary` in the UI: `projectLabel` ← `projectName` + `recordingTitle`; `range` / `duration` ← `startMs`/`endMs`; `id` ← `String(id)` only if the router still wants strings.

### Editor + clips UI


- Editor hook/moment **Cut clip**: confirm aspect + burn, then optional AI voiceover dialog; export with both. Poll `GET /clips/:id` while `queued` / `rendering`.
- Transcript: **Edit** a segment → save text (`PATCH …/segments/:segmentId`) and/or **Apply voice** (`POST …/overdub` + poll `GET …/transcript/overdub`). On success, reload recording `videoUrl` (source audio was replaced).
- Editor header: **AI voiceover** applies Speak mix to the full source recording (`POST /recordings/:id/voiceover`); **Export** remains full-recording aspect/burn export.

- Player aspect chips (`9:16` default, `1:1`, `16:9`) frame preview: **Fit** = `object-contain` + blurred backdrop; **Fill** = `object-cover`. Default Fit for vertical/square. **Cut clip** opens a confirm with aspect chips plus **Fit (blur)** / **Fill (crop)** (“Keep full frame” vs “Zoom / crop”), then calls export/`createClip` with `aspectRatio` + `fitMode` + `burnSubtitles: true`.
- Editor hook card: **Cut clip** until the hook has no ready `videoUrl`; poll `GET /clips/:id` while `queued` / `rendering`. When `status === ready` and `videoUrl` is set, show the **download icon** only.
- Clips page: list/filter via `GET /clips` + `GET /clips/filters`. Cards use a **4:3** poster (`thumbnailUrl` when present); **Download** when `ready` + `videoUrl`. **Share** opens the share modal (Generate/Regenerate social title + description via `POST /clips/:id/social-copy`, then copy/share). **Delete** (confirm dialog) calls `DELETE /clips/:id` for any status.
- Download fetches `videoUrl` in the browser (HTTPS Filestack CDN only, `credentials: 'omit'`). Show a loading state while the file is saving. Signed `GET /clips/:id/download` is still unimplemented.

### Delete — `DELETE /api/projects/:id`, `/api/clips/:id`, `/api/recordings/:id`

Cookie session required. Success is **204** with an empty body (`api.ts` already treats 204 as `void`). Missing / not owned → **404 `{ "error": "Not found" }`**. List/sidebar/stats/editor GETs never include soft-deleted rows (`deleted_at` set); the UI removes them from React Query cache on 204, then refetches.

- **Project** (home card + editor header): confirm, then `deleteProject(id)`. Soft-deletes recordings, clips, and KB metadata (`deleted_at`). Drop from list/sidebar/stats cache immediately, then invalidate projects, clips, recordings, workspace stats. After editor delete, navigate to `/`.
- **Clip** (clips page card): confirm, then `deleteClip(id)`. Does not delete the hook. Drop from list/filters/detail/stats cache immediately, then invalidate.
- **Recording**: `deleteRecording(id)` is available on the client; product UI deletes via the **project**. Server cascade soft-deletes child MySQL rows. Filestack and PyAI KB objects stay until a later purge.

### Clip filters — `GET /api/clips/filters`

```json
[
  { "id": "all", "label": "All", "count": 128 },
  { "id": "queued", "label": "Queued", "count": 5 },
  { "id": "rendering", "label": "Rendering", "count": 6 },
  { "id": "ready", "label": "Ready", "count": 114 },
  { "id": "failed", "label": "Failed", "count": 3 }
]
```

Mock labels like `"All · 128"` — append ` · ${count}` in the UI if you want that.

### Projects — `GET /api/projects`

```json
[
  {
    "id": 1,
    "name": "Q3 Product Podcast",
    "updatedAt": "2026-08-13T08:00:00.000Z",
    "recordingCount": 34,
    "clipCount": 61,
    "hookCount": 9,
    "kbScope": "global",
    "jobStatus": "running",
    "runningJobCount": 2,
    "failedJobCount": 0,
    "thumbnailUrl": "https://cdn.filestackcontent.com/THUMB"
  }
]
```

`jobStatus`: `running` \| `failed` \| `idle`. `kbScope`: `global` \| `recording` \| `null`. `thumbnailUrl` is the latest recording poster on that project (`null` until ingest thumbnail finishes). Never `storageKey`.

Home project cards: 4:3-style poster from `thumbnailUrl` when present (HTTPS Filestack only); trash overlay + confirm before `DELETE /projects/:id`.

Mock map: `recordings` ← `recordingCount`, `clips` ← `clipCount`, `hooks` ← `hookCount`, `updatedLabel` ← format `updatedAt`, `kbLabel` / `jobText` ← derive from `kbScope` + counts.

### Sidebar — `GET /api/projects/sidebar`

```json
[{ "id": 1, "name": "Q3 Product Podcast", "recordingCount": 34, "accent": "mint" }]
```

`accent`: `mint` \| `warn` \| `muted` (derived: failed jobs → `warn`, running → `mint`, else `muted`).

### Workspace — `GET /api/workspace/user`, `/stats`

```json
{ "displayName": "Ada Lovelace", "initials": "AL", "subtitle": "ada@example.com" }
```

`subtitle` is the email (not mock `"Self-hosted"`).

```json
{ "projectCount": 4, "recordingCount": 71, "clipCount": 128 }
```

### Settings — `GET /api/settings`

`maskedKey` is only `"configured"` \| `"not configured"` — never a real key. `mediaOnDiskGb` is `0` for now.

```json
{
  "providers": [
    {
      "id": "speech",
      "label": "Speech-to-text",
      "envKey": "AI_PROVIDER",
      "maskedKey": "configured",
      "model": "pyai",
      "status": "connected"
    }
  ],
  "renderDefaults": [],
  "storageJobs": {
    "mediaOnDiskGb": 0,
    "workerConcurrency": 1,
    "failedJobsRetryable": 0
  }
}
```

Provider `id`: `speech` \| `llm` \| `kb` \| `storage`. Status: `connected` \| `not_set`.

---

## FE follow-ups (not done on the API)

1. `credentials: 'include'` in `api.ts`.
2. Update `app/lib/data/types.ts` (and repositories) to integer ids + API field names, **or** map API → mock view-models in the repository layer.
3. Type `getRecordings` / `getTranscript` / `getHooks` / etc. instead of `unknown`.
4. POST generate summary, add-to-global-kb, and signed `GET /clips/:id/download` are still **501**. Hook export, `POST .../moments/ask`, `POST /clips`, and client download via `videoUrl` are live.

---

## Out of scope

Reading the JWT, `Authorization` headers, Redis, signed clip download URLs, or PyAI from the browser. Filestack upload stays on the client; only the CDN URL is POSTed to the API.
