import LZString from '../vendor/lz-string.js'
import { normalizeLabFilters } from './lab-filter-values'

/** Shared by the Pinia cookie and every server-side registry/export reader. */
export function serializeLabFilterState(state: Record<string, unknown>): string {
  return 'lz1.' + LZString.compressToEncodedURIComponent(JSON.stringify(state))
}
export function deserializeLabFilterState(raw: string): Record<string, unknown> {
  try {
    if (raw.length > 16384) return {}
    const decoded = raw.startsWith('lz1.') ? LZString.decompressFromEncodedURIComponent(raw.slice(4)) : raw
    if (!decoded || decoded.length > 65536) return {}
    const state = JSON.parse(decoded)
    if (!state || typeof state !== 'object' || Array.isArray(state)) return {}
    return { ...state, filter: normalizeLabFilters(state.filter) }
  } catch { return {} }
}
