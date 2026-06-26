/** Raw output of a single measurement run (device-side `runTest()`). */
export interface MeasuredResult {
  downloadMbps: number;
  uploadMbps: number;
  latencyMs: number;
  jitterMs: number;
  packetLossPct: number;
  score?: number;
  label?: string;
  /** ISO-8601 timestamp (device clock). */
  timestamp: string;
}

/** Body accepted by POST /results (no server-assigned fields). */
export interface ResultSubmission {
  appId: string;
  deviceId: string;
  downloadMbps: number;
  uploadMbps: number;
  latencyMs: number;
  jitterMs: number;
  packetLossPct: number;
  score?: number;
}

/** A stored row returned by GET /results — server-stamped. */
export interface ResultRecord extends ResultSubmission {
  id: number;
  /** ISO-8601, server time. */
  createdAt: string;
}
