import { create } from 'zustand';
import editorProjectSeed from '@/fixtures/editor-project.json';

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

export type EditorVideoState = {
  currentTime: number;
  duration: number;
  seekEpoch: number;
  playing: boolean;
  src: string;
};

type EditorStore = {
  video: EditorVideoState;
  project: EditorProject | null;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setPlaying: (playing: boolean) => void;
  setSrc: (src: string) => void;
  seek: (time: number) => void;
  resetVideo: () => void;
  setProject: (project: EditorProject | null) => void;
  setProjectStatus: (status: string) => void;
  setProjectResult: (result: EditorProjectResult | null) => void;
  resetProject: () => void;
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

export const SEEDED_VIDEO_SRC = encodeURI(
  '/Lee Harris on Global Unrest Spiritual Awakening and Reclaiming Faith in Turbulent Times - Video.mp4',
);

const emptyVideo = (duration = 0, src = SEEDED_VIDEO_SRC): EditorVideoState => ({
  currentTime: 0,
  duration,
  seekEpoch: 0,
  playing: false,
  src,
});

export const useEditorStore = create<EditorStore>((set, get) => ({
  video: emptyVideo(seededProject.result?.audio_seconds ?? 0),
  project: seededProject,

  setCurrentTime: (time) => {
    const { duration } = get().video;
    set((state) => ({
      video: { ...state.video, currentTime: clampTime(time, duration) },
    }));
  },

  setDuration: (duration) => {
    if (!Number.isFinite(duration) || duration < 0) {
      return;
    }

    set((state) => ({
      video: { ...state.video, duration: Math.max(state.video.duration, duration) },
    }));
  },

  setPlaying: (playing) => {
    set((state) => ({
      video: { ...state.video, playing },
    }));
  },

  setSrc: (src) => {
    set((state) => ({
      video: { ...state.video, src },
    }));
  },

  seek: (time) => {
    const { duration } = get().video;
    set((state) => ({
      video: {
        ...state.video,
        currentTime: clampTime(time, duration),
        seekEpoch: state.video.seekEpoch + 1,
      },
    }));
  },

  resetVideo: () => {
    const duration = get().project?.result?.audio_seconds ?? 0;
    const src = get().video.src || SEEDED_VIDEO_SRC;
    set({ video: emptyVideo(duration, src) });
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

  resetEditor: () => {
    set({
      video: emptyVideo(),
      project: null,
    });
  },
}));
