export const LAB_RECENT_KEYS = ['plp', 'object', 'location', 'material', 'manufacturer', 'inspector'] as const
export type LabRecentKey = typeof LAB_RECENT_KEYS[number]
export type LabRecentOptions = Partial<Record<LabRecentKey, string[]>>
const LIMIT = 50

/** Only names in the current catalog are returned; history cannot restore deleted entries. */
export function sortLabOptions(items: readonly string[], recent: readonly string[] = []): string[] {
  const rank = new Map(recent.map((name, index) => [name, index]))
  return [...new Set(items)].sort((a, b) =>
    (rank.get(a) ?? Infinity) - (rank.get(b) ?? Infinity) || a.localeCompare(b, 'ru'),
  )
}

export function rememberLabOptions(previous: LabRecentOptions, selection: Partial<Record<LabRecentKey, string>>): LabRecentOptions {
  const next = { ...previous }
  for (const key of LAB_RECENT_KEYS) {
    const name = selection[key]?.trim()
    if (name) next[key] = [name, ...(previous[key] ?? []).filter(item => item !== name)].slice(0, LIMIT)
  }
  return next
}
