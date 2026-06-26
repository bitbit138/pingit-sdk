/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API base origin; empty string in dev (Vite proxy handles forwarding). */
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
