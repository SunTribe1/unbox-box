/** Removes diacritics ("Pérez" → "Perez") and keeps case, so "São Paulo" matches "Sao Paulo". */
export function stripAccents(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '')
}
