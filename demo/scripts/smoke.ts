// Runs the demo's SDK-mirror client against the LIVE server (Node, via tsx).
// Proves the demo↔server path and prints a readiness table for the real
// connection and a simulated weak one. Usage: `npm run smoke` (server must be up).
import { PingItClient } from '../src/pingit/client';
import { evaluate } from '../src/pingit/evaluate';
import type { Metrics, ProfileId, ProfileTable } from '../src/pingit/types';

const HUB: ProfileId[] = ['MESSAGING', 'VIDEO_CALL', 'HD_STREAMING', 'CLOUD_GAMING', 'LARGE_UPLOAD'];
const WEAK: Metrics = { downloadMbps: 0.8, uploadMbps: 0.2, latencyMs: 320, jitterMs: 55, packetLossPct: 0 };

function printTable(profiles: ProfileTable, metrics: Metrics, title: string): void {
  console.log(
    `\n[${title}]  ${metrics.downloadMbps.toFixed(1)} down / ${metrics.uploadMbps.toFixed(1)} up Mbps, ${metrics.latencyMs.toFixed(0)} ms`,
  );
  for (const id of HUB) {
    const spec = profiles.profiles.find((p) => p.id === id);
    if (!spec) {
      console.log(`  ${id.padEnd(16)} (no profile)`);
      continue;
    }
    const v = evaluate(spec.requires, metrics);
    console.log(`  ${id.padEnd(16)} ${v.passed ? 'ready' : 'blocked: ' + v.reason}`);
  }
}

async function main(): Promise<void> {
  const client = new PingItClient();
  console.log(`PingIt demo smoke → ${client.endpoint} (appId ${client.appId})`);

  const profiles = await client.getProfiles();
  if (!profiles.profiles?.length) throw new Error('no profiles returned from /profiles');
  console.log(`profiles: version ${profiles.version}, ${profiles.profiles.length} entries`);

  const measured = await client.runTest();
  console.log(`live measurement: score ${measured.score}/100 (${measured.label})`);

  printTable(profiles, measured, 'This connection');
  printTable(profiles, WEAK, 'Weak (sim)');

  await client.postResult(measured, 'smoke-demo-device');
  console.log('\nposted result to /results');
  console.log('\nSMOKE OK');
}

main().catch((e: unknown) => {
  console.error('SMOKE FAILED:', (e as Error).message);
  process.exit(1);
});
