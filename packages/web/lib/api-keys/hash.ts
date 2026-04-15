import { pbkdf2Sync } from 'crypto'

const DEV_FALLBACK_SECRET = 'dev-only-api-key-hash-secret-change-me'
const PBKDF2_ITERATIONS = 210_000
const PBKDF2_OUTPUT_BYTES = 32
const PBKDF2_HASH_ALGORITHM = 'sha256'

function getApiKeyHashSecret(): string {
  const secret = process.env.API_KEY_HASH_SECRET
  if (secret && secret.length >= 32) {
    return secret
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'API_KEY_HASH_SECRET must be set to at least 32 characters in production'
    )
  }

  return secret || DEV_FALLBACK_SECRET
}

export function hashApiKey(rawKey: string): string {
  return pbkdf2Sync(
    rawKey,
    getApiKeyHashSecret(),
    PBKDF2_ITERATIONS,
    PBKDF2_OUTPUT_BYTES,
    PBKDF2_HASH_ALGORITHM
  ).toString('hex')
}
