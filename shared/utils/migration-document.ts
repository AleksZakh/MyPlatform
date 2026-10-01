import { inflateRawSync } from 'node:zlib'
export type MigrationDocument = { extension: 'pdf' | 'jpg' | 'png' | 'webp' | 'xlsx'; mime: string }
/** Bounded OPC package inspection, without extracting any archive paths to disk. */
function isXlsx(bytes: Buffer): boolean {
  try {
    let end = -1
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
      if (bytes.readUInt32LE(i) === 0x06054b50 && i + 22 + bytes.readUInt16LE(i + 20) === bytes.length) { end = i; break }
    }
    if (end < 0 || bytes.readUInt16LE(end + 4) || bytes.readUInt16LE(end + 6)) return false
    const count = bytes.readUInt16LE(end + 10), size = bytes.readUInt32LE(end + 12), start = bytes.readUInt32LE(end + 16)
    if (!count || count > 10000 || count !== bytes.readUInt16LE(end + 8) || start + size !== end) return false
    const entries = new Map<string, { offset: number; compressed: number; length: number; method: number }>()
    let at = start, total = 0
    for (let i = 0; i < count; i++) {
      if (at + 46 > end || bytes.readUInt32LE(at) !== 0x02014b50) return false
      const flags = bytes.readUInt16LE(at + 8), method = bytes.readUInt16LE(at + 10)
      const compressed = bytes.readUInt32LE(at + 20), length = bytes.readUInt32LE(at + 24)
      const n = bytes.readUInt16LE(at + 28), extra = bytes.readUInt16LE(at + 30), comment = bytes.readUInt16LE(at + 32)
      const offset = bytes.readUInt32LE(at + 42)
      if (flags & 1 || ![0, 8].includes(method) || at + 46 + n + extra + comment > end) return false
      const name = bytes.subarray(at + 46, at + 46 + n).toString('utf8')
      if (!name || /[\\\x00]/.test(name) || name.startsWith('/') || name.split('/').includes('..') || entries.has(name)) return false
      if (/vbaproject|macrosheets|activex/i.test(name)) return false
      total += length
      if (total > 200 * 1024 * 1024 || offset + 30 > start) return false
      entries.set(name, { offset, compressed, length, method })
      at += 46 + n + extra + comment
    }
    if (at !== end || !entries.has('_rels/.rels') || ![...entries.keys()].some(n => /^xl\/worksheets\/[^/]+\.xml$/.test(n))) return false
    const xml = (name: string): string => {
      const entry = entries.get(name)
      if (!entry || entry.length > 1024 * 1024) throw new Error('XML size')
      const { offset, compressed, length, method } = entry
      if (bytes.readUInt32LE(offset) !== 0x04034b50 || bytes.readUInt16LE(offset + 8) !== method) throw new Error('ZIP header')
      const from = offset + 30 + bytes.readUInt16LE(offset + 26) + bytes.readUInt16LE(offset + 28)
      if (from + compressed > start) throw new Error('ZIP bounds')
      const input = bytes.subarray(from, from + compressed)
      const content = method === 0 ? input : inflateRawSync(input, { maxOutputLength: 1024 * 1024 })
      if (content.length !== length) throw new Error('ZIP size')
      const result = content.toString('utf8')
      if (/<!DOCTYPE|<!ENTITY/i.test(result)) throw new Error('XML entity')
      return result
    }
    const types = xml('[Content_Types].xml')
    return /<Override\b(?=[^>]*\bPartName=["']\/xl\/workbook\.xml["'])(?=[^>]*\bContentType=["']application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet\.main\+xml["'])[^>]*\/?\s*>/.test(types)
      && /<(?:[\w]+:)?workbook\b/.test(xml('xl/workbook.xml'))
  } catch { return false }
}
/** Structural check for still-image WebP, not a complete bitstream decoder.
 * Reference: https://developers.google.com/speed/webp/docs/riff_container
 */
function isWebp(bytes: Buffer): boolean {
  if (bytes.length < 26 || bytes.toString('ascii', 0, 4) !== 'RIFF'
    || bytes.toString('ascii', 8, 12) !== 'WEBP' || bytes.readUInt32LE(4) + 8 !== bytes.length) return false
  let at = 12, images = 0, chunks = 0
  let canvas: { width: number; height: number } | undefined
  while (at < bytes.length) {
    if (++chunks > 10000 || at + 8 > bytes.length) return false
    const kind = bytes.toString('ascii', at, at + 4), size = bytes.readUInt32LE(at + 4)
    const start = at + 8, end = start + size, next = end + (size & 1)
    if (next > bytes.length || ((size & 1) && bytes[end] !== 0)) return false
    if (chunks === 1 && !['VP8 ', 'VP8L', 'VP8X'].includes(kind)) return false
    if (kind === 'ANIM' || kind === 'ANMF') return false
    if (kind === 'VP8X') {
      if (chunks !== 1 || size !== 10 || (bytes[start]! & 0xc3) || bytes[start + 1] || bytes[start + 2] || bytes[start + 3]) return false
      canvas = { width: bytes.readUIntLE(start + 4, 3) + 1, height: bytes.readUIntLE(start + 7, 3) + 1 }
    }
    if (kind === 'VP8 ' || kind === 'VP8L') {
      if (++images !== 1) return false
      let width: number, height: number
      if (kind === 'VP8 ') {
        if (size < 10 || (bytes[start]! & 1) || bytes[start + 3] !== 0x9d || bytes[start + 4] !== 0x01 || bytes[start + 5] !== 0x2a) return false
        width = bytes.readUInt16LE(start + 6) & 0x3fff
        height = bytes.readUInt16LE(start + 8) & 0x3fff
      } else {
        if (size < 5 || bytes[start] !== 0x2f) return false
        const bits = bytes.readUInt32LE(start + 1)
        if (bits >>> 29) return false
        width = (bits & 0x3fff) + 1
        height = ((bits >>> 14) & 0x3fff) + 1
      }
      if (!width || !height || (canvas && (canvas.width !== width || canvas.height !== height))) return false
    }
    at = next
  }
  return at === bytes.length && images === 1
}
export function detectMigrationDocument(bytes: Buffer): MigrationDocument | null {
  if (bytes.length > 50 * 1024 * 1024) return null
  if (bytes.toString('ascii', 0, 4) === 'RIFF') return isWebp(bytes) ? { extension: 'webp', mime: 'image/webp' } : null
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { extension: 'jpg', mime: 'image/jpeg' }
  if (bytes.subarray(0, 1024).includes(Buffer.from('%PDF-'))) return { extension: 'pdf', mime: 'application/pdf' }
  if (bytes.length >= 33 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    && bytes.readUInt32BE(8) === 13 && bytes.toString('ascii', 12, 16) === 'IHDR'
    && bytes.readUInt32BE(16) > 0 && bytes.readUInt32BE(20) > 0) return { extension: 'png', mime: 'image/png' }
  if (bytes.length >= 22 && bytes.readUInt32LE(0) === 0x04034b50 && isXlsx(bytes)) {
    return { extension: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
  }
  return null
}
