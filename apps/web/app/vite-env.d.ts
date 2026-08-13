/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_TARGET?: string;
  /** Public Filestack API key for browser uploads only — never APP_SECRET. */
  readonly VITE_FILESTACK_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
