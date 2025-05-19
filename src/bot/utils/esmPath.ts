// src/utils/esmPath.ts
import { fileURLToPath } from 'url'
import { dirname } from 'path'

export function createESMPath(metaUrl: string) {
  const __filename = fileURLToPath(metaUrl)
  const __dirname = dirname(__filename)
  return { __filename, __dirname }
}
