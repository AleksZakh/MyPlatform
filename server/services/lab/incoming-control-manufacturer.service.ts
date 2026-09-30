import { AccessAction, type Manufacturer, type Prisma } from '@prisma/client'
import { createError, type H3Event } from 'h3'
import { requirePermission } from '~~/server/services/access-control.service'
import { auditDataChange, buildCreateAuditDelta } from '~~/server/utils/auditLog'

const RESOURCE_KEY = 'lab.manufacturers'

/** Called only inside the registry SAVE transaction, after edit-lock checks. */
export async function resolveIncomingControlManufacturer(options: {
  event: H3Event
  tx: Prisma.TransactionClient
  rawName: string | null | undefined
  actorEmail: string
}): Promise<Manufacturer | null> {
  const { event, tx, actorEmail } = options
  const name = (options.rawName ?? '').trim()
  if (!name) return null
  if (name.includes('\u0000')) {
    throw createError({ statusCode: 400, statusMessage: 'INVALID_MANUFACTURER_NAME', message: 'Название содержит недопустимый символ.' })
  }

  async function findExisting(): Promise<Manufacturer | null> {
    const matches = await tx.manufacturer.findMany({
      where: { name: { equals: name, mode: 'insensitive' } },
      orderBy: { id: 'asc' },
    })
    const active = matches.filter(row => row.deletedAt === null)
    // Preserve an explicit choice when historical case variants already exist.
    const exact = active.find(row => row.name === name)
    if (exact) return exact
    if (active.length === 1) return active[0]!
    if (active.length > 1) {
      throw createError({ statusCode: 409, statusMessage: 'MANUFACTURER_NAME_AMBIGUOUS', message: 'Найдено несколько производителей. Выберите точное название из справочника.' })
    }
    if (matches.length) {
      throw createError({ statusCode: 409, statusMessage: 'MANUFACTURER_DELETED', message: 'Производитель с таким названием удалён. Восстановите его через справочник.' })
    }
    return null
  }

  const existing = await findExisting()
  if (existing) return existing
  await requirePermission(event, RESOURCE_KEY, AccessAction.CREATE)

  // Serialize new manufacturers created through the POST/PUT registry resolver.
  // The transaction releases this lock on commit or rollback. Recheck after waiting.
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(74129, 1)::text AS locked`
  const concurrent = await findExisting()
  if (concurrent) return concurrent

  const created = await tx.manufacturer.create({
    data: { name, authorEmail: actorEmail, editorEmail: actorEmail },
  })
  await auditDataChange({
    event, db: tx, resourceKey: RESOURCE_KEY,
    entityType: 'Manufacturer', entityId: created.id, action: 'CREATE',
    note: 'Создан новый производитель при сохранении записи Реестра',
    changes: buildCreateAuditDelta({ name: created.name, note: created.note }, ['name', 'note']),
    actorEmail,
  })
  return created
}
