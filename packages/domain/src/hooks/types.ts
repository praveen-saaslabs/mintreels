export interface Hook {
  id: number;
  recordingId: number;
  title: string;
  rationale: string;
  startMs: number;
  endMs: number;
  score?: number;
}
