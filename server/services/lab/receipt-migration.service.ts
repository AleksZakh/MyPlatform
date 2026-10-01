import type { Prisma } from '@prisma/client'
export const receiptMigrationSelect = {
  id: true, receiptDate: true, qualityDocumentDate: true, qualityDocumentNumber: true,
  qualityDocumentPath: true, editedAt: true, materialId: true, manufacturerId: true,
  material: { select: { name: true } }, manufacturer: { select: { name: true } },
  samplingTest: { select: { id: true, deletedAt: true, samplingActNumber: true, samplingDate: true, testLocationId: true,
    testLocation: { select: { name: true, testObject: { select: { name: true } } } } } },
} satisfies Prisma.ReceiptMaterialSelect
export function receiptMigrationDto(row: Prisma.ReceiptMaterialGetPayload<{ select: typeof receiptMigrationSelect }>) {
  return { id: row.id, receiptDate: row.receiptDate?.toISOString().slice(0, 10) ?? null,
    qualityDocumentDate: row.qualityDocumentDate?.toISOString().slice(0, 10) ?? null,
    qualityDocumentNumber: row.qualityDocumentNumber, qualityDocumentPath: row.qualityDocumentPath,
    materialName: row.material.name, manufacturerName: row.manufacturer?.name ?? null,
    samplingActNumber: row.samplingTest?.samplingActNumber ?? null,
    canStore: !!row.samplingTest && row.samplingTest.deletedAt === null }
}
export function receiptStorageSegment(value: string): string {
  return value.normalize('NFC').replace(/[\/\\?%*:|"<>\x00-\x1f\x7f]/g, '_')
    .replace(/\s+/g, '_').replace(/^\.+|\.+$/g, '').slice(0, 50) || 'unnamed'
}
