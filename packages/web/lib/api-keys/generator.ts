import { randomBytes } from 'crypto'
import { hashApiKey } from './hash'

export interface GeneratedApiKey {
  raw: string
  hash: string
  prefix: string
}

export function generateApiKey(): GeneratedApiKey {
  const raw = 'bsk_' + randomBytes(32).toString('base64url')
  const prefix = raw.slice(0, 12)
  const hash = hashApiKey(raw)
  return { raw, hash, prefix }
}
