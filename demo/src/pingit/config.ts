// Endpoint + appId resolution that works in the browser (Vite `import.meta.env`)
// and in Node (the smoke script reads `process.env`). Defaults make the demo
// zero-config against a locally-seeded server (`app_demo` is created by the seed).
const g = globalThis as unknown as { process?: { env?: Record<string, string | undefined> } };

function readEnv(viteKey: string, nodeKey: string): string | undefined {
  const viteEnv = typeof import.meta !== 'undefined' ? (import.meta as { env?: Record<string, string> }).env : undefined;
  return viteEnv?.[viteKey] ?? g.process?.env?.[nodeKey];
}

export const PINGIT_ENDPOINT = readEnv('VITE_PINGIT_ENDPOINT', 'PINGIT_ENDPOINT') ?? 'http://localhost:8080';
export const PINGIT_APP_ID = readEnv('VITE_PINGIT_APP_ID', 'PINGIT_APP_ID') ?? 'app_demo';
