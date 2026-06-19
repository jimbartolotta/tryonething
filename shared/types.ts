// Shared types for Try One Thing

/** Stages of the Commit → Track → Gauge → Verdict → Bank methodology */
export type CycleStage = "commit" | "track" | "gauge" | "verdict" | "bank";

/** The honest verdict options at cycle end */
export type Verdict = "keep" | "drop" | "modify";

/** A single change cycle */
export interface ChangeCycle {
  id: string;
  coachId: string;
  clientId: string;
  change: string; // exactly one change per cycle
  stage: CycleStage;
  verdict: Verdict | null;
  createdAt: string;
  completedAt: string | null;
}

/** API response envelope */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}