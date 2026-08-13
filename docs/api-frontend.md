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
| `400` | Non-integer `:id` |
| `404` | Not found or not owned |
| `501` | POST/enqueue not built yet (generate summary/hooks, add-to-global-kb, clip create) |
| `500` | `{ "error": "Internal server error" }` |

Switch on `error`. Do not show stack traces.

---

## `api.ts` → HTTP

All paths are under `/api`. All GETs below are implemented and cookie-scoped to the logged-in user.

| `api.ts` | Method | Path |
| --- | --- | --- |
| `getRecordings()` | GET | `/recordings` |
| `getRecording(id)` | GET | `/recordings/:id` |
| `getRecordingProcessing(id)` | GET | `/recordings/:id/processing` |
| `createRecording(body)` | POST | `/recordings` |
| `getTranscript(id)` | GET | `/recordings/:id/transcript` |
| — | GET | `/recordings/:id/transcript.vtt` (`text/vtt`) |
| `getSummary(id)` | GET | `/recordings/:id/summary` |
| `getHooks(id)` | GET | `/recordings/:id/hooks` |
| `getKnowledgeBases()` | GET | `/knowledge-bases` |
| `getClip(id)` | GET | `/clips/:id` |
| `getClips()` | GET | `/clips` |
| `getClipFilters()` | GET | `/clips/filters` |
| `getProjects()` | GET | `/projects` |
| `getSidebarProjects()` | GET | `/projects/sidebar` |
| `getWorkspaceUser()` | GET | `/workspace/user` |
| `getWorkspaceStats()` | GET | `/workspace/stats` |
| `getSettings()` | GET | `/settings` |

`id` params are **numbers**. `GET /clips/filters` must stay a static path (already listed before `:id` on the server).

---

## Response shapes

### Recordings — `GET /api/recordings`, `GET /api/recordings/:id`

**No `storageKey`.** Playback URLs are `videoUrl` / `audioUrl` (`audioUrl` is `null` until extraction finishes). Status: `uploaded` \| `processing` \| `ready` \| `failed`.

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

### Processing poll — `GET /api/recordings/:id/processing`

Poll while `status` is `processing`. No `storageKey`, no `raw_response`, no secrets. `videoUrl` / `audioUrl` are playback URLs (`audioUrl` is `null` until audio upload completes).

When transcription has persisted, `transcript` is the full result (`text`, word-level timings in seconds, `segments`, `speakers`, `audio_seconds`, optional caption `formats`). Older recordings without stored words return `words: []`.

```json
{
  "recordingId": 10,
  "status": "processing",
  "videoUrl": "https://cdn.filestackcontent.com/HANDLE",
  "audioUrl": "https://cdn.filestackcontent.com/AUDIO",
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

`speaker` may be omitted on a segment or word. VTT: `GET /api/recordings/:id/transcript.vtt` (`Content-Type: text/vtt`).

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

Recording `404`; no hooks → `[]`.

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
    "createdAt": "2026-08-13T08:00:00.000Z"
  }
]
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

**No `storageKey`, no signed URL, no `caption`.** `ratio` is derived (`9:16` \| `1:1` \| `16:9`) and **omitted** if recording width/height are null. Status: `queued` \| `rendering` \| `ready` \| `failed`.

```json
{
  "id": 1,
  "title": "The roadmap was never a plan",
  "recordingId": 10,
  "projectId": 2,
  "projectName": "Q3 Product Podcast",
  "recordingTitle": "Ep. 14",
  "startMs": 252000,
  "endMs": 293000,
  "status": "ready",
  "subtitleStyle": "bold_mint",
  "ratio": "9:16"
}
```

Map to mock `ClipSummary` in the UI: `projectLabel` ← `projectName` + `recordingTitle`; `range` / `duration` ← `startMs`/`endMs`; `subtitled` ← `Boolean(subtitleStyle)`; `id` ← `String(id)` only if the router still wants strings.

### Clip filters — `GET /api/clips/filters`

```json
[
  { "id": "all", "label": "All", "count": 128 },
  { "id": "ready", "label": "Ready", "count": 119 },
  { "id": "rendering", "label": "Rendering", "count": 6 },
  { "id": "failed", "label": "Failed", "count": 3 },
  { "id": "ratio_9_16", "label": "9:16", "count": 90 },
  { "id": "subtitled", "label": "Subtitled", "count": 80 }
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
    "failedJobCount": 0
  }
]
```

`jobStatus`: `running` \| `failed` \| `idle`. `kbScope`: `global` \| `recording` \| `null`.

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
4. POST create / generate / download URLs are still **501** — do not wire those buttons to live calls yet.

---

## Out of scope

Reading the JWT, `Authorization` headers, Redis, signed clip download URLs, or PyAI from the browser. Filestack upload stays on the client; only the CDN URL is POSTed to the API.
