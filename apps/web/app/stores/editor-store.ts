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

export type EditorHook = {
  id: string;
  label: string;
  title: string;
  start: number;
  end: number;
  ratio: '9:16' | '1:1' | '16:9';
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
  project: EditorProject | null;
  hooks: EditorHook[];
  selectedHookId: string | null;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setPlaying: (playing: boolean) => void;
  setMediaElement: (element: HTMLVideoElement | null) => void;
  setSrc: (src: string) => void;
  seek: (time: number) => void;
  resetVideo: () => void;
  setProject: (project: EditorProject | null) => void;
  setProjectStatus: (status: string) => void;
  setProjectResult: (result: EditorProjectResult | null) => void;
  resetProject: () => void;
  setHooks: (hooks: EditorHook[]) => void;
  patchHook: (id: string, patch: Partial<EditorHook>) => void;
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

  seek: (time) => {
    const { duration } = get().video;
    const nextTime = clampTime(time, duration);
    const { selectedHookId, hooks } = get();
    const selectedHook = selectedHookId
      ? hooks.find((item) => item.id === selectedHookId)
      : undefined;
    const keepSelectedHook =
      selectedHook !== undefined &&
      nextTime >= selectedHook.start &&
      nextTime <= selectedHook.end;

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
      project: null,
      hooks: [],
      selectedHookId: null,
    });
  },
}));
