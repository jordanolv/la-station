/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DISCORD_CLIENT_ID: string
  readonly API_URL: string
  // autres variables d'environnement...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
} 