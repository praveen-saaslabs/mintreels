export interface Hook {
  id: string;
  recordingId: string;
  title: string;
  rationale: string;
  startMs: number;
  endMs: number;
  score?: number;
}
