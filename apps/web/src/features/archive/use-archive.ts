'use client'

import { useQuery } from '@tanstack/react-query'
import { catalogQuery, recordsQuery, seasonArchiveQuery } from '@/lib/data'

export function useCatalog() {
  return useQuery(catalogQuery())
}

export function useRecords() {
  return useQuery(recordsQuery())
}

export function useSeasonArchive(year: number | undefined) {
  return useQuery({ ...seasonArchiveQuery(year ?? 0), enabled: year != null && year > 0 })
}

export { DECADES, eraLabel, eraRange } from '@/lib/era'
