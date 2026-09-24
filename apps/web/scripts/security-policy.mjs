// The security policy as data, with no side effects (unit-tested in test/security.test.ts).

/** The origin of a data base URL, or null for same-origin or a malformed value. */
export function originOf(url) {
  try {
    return url ? new URL(url).origin : null
  } catch {
    return null
  }
}

/** Headers for production hosts, and for local previews (plain http, a local data server). */
export function securityHeaders(dataBase) {
  const dataOrigin = originOf(dataBase)
  const connect = [
    "'self'",
    'https://huggingface.co',
    'https://*.huggingface.co',
    'https://*.hf.co',
    'https://api.web3forms.com',
  ]
  // Production allows only HTTPS hosts; an http data server (npm run data:serve) is local-only.
  if (dataOrigin?.startsWith('https://') && !connect.includes(dataOrigin)) connect.push(dataOrigin)
  const csp = (sources, upgrade) =>
    [
      "default-src 'self'",
      // Next.js inlines its hydration data and the theme script; a static export can't nonce
      // them, and hashes differ on every page. No user content is ever rendered as HTML.
      "script-src 'self' 'unsafe-inline'",
      // Motion and the charts set inline styles.
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      `connect-src ${sources.join(' ')}`,
      "worker-src 'self'",
      "manifest-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      ...(upgrade ? ['upgrade-insecure-requests'] : []),
    ].join('; ')
  const common = {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'X-Frame-Options': 'DENY',
  }
  const localSources =
    dataOrigin && !dataOrigin.startsWith('https://') ? [...connect, dataOrigin] : connect
  return {
    production: {
      'Content-Security-Policy': csp(connect, true),
      ...common,
      'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
    },
    // Local previews run on http://localhost, where HSTS and the upgrade don't apply.
    local: { 'Content-Security-Policy': csp(localSources, false), ...common },
  }
}
