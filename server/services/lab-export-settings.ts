import { createError } from 'h3'
import { prisma } from '../utils/prisma'

export function validateExportLimit(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 10000) {
    throw createError({ statusCode: 400, message: 'Лимит должен быть целым числом от 1 до 10 000.' })
  }
  return value
}
export function assertExportRecordLimit(total: number, limit: number): void {
  if (total > limit) throw createError({ statusCode: 400,
    message: `В выборке более ${limit} записей. Максимум для одной выгрузки — ${limit}. Сузьте выборку в «Настройке фильтра».` })
}
export async function getExportRecordLimit(): Promise<number> {
  const settings = await prisma.labExportSettings.findUnique({ where: { id: 1 } })
  return validateExportLimit(settings?.recordLimit ?? 500)
}
