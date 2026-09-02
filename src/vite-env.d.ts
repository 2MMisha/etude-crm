/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GITHUB_OWNER?: string;
  readonly VITE_DATA_REPO?: string;
  /** Shared write token for DATA_REPO, baked in at build time — see src/lib/github/config.ts. */
  readonly VITE_GITHUB_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
