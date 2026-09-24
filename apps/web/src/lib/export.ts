/** CSV export and file download, shared by every view's "Download CSV". */

export type Cell = string | number | null | undefined

/** Cells that a spreadsheet would run as a formula get a leading quote (CSV injection).
 *  A minus sign counts only when it isn't a negative number. */
function neutralise(text: string): string {
  if (/^[=+@\t\r]/.test(text) || /^-(?![\d.])/.test(text)) return `'${text}`
  return text
}

function cell(value: Cell): string {
  if (value == null) return ''
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : ''
  const text = neutralise(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** RFC 4180 CSV with CRLF line endings. */
export function toCsv(header: string[], rows: Cell[][]): string {
  return [header, ...rows].map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n'
}

function downloadFile(filename: string, content: BlobPart, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadCsv(filename: string, header: string[], rows: Cell[][]): void {
  // BOM so Excel opens UTF-8 names (Pérez, Hülkenberg) correctly.
  downloadFile(filename, `﻿${toCsv(header, rows)}`, 'text/csv;charset=utf-8')
}
