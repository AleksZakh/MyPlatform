import { createHash } from 'node:crypto'
import type { Prisma } from '@prisma/client'
import type { H3Event } from 'h3'
import { getAccessActor } from './access-control.service'
import { accessError } from './access-input'
import { writeAuditEvent, type AuditDelta } from '../utils/auditLog'

export const structureRevision = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
export async function structureAdmin(event: H3Event, db?: Prisma.TransactionClient) {
  const actor = await getAccessActor(event, db)
  if (!actor.isSystemAdmin) accessError(403, 'STRUCTURE_ADMIN_ONLY', 'Управлять структурой может только системный администратор.')
  return actor
}
export async function structureAudit(event: H3Event, db: Prisma.TransactionClient,
  actor: Awaited<ReturnType<typeof structureAdmin>>, entityType: string, entityId: number,
  before: AuditDelta[string]['before'], after: AuditDelta[string]['after'], note: string) {
  await writeAuditEvent({ event, db, category: 'ADMIN', result: 'SUCCESS', action: 'UPDATE',
    resourceKey: 'admin.users', entityType, entityId, actorUserId: actor.user.id,
    actorLogin: actor.user.login, actorEmail: actor.user.email || actor.user.login || `user:${actor.user.id}`,
    actorAuthType: actor.user.authType, note, changes: { structure: { before, after } },
  })
}
