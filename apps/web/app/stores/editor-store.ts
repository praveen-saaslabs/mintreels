import { create } from 'zustand';
import editorHooksSeed from '@/fixtures/editor-hooks.json';
import editorProjectSeed from '@/fixtures/editor-project.json';
import { DEMO_MEDIA } from '@/lib/demo-media';

export type EditorWord = {
  word: string;
  start: number;
  end: number;
  speaker: string;
};

export type EditorSegment = {
  id: number;
  start: number;
  end: number;
  text: string;
  speaker: string;
};

export type EditorProjectResult = {
  text: string;
  words: EditorWord[];
  formats: {
    srt: string;
    vtt: string;
  };
  segments: EditorSegment[];
  speakers: number;
  audio_seconds: number;
};

export type EditorProject = {
  job_id: string;
  status: string;
  created_at: number;
  updated_at: number;
  result: EditorProjectResult | null;
};

export type EditorHookStatus = 'ready' | 'rendering' | 'queued' | 'failed';

/** Export / player framing presets — matches ClipRatio. */
export type EditorAspectRatio = '9:16' | '1:1' | '16:9';

/**
 * Export framing. UI always sends `'fit'` (full frame + blur pad).
 * `'fill'` remains in the API schema for a later crop iteration — not exposed.
 */
export type EditorFitMode = 'fit' | 'fill';

export const EDITOR_ASPECT_PRESETS: EditorAspectRatio[] = ['9:16', '1:1', '16:9'];

export const DEFAULT_EDITOR_ASPECT: EditorAspectRatio = '9:16';

/** Only framing the UI uses today. */
export const DEFAULT_EDITOR_FIT_MODE: EditorFitMode = 'fit';

export type EditorHook = {
  id: string;
  label: string;
  title: string;
  start: number;
  end: number;
  ratio: EditorAspectRatio;
  status: EditorHookStatus;
  score?: number;
  clipId?: number;
  clipVideoUrl?: string;
};

export type EditorVideoState = {
  currentTime: number;
  duration: number;
  seekEpoch: number;
  playing: boolean;
  src: string;
};

type EditorStore = {
  video: EditorVideoState;
  /** Shared HTMLVideoElement for wavesurfer MediaElement sync. */
  mediaElement: HTMLVideoElement | null;
  /** Player aspect + default for cut-clip export. Preview is always Fit (blur). */
  playerAspect: EditorAspectRatio;
  /** Player caption overlay on/off — also defaults Cut clip burn-in. */
  playerCaptionsOn: boolean;
  /** Fit blur pad under the player (second video). Off improves playback performance. */
  playerBlurBackdrop: boolean;
  project: EditorProject | null;
  hooks: EditorHook[];
  selectedHookId: string | null;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setPlaying: (playing: boolean) => void;
  setMediaElement: (element: HTMLVideoElement | null) => void;
  setSrc: (src: string) => void;
  setPlayerAspect: (aspect: EditorAspectRatio) => void;
  setPlayerCaptionsOn: (on: boolean) => void;
  setPlayerBlurBackdrop: (on: boolean) => void;
  seek: (time: number) => void;
  resetVideo: () => void;
  setProject: (project: EditorProject | null) => void;
  setProjectStatus: (status: string) => void;
  setProjectResult: (result: EditorProjectResult | null) => void;
  patchSegmentText: (segmentId: number, text: string) => void;
  resetProject: () => void;
  setHooks: (hooks: EditorHook[]) => void;
  patchHook: (id: string, patch: Partial<EditorHook>) => void;
  clearHookClip: (id: string) => void;
  selectHook: (id: string | null) => void;
  selectHookAndSeek: (id: string) => void;
  resetEditor: () => void;
};

function clampTime(time: number, duration: number): number {
  if (!Number.isFinite(time)) {
    return 0;
  }

  const bounded = Math.max(0, time);
  if (duration > 0) {
    return Math.min(duration, bounded);
  }

  return bounded;
}

const seededProject = editorProjectSeed as EditorProject;
const seededHooks = editorHooksSeed as EditorHook[];

export const SEEDED_VIDEO_SRC = DEMO_MEDIA.videoUrl;

const PLAYER_BLUR_BACKDROP_KEY = 'mintreels.player.blurBackdrop';

function readPlayerBlurBackdrop(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }
  try {
    const raw = window.localStorage.getItem(PLAYER_BLUR_BACKDROP_KEY);
    if (raw === '0' || raw === 'false') {
      return false;
    }
    if (raw === '1' || raw === 'true') {
      return true;
    }
  } catch {
    // Private mode / blocked storage — keep default on.
  }
  return true;
}

function writePlayerBlurBackdrop(on: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(PLAYER_BLUR_BACKDROP_KEY, on ? '1' : '0');
  } catch {
    // Ignore quota / private mode failures.
  }
}

const emptyVideo = (duration = 0, src: string = SEEDED_VIDEO_SRC): EditorVideoState => ({
  currentTime: 0,
  duration,
  seekEpoch: 0,
  playing: false,
  src,
});

export const useEditorStore = create<EditorStore>((set, get) => ({
  video: emptyVideo(seededProject.result?.audio_seconds ?? 0),
  mediaElement: null,
  playerAspect: DEFAULT_EDITOR_ASPECT,
  playerCaptionsOn: true,
  playerBlurBackdrop: readPlayerBlurBackdrop(),
  project: seededProject,
  hooks: seededHooks,
  selectedHookId: null,

  setCurrentTime: (time) => {
    const { duration, currentTime } = get().video;
    const nextTime = clampTime(time, duration);
    if (nextTime === currentTime) {
      return;
    }

    set((state) => ({
      video: { ...state.video, currentTime: nextTime },
    }));
  },

  setDuration: (duration) => {
    if (!Number.isFinite(duration) || duration <= 0) {
      return;
    }

    const nextDuration = Math.max(get().video.duration, duration);
    if (nextDuration === get().video.duration) {
      return;
    }

    set((state) => ({
      video: { ...state.video, duration: nextDuration },
    }));
  },

  setPlaying: (playing) => {
    if (get().video.playing === playing) {
      return;
    }

    set((state) => ({
      video: { ...state.video, playing },
    }));
  },

  setMediaElement: (element) => {
    if (get().mediaElement === element) {
      return;
    }

    set({ mediaElement: element });
  },

  setSrc: (src) => {
    if (get().video.src === src) {
      return;
    }

    set((state) => ({
      video: { ...state.video, src },
    }));
  },

  setPlayerAspect: (aspect) => {
    if (get().playerAspect === aspect) {
      return;
    }
    set({ playerAspect: aspect });
  },

  setPlayerCaptionsOn: (on) => {
    if (get().playerCaptionsOn === on) {
      return;
    }
    set({ playerCaptionsOn: on });
  },

  setPlayerBlurBackdrop: (on) => {
    if (get().playerBlurBackdrop === on) {
      return;
    }
    writePlayerBlurBackdrop(on);
    set({ playerBlurBackdrop: on });
  },

  seek: (time) => {
    const { duration } = get().video;
    const nextTime = clampTime(time, duration);
    const { selectedHookId, hooks } = get();
    const selectedHook = selectedHookId
      ? hooks.find((item) => item.id === selectedHookId)
      : undefined;
    const keepSelectedHook =
      selectedHook !== undefined && nextTime >= selectedHook.start && nextTime <= selectedHook.end;

    set((state) => ({
      selectedHookId: keepSelectedHook ? state.selectedHookId : null,
      video: {
        ...state.video,
        currentTime: nextTime,
        seekEpoch: state.video.seekEpoch + 1,
      },
    }));
  },

  resetVideo: () => {
    const duration = get().project?.result?.audio_seconds ?? 0;
    const src = get().video.src || SEEDED_VIDEO_SRC;
    set({ video: emptyVideo(duration, src), selectedHookId: null });
  },

  setProject: (project) => {
    set({ project });
  },

  setProjectStatus: (status) => {
    const { project } = get();
    if (!project) {
      return;
    }

    set({
      project: {
        ...project,
        status,
        updated_at: Date.now(),
      },
    });
  },

  setProjectResult: (result) => {
    const { project } = get();
    if (!project) {
      return;
    }

    set({
      project: {
        ...project,
        result,
        updated_at: Date.now(),
      },
    });
  },

  patchSegmentText: (segmentId, text) => {
    const { project } = get();
    if (!project?.result) {
      return;
    }
    set({
      project: {
        ...project,
        updated_at: Date.now(),
        result: {
          ...project.result,
          segments: project.result.segments.map((segment) =>
            segment.id === segmentId ? { ...segment, text } : segment,
          ),
        },
      },
    });
  },

  resetProject: () => {
    set({ project: null });
  },

  setHooks: (hooks) => {
    set({ hooks, selectedHookId: null });
  },

  patchHook: (id, patch) => {
    set((state) => ({
      hooks: state.hooks.map((hook) => (hook.id === id ? { ...hook, ...patch } : hook)),
    }));
  },

  clearHookClip: (id) => {
    set((state) => ({
      hooks: state.hooks.map((hook) => {
        if (hook.id !== id) {
          return hook;
        }
        const { clipId: _clipId, clipVideoUrl: _clipVideoUrl, ...rest } = hook;
        return { ...rest, status: 'ready' };
      }),
    }));
  },

  selectHook: (id) => {
    set({ selectedHookId: id });
  },

  selectHookAndSeek: (id) => {
    const hook = get().hooks.find((item) => item.id === id);
    if (!hook) {
      return;
    }

    const { duration } = get().video;
    set((state) => ({
      selectedHookId: id,
      video: {
        ...state.video,
        currentTime: clampTime(hook.start, duration),
        seekEpoch: state.video.seekEpoch + 1,
      },
    }));
  },

  resetEditor: () => {
    set({
      video: emptyVideo(),
      mediaElement: null,
      playerAspect: DEFAULT_EDITOR_ASPECT,
      playerCaptionsOn: true,
      project: null,
      hooks: [],
      selectedHookId: null,
    });
  },
}));
