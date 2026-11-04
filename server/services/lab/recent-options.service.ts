import type { Prisma } from '@prisma/client'
import { normalizePreferences } from '../../../shared/utils/user-preferences'
import { rememberLabOptions, type LabRecentKey } from '../../../shared/utils/lab-recent-options'

/** Runs in the registry transaction. The lock matches concurrent profile settings writes. */
export async function rememberLabSelection(
  tx: Prisma.TransactionClient,
  userId: number,
  selection: Partial<Record<LabRecentKey, string>>,
) {
  await tx.$queryRaw`SELECT id FROM app_users WHERE id = ${userId} FOR UPDATE`
  const row = await tx.userPreference.findUnique({ where: { userId } })
  const preferences = normalizePreferences(row?.data)
  const data = { ...preferences, labRecent: rememberLabOptions(preferences.labRecent, selection) }
  await tx.userPreference.upsert({ where: { userId }, create: { userId, data }, update: { data } })
}
