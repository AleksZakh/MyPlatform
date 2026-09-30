import type { Prisma } from '@prisma/client'

export const protocolMigrationSelect = {
  id: true, protocolNumber: true, protocolDate: true, testResult: true,
  protocolDocumentPath: true, editedAt: true,
  samplingTest: { select: {
    id: true, deletedAt: true, samplingDate: true, testLocationId: true,
    testLocation: { select: { name: true, testObject: { select: { name: true } } } },
  } },
} satisfies Prisma.TestProtocolSelect
export type MigrationProtocol = Prisma.TestProtocolGetPayload<{ select: typeof protocolMigrationSelect }>
export function protocolMigrationDto(row: MigrationProtocol) {
  return {
    id: row.id, protocolNumber: row.protocolNumber,
    protocolDate: row.protocolDate?.toISOString().slice(0, 10) ?? null,
    testResult: row.testResult, protocolDocumentPath: row.protocolDocumentPath,
    canStore: !!row.samplingTest && row.samplingTest.deletedAt === null,
  }
}
export function protocolDocumentFormat(bytes: Buffer): 'pdf' | 'jpg' | null {
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg'
  if (bytes.subarray(0, 1024).includes(Buffer.from('%PDF-'))) return 'pdf'
  return null
}
export function protocolStorageSegment(value: string): string {
  return value.normalize('NFC').replace(/[\/\\?%*:|"<>\x00-\x1f\x7f]/g, '_')
    .replace(/\s+/g, '_').replace(/^\.+|\.+$/g, '').slice(0, 50) || 'unnamed'
}
