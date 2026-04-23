const DEFAULT_REDIRECT_PATH = '/onboarding'
const REDIRECT_PARSE_ORIGIN = 'https://sovra.example'
const REDIRECT_PARSE_HOST = 'sovra.example'

export function sanitizeRedirectPath(
  raw: string | null | undefined,
  fallback = DEFAULT_REDIRECT_PATH
): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) {
    return fallback
  }

  try {
    const url = new URL(raw, REDIRECT_PARSE_ORIGIN)
    if (url.host !== REDIRECT_PARSE_HOST) {
      return fallback
    }

    return `${url.pathname}${url.search}`
  } catch {
    return fallback
  }
}

export function appendNextParam(path: string, nextPath: string): string {
  const safeNext = sanitizeRedirectPath(nextPath)
  const url = new URL(path, REDIRECT_PARSE_ORIGIN)
  url.searchParams.set('next', safeNext)
  return `${url.pathname}${url.search}`
}

export function buildAuthCallbackUrl(origin: string, nextPath: string): string {
  const safeNext = sanitizeRedirectPath(nextPath)
  const callbackUrl = new URL('/auth/callback', origin)
  callbackUrl.searchParams.set('next', safeNext)
  return callbackUrl.toString()
}
