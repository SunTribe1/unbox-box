import { describe, expect, it } from 'vitest'
// @ts-expect-error plain JS module shared with the build script
import {
  VIEW_SLUGS,
  redirectsFile,
  serveRewrites,
  vercelRewrites,
} from '../scripts/host-routes.mjs'
import { VIEW_SLUG } from '../src/lib/routes'

describe('host rewrites', () => {
  it('cover every view', () => {
    expect([...(VIEW_SLUGS as string[])].sort()).toEqual(Object.values(VIEW_SLUG).sort())
  })

  it('send deep paths to the view page on every host', () => {
    expect(vercelRewrites()).toContainEqual({
      source: '/duel/:path+',
      destination: '/duel/',
    })
    expect(redirectsFile()).toContain('/races/*  /races/index.html  200\n')
    expect(serveRewrites()).toContainEqual({
      source: '/nations/**',
      destination: '/nations/index.html',
    })
  })
})
