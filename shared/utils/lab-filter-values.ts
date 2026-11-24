import type { ITableFilter } from '../../types/tableFilter'

export const LAB_FACET_KEYS = ['plp', 'objName', 'sPlace', 'sProvaider', 'materialName', 'manufacturer'] as const
export type LabFacetKey = typeof LAB_FACET_KEYS[number]
export type LabFacetOptions = Record<LabFacetKey, string[]>
export const LAB_FILTER_TEXT_KEYS = [
  'plp', 'objName', 'samplActNumber', 'sDateStart', 'sDateEnd', 'sPlace', 'sProvaider',
  'receiveDateStart', 'receiveDateEnd', 'qualiDateStart', 'qualiDateEnd', 'qualiDocNumber',
  'manufacturer', 'testReportDataStart', 'testReportDataEnd', 'testResult', 'testProtocolNumber',
] as const
export const LAB_FILTER_DATE_PAIRS = [
  ['sDateStart', 'sDateEnd', 'Дата отбора'],
  ['receiveDateStart', 'receiveDateEnd', 'Дата поступления'],
  ['qualiDateStart', 'qualiDateEnd', 'Дата документа о качестве'],
  ['testReportDataStart', 'testReportDataEnd', 'Дата протокола'],
] as const

export function materialFilterValues(value: unknown): string[] {
  const source = Array.isArray(value) ? value : typeof value === 'string' ? [value] : []
  return [...new Set(source.filter((v): v is string => typeof v === 'string').map(v => v.trim()).filter(Boolean))]
}

/** Clone templates/drafts; retain legacy substring filters until the user reselects a value. */
export function normalizeLabFilters(value: unknown = {}): ITableFilter {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
  const result = Object.fromEntries(LAB_FILTER_TEXT_KEYS.map(key => [key,
    typeof source[key] === 'string' ? source[key].trim() || null : null,
  ])) as Record<typeof LAB_FILTER_TEXT_KEYS[number], string | null>
  const materials = materialFilterValues(source.materialName)
  const exact = Array.isArray(source.exactFields) ? source.exactFields : []
  return {
    ...result,
    materialName: materials.length ? (Array.isArray(source.materialName) ? materials : materials[0]!) : null,
    exactFields: LAB_FACET_KEYS.filter(key => key !== 'materialName' && exact.includes(key)),
  }
}

export function labFilterDateError(filters: ITableFilter): string {
  for (const [startKey, endKey, label] of LAB_FILTER_DATE_PAIRS) {
    const start = filters[startKey], end = filters[endKey]
    for (const date of [start, end]) {
      if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) {
        return `${label}: укажите корректную дату.`
      }
    }
    if (start && end && start > end) return `${label}: начало периода не может быть позже окончания.`
  }
  return ''
}

export function hasLabFilterValue(value: unknown): boolean {
  return Array.isArray(value) ? value.length > 0 : typeof value === 'string' ? value.trim().length > 0 : false
}
export function emptyLabFacetOptions(): LabFacetOptions {
  return { plp: [], objName: [], sPlace: [], sProvaider: [], materialName: [], manufacturer: [] }
}
