import { describe, expect, it } from 'vitest'
// @ts-expect-error plain JS module shared with the build script
import { securityHeaders } from '../scripts/security-policy.mjs'

type Headers = Record<string, string>
const policy = (base?: string) => securityHeaders(base) as { production: Headers; local: Headers }

describe('security headers', () => {
  it('lock the page down', () => {
    const csp = policy().production['Content-Security-Policy']!
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("base-uri 'self'")
    expect(csp).not.toContain('unsafe-eval')
    expect(policy().production['X-Frame-Options']).toBe('DENY')
    expect(policy().production['Strict-Transport-Security']).toMatch(/max-age=\d{8}/)
  })

  it('allow an HTTPS data host in production', () => {
    const csp = policy('https://data.example.org/x').production['Content-Security-Policy']!
    expect(csp).toContain('https://data.example.org')
  })

  it('never let a local http data server into production files', () => {
    const { production, local } = policy('http://localhost:4100')
    expect(production['Content-Security-Policy']).not.toContain('localhost')
    expect(local['Content-Security-Policy']).toContain('http://localhost:4100')
    expect(local).not.toHaveProperty('Strict-Transport-Security')
  })

  it('ignore a malformed data URL', () => {
    expect(policy('not a url').production['Content-Security-Policy']).not.toContain('not a url')
  })
})
