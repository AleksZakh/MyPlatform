export const EXPORT_KINDS = ['reestr', 'samplingReport', 'materialPassp', 'testProtocol'] as const
export type ExportKind = typeof EXPORT_KINDS[number]
export type ExportStatus = 'PREPARING' | 'AWAITING_CONFIRMATION' | 'QUEUED' | 'RUNNING' | 'READY' | 'FAILED' | 'CANCELLED'
export const EXPORT_COLUMNS = [
  ['id', 'ID Space', 'number'],
  ['plp.name', 'ПЛП', 'text'],
  ['testLocation.testObject.name', 'Наименование объекта', 'text'],
  ['samplingActNumber', 'Номер акта отбора проб', 'text'],
  ['samplingDate', 'Дата отбора проб', 'date'],
  ['samplingDocumentPath', 'Акт отбора проб', 'document'],
  ['testLocation.name', 'Место отбора проб', 'text'],
  ['inspector.name', 'Лицо, предоставившее пробу', 'text'],
  ['note', 'Примечание (акт)', 'text'],
  ['receiptMaterial.material.name', 'Материал', 'text'],
  ['receiptMaterial.receiptDate', 'Дата поступления материала', 'date'],
  ['receiptMaterial.qualityDocumentDate', 'Дата документа о качестве', 'date'],
  ['receiptMaterial.qualityDocumentNumber', 'Номер документа о качестве', 'text'],
  ['receiptMaterial.qualityDocumentPath', 'Документ о качестве', 'document'],
  ['receiptMaterial.manufacturer.name', 'Предприятие-изготовитель', 'text'],
  ['receiptMaterial.note', 'Примечание (поступление)', 'text'],
  ['testProtocol.protocolNumber', 'Номер протокола', 'text'],
  ['testProtocol.protocolDate', 'Дата протокола', 'date'],
  ['testProtocol.protocolDocumentPath', 'Протокол испытаний', 'document'],
  ['testProtocol.testResult', 'Результат испытаний', 'text'],
  ['testProtocol.note', 'Примечание (протокол)', 'text'],
  ['createdAt', 'Дата создания записи', 'date'],
  ['authorEmail', 'Автор записи', 'text'],
  ['editedAt', 'Дата изменения записи', 'date'],
  ['editorEmail', 'Автор изменения', 'text'],
] as const
export interface ExportJobView {
  id: string
  createdAt: string
  snapshotAt?: string
  expiresAt: string
  status: ExportStatus
  kinds: ExportKind[]
  hasFilter: boolean
  filterDescription: string[]
  total: number
  processed: number
  documents: number
  bytes: number
  packed: number
  warnings: number
  archiveBytes?: number
  error?: string
}
