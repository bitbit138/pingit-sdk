import type { ProfileId } from '../pingit/types';

export interface Feature {
  id: string;
  profile: ProfileId;
  /** Short text tag shown in the tile badge. */
  tag: string;
  title: string;
  blurb: string;
  actionLabel: string;
  /** Shown when the connection is ready for this action. */
  readyMsg: string;
  /** Casual, in-context fallback when it isn't ready. */
  notReadyMsg: string;
}

/** The everyday actions on the hub screen, each gated by its readiness profile. */
export const FEATURES: Feature[] = [
  {
    id: 'chat',
    profile: 'MESSAGING',
    tag: 'MSG',
    title: 'Messages',
    blurb: 'Send a quick note to Sam',
    actionLabel: 'Send',
    readyMsg: 'Message sent.',
    notReadyMsg: "You're offline — we'll send it when you're back.",
  },
  {
    id: 'call',
    profile: 'VIDEO_CALL',
    tag: 'VID',
    title: 'Video call',
    blurb: 'Call Alex face-to-face',
    actionLabel: 'Start video call',
    readyMsg: 'Connecting your video call...',
    notReadyMsg: 'Connection looks shaky — start audio-only instead?',
  },
  {
    id: 'stream',
    profile: 'HD_STREAMING',
    tag: 'HD',
    title: 'Watch',
    blurb: "Stream tonight's episode",
    actionLabel: 'Play in HD',
    readyMsg: 'Playing in HD.',
    notReadyMsg: "Switching to SD so it doesn't keep buffering.",
  },
  {
    id: 'game',
    profile: 'CLOUD_GAMING',
    tag: 'PLAY',
    title: 'Cloud gaming',
    blurb: 'Jump into a game stream',
    actionLabel: 'Launch game',
    readyMsg: 'Launching your game...',
    notReadyMsg: "Latency's too high for smooth play right now.",
  },
  {
    id: 'backup',
    profile: 'LARGE_UPLOAD',
    tag: 'SYNC',
    title: 'Photo backup',
    blurb: 'Back up 248 new photos',
    actionLabel: 'Back up now',
    readyMsg: 'Backing up 248 photos...',
    notReadyMsg: "Upload's slow — back up later on Wi-Fi?",
  },
];
