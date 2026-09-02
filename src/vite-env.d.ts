/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GITHUB_OWNER?: string;
  readonly VITE_DATA_REPO?: string;
  readonly VITE_INBOX_REPO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
