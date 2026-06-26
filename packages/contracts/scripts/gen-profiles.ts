/**
 * Emits the canonical profiles to two places from the single source
 * (src/seed.ts):
 *   1. packages/contracts/dist/profiles.json   (published artifact)
 *   2. sdk-android/core/src/main/resources/profiles.json  (Android bundled defaults)
 *
 * Run via `pnpm gen:profiles` (also runs at the end of `pnpm build`).
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CANONICAL_PROFILES, SEED_VERSION } from '../src/seed';
import { profilesResponseSchema } from '../src/schemas';

const here = dirname(fileURLToPath(import.meta.url)); // packages/contracts/scripts
const payload = { version: SEED_VERSION, profiles: CANONICAL_PROFILES };

// Fail loudly if the seed is malformed.
profilesResponseSchema.parse(payload);

const json = JSON.stringify(payload, null, 2) + '\n';
const targets = [
  resolve(here, '../dist/profiles.json'),
  resolve(here, '../../../sdk-android/core/src/main/resources/profiles.json'),
];

for (const target of targets) {
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, json);
  console.log('wrote', target);
}
