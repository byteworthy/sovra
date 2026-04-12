import { randomBytes, createHash } from 'crypto'

export interface GeneratedApiKey {
  raw: string
  hash: string
  prefix: string
}

export function generateApiKey(): GeneratedApiKey {
  const raw = 'bsk_' + randomBytes(32).toString('base64url')
  const prefix = raw.slice(0, 12)
  const hash = createHash('sha256').update(raw).digest('hex')
  return { raw, hash, prefix }
}
