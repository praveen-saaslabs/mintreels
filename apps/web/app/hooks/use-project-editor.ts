import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  ApiError,
  api,
  type RecordingProcessingSnapshot,
  type RecordingSummary,
} from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import {
  useEditorStore,
  type EditorHook,
  type EditorSegment,
  type EditorWord,
} from '@/stores/editor-store';

const POLL_MS = 3000;

export type EditorLocationState = {
  recordingId?: number;
  /** Filestack CDN URL from upload; enables playback before GET recording returns. */
  mediaUrl?: string;
};

function isHttpsFilestackPlaybackUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:') {
      return false;
    }
    if (parsed.hostname === 'cdn.filestackcontent.com') {
      return parsed.pathname.length > 1;
    }
    if (parsed.hostname === 'www.filestackapi.com') {
      return /^\/api\/file\/[^/]+/.test(parsed.pathname);
    }
    return false;
  } catch {
    return false;
  }
}

function pickPlaybackUrl(
  locationMediaUrl: unknown,
  recordingUrl: string | null | undefined,
): string | null {
  if (typeof locationMediaUrl === 'string' && isHttpsFilestackPlaybackUrl(locationMediaUrl)) {
    return locationMediaUrl;
  }
  if (typeof recordingUrl === 'string' && isHttpsFilestackPlaybackUrl(recordingUrl)) {
    return recordingUrl;
  }
  return null;
}

function isTerminalProcessing(snapshot: RecordingProcessingSnapshot): boolean {
  if (snapshot.status === 'ready' || snapshot.status === 'failed') {
    return true;
  }
  const jobStatus = snapshot.job?.status;
  return jobStatus === 'success' || jobStatus === 'failed' || jobStatus === 'partial';
}

function pickRecordingForProject(
  recordings: RecordingSummary[],
  projectId: number,
): RecordingSummary | undefined {
  const matches = recordings.filter((recording) => recording.projectId === projectId);
  if (matches.length === 0) {
    return undefined;
  }
  return [...matches].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )[0];
}

function mapSegmentsToEditor(
  segments: Array<{
    id: number;
    startMs: number;
    endMs: number;
    speaker: string | null;
    text: string;
  }>,
): EditorSegment[] {
  return segments.map((segment) => ({
    id: segment.id,
    start: segment.startMs / 1000,
    end: segment.endMs / 1000,
    text: segment.text,
    speaker: segment.speaker?.trim() || '?',
  }));
}

function mapHooksToEditor(
  hooks: Array<{
    id: number;
    title: string;
    hook: string;
    startMs: number;
    endMs: number;
    score: number | null;
  }>,
): EditorHook[] {
  return hooks.map((hook) => ({
    id: String(hook.id),
    label: hook.hook,
    title: hook.title,
    start: hook.startMs / 1000,
    end: hook.endMs / 1000,
    ratio: '9:16',
    status: 'ready',
    ...(hook.score != null ? { score: hook.score } : {}),
  }));
}

function emptyEditorResult(): {
  text: string;
  words: EditorWord[];
  formats: { srt: string; vtt: string };
  segments: EditorSegment[];
  speakers: number;
  audio_seconds: number;
} {
  return {
    text: '',
    words: [],
    formats: { srt: '', vtt: '' },
    segments: [],
    speakers: 0,
    audio_seconds: 0,
  };
}

function normalizeStepKey(step: string): string {
  return step.trim().toUpperCase().replace(/[\s-]+/g, '_');
}

function stepMatches(step: string, ...needles: string[]): boolean {
  const key = normalizeStepKey(step);
  return needles.some((needle) => {
    const candidate = normalizeStepKey(needle);
    return key === candidate || key.includes(candidate) || candidate.includes(key);
  });
}

function ensureEditorProject(recordingId: number, status: string) {
  const state = useEditorStore.getState();
  if (state.project?.job_id === String(recordingId)) {
    return;
  }
  state.setProject({
    job_id: String(recordingId),
    status,
    created_at: Date.now(),
    updated_at: Date.now(),
    result: emptyEditorResult(),
  });
}

function injectTranscript(recordingId: number, segments: EditorSegment[]) {
  ensureEditorProject(recordingId, 'processing');
  const project = useEditorStore.getState().project;
  if (!project) {
    return;
  }
  const durationSec =
    segments.length > 0 ? Math.max(...segments.map((segment) => segment.end)) : 0;
  const previous = project.result ?? emptyEditorResult();
  useEditorStore.getState().setProject({
    ...project,
    updated_at: Date.now(),
    result: {
      ...previous,
      segments,
      speakers: new Set(segments.map((segment) => segment.speaker)).size,
      audio_seconds: durationSec > 0 ? durationSec : previous.audio_seconds,
    },
  });
}

function injectSummaryText(recordingId: number, text: string) {
  ensureEditorProject(recordingId, 'processing');
  const project = useEditorStore.getState().project;
  if (!project) {
    return;
  }
  const previous = project.result ?? emptyEditorResult();
  useEditorStore.getState().setProject({
    ...project,
    updated_at: Date.now(),
    result: {
      ...previous,
      text,
    },
  });
}

function collectNewlyCompletedSteps(
  snapshot: RecordingProcessingSnapshot,
  prev: Map<string, string>,
): string[] {
  const newlyCompleted: string[] = [];
  const next = new Map<string, string>();

  for (const step of snapshot.steps) {
    const key = normalizeStepKey(step.step);
    next.set(key, step.status);
    if (step.status === 'completed' && prev.get(key) !== 'completed') {
      newlyCompleted.push(step.step);
    }
  }

  prev.clear();
  for (const [key, status] of next) {
    prev.set(key, status);
  }
  return newlyCompleted;
}

async function applyCompletedStepInjections(
  recordingId: number,
  snapshot: RecordingProcessingSnapshot,
  newlyCompleted: string[],
  setHooks: (hooks: EditorHook[]) => void,
): Promise<void> {
  const needsTranscript = newlyCompleted.some((step) =>
    stepMatches(step, 'TRANSCRIPTION', 'TRANSCRIPTION_PERSIST'),
  );
  const needsSummary = newlyCompleted.some((step) => stepMatches(step, 'SUMMARY'));
  const needsHooks = newlyCompleted.some((step) =>
    stepMatches(step, 'HOOKS', 'CLIP_RECOMMENDATIONS'),
  );
  const needsAudioMeta = newlyCompleted.some((step) =>
    stepMatches(step, 'AUDIO_EXTRACTION', 'AUDIO_UPLOAD', 'AUDIO'),
  );
  // Action items: no dedicated panel yet — skipped.

  if (needsTranscript) {
    try {
      const transcript = await api.getTranscript(recordingId);
      injectTranscript(recordingId, mapSegmentsToEditor(transcript.segments));
    } catch {
      // Persist may still be in flight; next completed step or ready bundle will retry.
    }
  }

  if (needsSummary) {
    if (snapshot.summary?.text) {
      injectSummaryText(recordingId, snapshot.summary.text);
    }
    try {
      const summary = await api.getSummary(recordingId);
      injectSummaryText(recordingId, summary.text);
    } catch {
      // Ignore until ready-bundle sync.
    }
  }

  if (needsHooks) {
    if (snapshot.hooks.length > 0) {
      setHooks(mapHooksToEditor(snapshot.hooks));
    }
    try {
      const hooks = await api.getHooks(recordingId);
      setHooks(mapHooksToEditor(hooks));
    } catch {
      // Ignore until ready-bundle sync.
    }
  }

  if (needsAudioMeta) {
    try {
      await api.getRecording(recordingId);
      // Playback URL is not exposed on GET recording; metadata refresh only.
    } catch {
      // Non-fatal.
    }
  }
}

export type ProjectEditorPhase =
  | 'resolving'
  | 'processing'
  | 'ready'
  | 'failed'
  | 'missing'
  | 'error';

export function useProjectEditor(projectId: number | undefined) {
  const location = useLocation();
  const locationState = (location.state as EditorLocationState | null) ?? null;
  const locationRecordingId = locationState?.recordingId;
  const locationMediaUrl = locationState?.mediaUrl;
  const resetEditor = useEditorStore((state) => state.resetEditor);
  const setProject = useEditorStore((state) => state.setProject);
  const setHooks = useEditorStore((state) => state.setHooks);
  const setSrc = useEditorStore((state) => state.setSrc);
  const videoSrc = useEditorStore((state) => state.video.src);
  const prevStepStatusRef = useRef<Map<string, string>>(new Map());
  const hydratedRecordingRef = useRef<number | undefined>(undefined);

  const recordingsQuery = useQuery({
    queryKey: queryKeys.recordings.forProject(projectId ?? 0),
    enabled: projectId !== undefined,
    queryFn: async () => {
      if (projectId === undefined) {
        throw new Error('Missing project id');
      }

      if (
        typeof locationRecordingId === 'number' &&
        Number.isInteger(locationRecordingId) &&
        locationRecordingId > 0
      ) {
        try {
          const recording = await api.getRecording(locationRecordingId);
          if (recording.projectId === projectId) {
            return recording;
          }
        } catch (err) {
          if (!(err instanceof ApiError && err.status === 404)) {
            throw err;
          }
        }
      }

      const recordings = await api.getRecordings();
      const match = pickRecordingForProject(recordings, projectId);
      if (!match) {
        return null;
      }
      return match;
    },
  });

  const recordingId = recordingsQuery.data?.id;
  const recordingStatus = recordingsQuery.data?.status;

  const processingQuery = useQuery({
    queryKey: queryKeys.recordings.processing(recordingId ?? 0),
    enabled: recordingId !== undefined,
    queryFn: () => api.getRecordingProcessing(recordingId as number),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) {
        return POLL_MS;
      }
      return isTerminalProcessing(data) ? false : POLL_MS;
    },
  });

  const phase: ProjectEditorPhase = useMemo(() => {
    if (projectId === undefined) {
      return 'error';
    }
    if (recordingsQuery.isLoading) {
      return 'resolving';
    }
    if (recordingsQuery.isError) {
      return 'error';
    }
    if (recordingsQuery.data === null) {
      return 'missing';
    }
    if (processingQuery.isError) {
      return 'error';
    }

    const snapshot = processingQuery.data;
    if (!snapshot) {
      if (recordingStatus === 'ready') {
        return 'ready';
      }
      if (recordingStatus === 'failed') {
        return 'failed';
      }
      return 'processing';
    }

    if (snapshot.status === 'failed' || snapshot.job?.status === 'failed') {
      return 'failed';
    }
    if (
      snapshot.status === 'ready' ||
      snapshot.job?.status === 'success' ||
      snapshot.job?.status === 'partial'
    ) {
      return 'ready';
    }
    return 'processing';
  }, [
    projectId,
    recordingsQuery.isLoading,
    recordingsQuery.isError,
    recordingsQuery.data,
    processingQuery.isError,
    processingQuery.data,
    recordingStatus,
  ]);

  const editorDataQuery = useQuery({
    queryKey: [...queryKeys.recordings.detail(recordingId ?? 0), 'editor-bundle'] as const,
    enabled: phase === 'ready' && recordingId !== undefined,
    queryFn: async () => {
      const id = recordingId as number;
      const [transcriptResult, summaryResult, hooksResult] = await Promise.allSettled([
        api.getTranscript(id),
        api.getSummary(id),
        api.getHooks(id),
      ]);

      const transcript =
        transcriptResult.status === 'fulfilled' ? transcriptResult.value : null;

      let summary: { text: string } | null = null;
      if (summaryResult.status === 'fulfilled') {
        summary = summaryResult.value;
      } else if (processingQuery.data?.summary) {
        summary = { text: processingQuery.data.summary.text };
      }

      const hooks =
        hooksResult.status === 'fulfilled'
          ? hooksResult.value
          : (processingQuery.data?.hooks ?? []);

      return { transcript, summary, hooks };
    },
  });

  useEffect(() => {
    if (projectId === undefined) {
      return;
    }
    resetEditor();
    setSrc('');
    prevStepStatusRef.current = new Map();
    hydratedRecordingRef.current = undefined;
  }, [projectId, resetEditor, setSrc]);

  // Seed an empty project shell as soon as we know the recording so panes can render.
  useEffect(() => {
    if (recordingId === undefined) {
      return;
    }
    if (hydratedRecordingRef.current === recordingId) {
      return;
    }
    let shellStatus = 'processing';
    if (phase === 'ready') {
      shellStatus = 'ready';
    } else if (phase === 'failed') {
      shellStatus = 'failed';
    }
    ensureEditorProject(recordingId, shellStatus);
    hydratedRecordingRef.current = recordingId;
  }, [recordingId, phase]);

  // Inject playback URL as soon as we have it (navigate state or GET recording.url).
  useEffect(() => {
    const playbackUrl = pickPlaybackUrl(locationMediaUrl, recordingsQuery.data?.url);
    if (!playbackUrl) {
      return;
    }
    if (videoSrc === playbackUrl) {
      return;
    }
    setSrc(playbackUrl);
  }, [locationMediaUrl, recordingsQuery.data?.url, videoSrc, setSrc]);

  // Diff processing steps → refetch & inject into editor store as each completes.
  useEffect(() => {
    const snapshot = processingQuery.data;
    if (!snapshot || recordingId === undefined) {
      return;
    }

    const newlyCompleted = collectNewlyCompletedSteps(snapshot, prevStepStatusRef.current);
    if (newlyCompleted.length === 0) {
      return;
    }

    void applyCompletedStepInjections(recordingId, snapshot, newlyCompleted, setHooks);
  }, [processingQuery.data, recordingId, setHooks]);

  useEffect(() => {
    if (phase !== 'ready' || !editorDataQuery.data || recordingId === undefined) {
      return;
    }

    const { transcript, summary, hooks } = editorDataQuery.data;
    const segments = transcript ? mapSegmentsToEditor(transcript.segments) : [];
    const durationSec =
      segments.length > 0 ? Math.max(...segments.map((segment) => segment.end)) : 0;

    setProject({
      job_id: String(recordingId),
      status: 'ready',
      created_at: Date.now(),
      updated_at: Date.now(),
      result: {
        text: summary?.text ?? '',
        words: [],
        formats: { srt: '', vtt: '' },
        segments,
        speakers: new Set(segments.map((segment) => segment.speaker)).size,
        audio_seconds: durationSec,
      },
    });
    setHooks(mapHooksToEditor(hooks));
  }, [phase, editorDataQuery.data, recordingId, setProject, setHooks]);

  const errorMessage = useMemo(() => {
    if (recordingsQuery.error instanceof ApiError) {
      return recordingsQuery.error.status === 401
        ? 'Your session expired. Sign in again.'
        : recordingsQuery.error.code;
    }
    if (recordingsQuery.error instanceof Error) {
      return recordingsQuery.error.message;
    }
    if (processingQuery.error instanceof ApiError) {
      return processingQuery.error.status === 401
        ? 'Your session expired. Sign in again.'
        : processingQuery.error.code;
    }
    if (processingQuery.error instanceof Error) {
      return processingQuery.error.message;
    }
    if (phase === 'failed') {
      return (
        processingQuery.data?.job?.errorMessage ||
        'Ingest failed. Check the job status and try uploading again.'
      );
    }
    if (phase === 'missing') {
      return 'No recording found for this project.';
    }
    return null;
  }, [recordingsQuery.error, processingQuery.error, processingQuery.data, phase]);

  return {
    phase,
    recordingId,
    processing: processingQuery.data,
    videoSrc,
    summaryText:
      editorDataQuery.data?.summary?.text ?? processingQuery.data?.summary?.text ?? '',
    isHydratingEditor: phase === 'ready' && editorDataQuery.isLoading,
    errorMessage,
    refetch: () => {
      void recordingsQuery.refetch();
      void processingQuery.refetch();
    },
  };
}
