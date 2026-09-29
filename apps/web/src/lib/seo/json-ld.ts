import type { HistoryConstructor, HistoryDriver, HistoryIndex } from '@unbox-box/tools'
import { OG_IMAGE, REPO_URL, SITE_URL } from '../site'

/** schema.org structured data (JSON-LD), so search engines know what each page is about. */

export type JsonLd = Record<string, unknown>

type Circuit = HistoryIndex['circuits'][number]

const CONTEXT = 'https://schema.org'
const SPORT = 'Formula 1'

/** Absolute URLs only: schema.org links need them, so without a site URL they are left out. */
const url = (path: string | null) => (SITE_URL && path ? { url: `${SITE_URL}${path}` } : {})

const compact = (o: JsonLd): JsonLd =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v != null && v !== ''))

/** The home page: the site and the app. */
export function siteLd(description: string): JsonLd[] {
  return [
    compact({
      '@context': CONTEXT,
      '@type': 'WebSite',
      name: 'Unbox Box',
      ...url('/'),
      description,
      inLanguage: 'en-GB',
    }),
    compact({
      '@context': CONTEXT,
      '@type': 'WebApplication',
      name: 'Unbox Box',
      ...url('/'),
      description,
      applicationCategory: 'SportsApplication',
      operatingSystem: 'Any (web browser)',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'GBP' },
      featureList: [
        'F1 telemetry lap comparison',
        'Race replay with live timing',
        'Tyre strategy and pit stop analysis',
        'Every Formula 1 result since 1950',
        'Driver, team and circuit statistics',
      ],
      ...(SITE_URL && { image: `${SITE_URL}${OG_IMAGE.url}` }),
      sameAs: [REPO_URL],
    }),
  ]
}

export function breadcrumbs(items: { name: string; path: string }[]): JsonLd {
  return {
    '@context': CONTEXT,
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) =>
      compact({
        '@type': 'ListItem',
        position: i + 1,
        name: item.name,
        ...(SITE_URL && { item: `${SITE_URL}${item.path}` }),
      }),
    ),
  }
}

function circuitPlace(c: Circuit): JsonLd {
  return compact({
    '@type': 'Place',
    name: c.fullName ?? c.name,
    address: compact({
      '@type': 'PostalAddress',
      addressLocality: c.place,
      addressCountry: c.code,
    }),
    ...(c.lat != null &&
      c.lng != null && { geo: { '@type': 'GeoCoordinates', latitude: c.lat, longitude: c.lng } }),
  })
}

export function sportsEventLd(e: {
  name: string
  date: string | null
  path: string | null
  circuit?: Circuit
  circuitName?: string
}): JsonLd {
  return compact({
    '@context': CONTEXT,
    '@type': 'SportsEvent',
    name: e.name,
    sport: SPORT,
    startDate: e.date,
    location: e.circuit
      ? circuitPlace(e.circuit)
      : e.circuitName && { '@type': 'Place', name: e.circuitName },
    ...url(e.path),
  })
}

export function personLd(d: HistoryDriver, path: string): JsonLd {
  return {
    '@context': CONTEXT,
    '@type': 'ProfilePage',
    ...url(path),
    mainEntity: compact({
      '@type': 'Person',
      name: d.name,
      givenName: d.firstName,
      familyName: d.lastName,
      birthDate: d.dob,
      deathDate: d.dod,
      birthPlace: d.birthplace,
      nationality: d.nationality,
      jobTitle: 'Formula 1 driver',
    }),
  }
}

export function teamLd(t: HistoryConstructor, path: string): JsonLd {
  return compact({
    '@context': CONTEXT,
    '@type': 'SportsTeam',
    name: t.fullName ?? t.name,
    alternateName: t.fullName && t.fullName !== t.name ? t.name : null,
    sport: SPORT,
    ...url(path),
  })
}

export function placeLd(c: Circuit, path: string): JsonLd {
  return {
    ...circuitPlace(c),
    '@context': CONTEXT,
    '@type': ['Place', 'SportsActivityLocation'],
    ...url(path),
  }
}

/** JSON-LD for a <script> tag. "<" is escaped so no value can close the tag early. */
export const jsonLdHtml = (ld: JsonLd | JsonLd[]) => JSON.stringify(ld).replace(/</g, '\\u003c')
