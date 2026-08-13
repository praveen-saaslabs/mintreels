import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  ApiError,
  api,
  type RecordingProcessingSnapshot,
  type RecordingSummary,
  type TranscriptResponse,
} from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import {
  useEditorStore,
  type EditorHook,
  type EditorSegment,
  type EditorWord,
} from '@/stores/editor-store';

const POLL_MS = 5000;

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

function pickPlaybackUrl(...candidates: unknown[]): string | null {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && isHttpsFilestackPlaybackUrl(candidate)) {
      return candidate;
    }
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

function mapPublicTranscriptToEditor(transcript: TranscriptResponse): {
  text: string;
  words: EditorWord[];
  formats: { srt: string; vtt: string };
  segments: EditorSegment[];
  speakers: number;
  audio_seconds: number;
} {
  const segments = transcript.segments.map((segment) => ({
    id: segment.id,
    start: segment.start,
    end: segment.end,
    text: segment.text,
    speaker: segment.speaker?.trim() || '?',
  }));
  const words = (transcript.words ?? []).map((word) => ({
    word: word.word,
    start: word.start,
    end: word.end,
    speaker: word.speaker?.trim() || '?',
  }));
  const durationFromSegments =
    segments.length > 0 ? Math.max(...segments.map((segment) => segment.end)) : 0;

  return {
    text: transcript.text ?? '',
    words,
    formats: {
      srt: transcript.formats?.srt ?? '',
      vtt: transcript.formats?.vtt ?? '',
    },
    segments,
    speakers:
      transcript.speakers > 0
        ? transcript.speakers
        : new Set(segments.map((segment) => segment.speaker)).size,
    audio_seconds: transcript.audio_seconds ?? durationFromSegments,
  };
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

function injectTranscript(recordingId: number, transcript: TranscriptResponse) {
  ensureEditorProject(recordingId, 'processing');
  const project = useEditorStore.getState().project;
  if (!project) {
    return;
  }
  const previous = project.result ?? emptyEditorResult();
  const mapped = mapPublicTranscriptToEditor(transcript);
  useEditorStore.getState().setProject({
    ...project,
    updated_at: Date.now(),
    result: {
      ...previous,
      ...mapped,
      audio_seconds: mapped.audio_seconds > 0 ? mapped.audio_seconds : previous.audio_seconds,
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
    if (snapshot.transcript && snapshot.transcript.segments.length > 0) {
      injectTranscript(recordingId, snapshot.transcript);
    }
    try {
      const transcript = await api.getTranscript(recordingId);
      injectTranscript(recordingId, transcript);
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

  // Inject playback URL as soon as we have it (navigate state, recording, or poll).
  useEffect(() => {
    const playbackUrl = pickPlaybackUrl(
      locationMediaUrl,
      recordingsQuery.data?.videoUrl,
      processingQuery.data?.videoUrl,
    );
    if (!playbackUrl) {
      return;
    }
    if (videoSrc === playbackUrl) {
      return;
    }
    setSrc(playbackUrl);
  }, [
    locationMediaUrl,
    recordingsQuery.data?.videoUrl,
    processingQuery.data?.videoUrl,
    videoSrc,
    setSrc,
  ]);

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

    const { transcript, hooks } = editorDataQuery.data;
    const mapped = transcript ? mapPublicTranscriptToEditor(transcript) : emptyEditorResult();

    setProject({
      job_id: String(recordingId),
      status: 'ready',
      created_at: Date.now(),
      updated_at: Date.now(),
      result: mapped,
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

  const audioUrl =
    pickPlaybackUrl(recordingsQuery.data?.audioUrl, processingQuery.data?.audioUrl) ?? '';

  return {
    phase,
    recordingId,
    recordingTitle: recordingsQuery.data?.title ?? '',
    processing: processingQuery.data,
    videoSrc,
    audioUrl,
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
