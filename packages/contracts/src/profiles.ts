import type { Requires } from './metrics';

/** The 10 curated readiness profiles (PRD §5). Order is canonical. */
export const PROFILE_IDS = [
  'MESSAGING',
  'WEB_BROWSING',
  'MUSIC_STREAMING',
  'VOICE_CALL',
  'VIDEO_CALL',
  'HD_STREAMING',
  'UHD_4K_STREAMING',
  'CLOUD_GAMING',
  'LIVE_BROADCAST',
  'LARGE_UPLOAD',
] as const;

export type ProfileId = (typeof PROFILE_IDS)[number];

/** One row of the `profiles` table / one entry of GET /profiles. */
export interface Profile {
  id: ProfileId;
  requires: Requires;
}

/** Shape of GET /profiles — a global version + the profile list. */
export interface ProfilesResponse {
  version: number;
  profiles: Profile[];
}
