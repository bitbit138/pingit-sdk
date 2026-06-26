import type { ProfileId } from './profiles';
import type { MeasuredResult } from './results';

/** How the SDK persists measurement history (PRD §7). */
export enum HistoryMode {
  /** Keep nothing. */
  NONE = 'NONE',
  /** Keep only the most recent result on the device (default). */
  LAST_LOCAL = 'LAST_LOCAL',
  /** Send every result to our server for trends. */
  SERVER_HISTORY = 'SERVER_HISTORY',
}

/** Result of `isReadyFor(profile)` — pass/fail + the human reason. */
export interface ReadinessResult {
  profile: ProfileId;
  passed: boolean;
  /** "ok" when passed; otherwise e.g. "latency too high" / "no connection". */
  reason: string;
  /** null when offline (no measurement was possible). */
  measured: MeasuredResult | null;
}
