import { Prisma } from '@prisma/client';
import { createError, type H3Event } from 'h3';
import { prisma } from '../../utils/prisma';
import { computeAuditDelta, writeAuditEvent } from '../../utils/auditLog';
import { workCode } from '../../../shared/utils/diagnostic-works';
import type { WorkInput, WorkRecord } from '../../../shared/types/diagnostic-works';
import { WORK_RESOURCE } from './work-access';

const include = { group: true, category: true } satisfies Prisma.DiagnosticWorkInclude;
type Row = Prisma.DiagnosticWorkGetPayload<{ include: typeof include }>;
const conflict = () => createError({ statusCode: 409, message: 'Данные изменены другим сотрудником. Обновите список и повторите действие.' });
async function atomic<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  // Retry whole transactions only. Rolled-back numbers and audit entries are not committed.
  for (let attempt = 0; ; attempt++) {
    try { return await prisma.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 10000 }); }
    catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2034' && attempt < 3) continue;
        if (['P2034', 'P2002'].includes(e.code)) throw conflict();
      }
      throw e;
    }
  }
}
function serialize(r: Row): WorkRecord {
  return { id: r.id, version: r.version, code: r.code, sequence: r.sequence, groupId: r.groupId,
    categoryId: r.categoryId, group: r.group.name, category: r.category.name, name: r.name,
    hours: r.hours.toString(), criteria: r.criteria, note: r.note,
    createdById: r.createdById, updatedById: r.updatedById, creator: '', editor: '',
    createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() };
}
async function authors(rows: WorkRecord[], db: Prisma.TransactionClient = prisma) {
  const ids = [...new Set(rows.flatMap(r => [r.createdById, r.updatedById]))];
  const users = await db.user.findMany({ where: { id: { in: ids } }, select: { id: true, fullName: true, login: true, deletedAt: true } });
  const names = new Map(users.map(u => [u.id, u.deletedAt ? 'Удалённый аккаунт' : u.fullName || u.login || ('Сотрудник #' + u.id)]));
  return rows.map(r => ({ ...r, creator: names.get(r.createdById) || 'Удалённый аккаунт', editor: names.get(r.updatedById) || 'Удалённый аккаунт' }));
}
export async function listWorks() {
  const rows = await prisma.diagnosticWork.findMany({ where: { deletedAt: null }, include, orderBy: [{ groupId: 'asc' }, { sequence: 'asc' }] });
  return authors(rows.map(serialize));
}
export async function workCatalog() {
  const [groups, categories] = await Promise.all([
    prisma.diagnosticWorkGroup.findMany({ select: { id: true, name: true }, orderBy: { id: 'asc' } }),
    prisma.diagnosticWorkCategory.findMany({ select: { id: true, name: true, groupId: true }, orderBy: { name: 'asc' } }),
  ]);
  return { groups, categories };
}
export async function saveWork(event: H3Event, actorId: number, input: WorkInput, id?: number, version?: number) {
  return atomic(async tx => {
    const before = id ? await tx.diagnosticWork.findFirst({ where: { id, deletedAt: null }, include }) : null;
    if (id && !before) throw createError({ statusCode: 404, message: 'Работа не найдена.' });
    if (before && before.version !== version) throw conflict();
    if (before && before.groupId !== input.groupId) throw createError({ statusCode: 400, message: 'Группа определяет шифр и не меняется после создания. Создайте копию в нужной группе.' });
    const category = await tx.diagnosticWorkCategory.findFirst({ where: { id: input.categoryId, groupId: input.groupId } });
    if (!category) throw createError({ statusCode: 400, message: 'Категория не относится к выбранной группе.' });
    let row: Row;
    if (before) {
      const changed = await tx.diagnosticWork.updateMany({ where: { id, version, deletedAt: null },
        data: { ...input, updatedById: actorId, version: { increment: 1 } } });
      if (changed.count !== 1) throw conflict();
      row = await tx.diagnosticWork.findUniqueOrThrow({ where: { id: before.id }, include });
    } else {
      // Atomic row update serializes allocation within the group.
      const counter = await tx.diagnosticWorkGroup.update({ where: { id: input.groupId }, data: { nextSequence: { increment: 1 } } });
      const sequence = counter.nextSequence - 1;
      row = await tx.diagnosticWork.create({ data: { ...input, sequence, code: workCode(input.groupId, sequence),
        createdById: actorId, updatedById: actorId }, include });
    }
    const after = serialize(row);
    await writeAuditEvent({ event, db: tx, category: 'DATA', result: 'SUCCESS', action: before ? 'UPDATE' : 'CREATE',
      resourceKey: WORK_RESOURCE, entityType: 'DiagnosticWork', entityId: row.id, actorUserId: actorId,
      note: 'Работа ' + row.code, changes: computeAuditDelta(before ? { ...serialize(before) } : {}, { ...after }) });
    return (await authors([after], tx))[0]!;
  });
}
export async function createWorkCategory(event: H3Event, actorId: number, groupId: number, name: string) {
  return atomic(async tx => {
    if (!await tx.diagnosticWorkGroup.findUnique({ where: { id: groupId } })) throw createError({ statusCode: 400, message: 'Группа не найдена.' });
    if (await tx.diagnosticWorkCategory.findFirst({ where: { groupId, name: { equals: name, mode: 'insensitive' } } })) {
      throw createError({ statusCode: 409, message: 'Такая категория уже существует в группе. Обновите список.' });
    }
    const row = await tx.diagnosticWorkCategory.create({ data: { groupId, name, createdById: actorId } });
    await writeAuditEvent({ event, db: tx, category: 'DATA', result: 'SUCCESS', action: 'CREATE', resourceKey: WORK_RESOURCE,
      entityType: 'DiagnosticWorkCategory', entityId: row.id, actorUserId: actorId,
      note: 'Новая категория: ' + name, changes: computeAuditDelta({}, { groupId, name }) });
    return { id: row.id, groupId: row.groupId, name: row.name };
  });
}
export async function deleteWork(event: H3Event, actorId: number, id: number, version: number, reason: string) {
  return atomic(async tx => {
    const before = await tx.diagnosticWork.findFirst({ where: { id, deletedAt: null }, include });
    if (!before) throw createError({ statusCode: 404, message: 'Работа не найдена.' });
    const deletedAt = new Date();
    const changed = await tx.diagnosticWork.updateMany({ where: { id, version, deletedAt: null },
      data: { deletedAt, deletedById: actorId, deleteReason: reason, updatedById: actorId, version: { increment: 1 } } });
    if (changed.count !== 1) throw conflict();
    await writeAuditEvent({ event, db: tx, category: 'DATA', result: 'SUCCESS', action: 'DELETE', resourceKey: WORK_RESOURCE,
      entityType: 'DiagnosticWork', entityId: id, actorUserId: actorId, note: 'Работа ' + before.code + ': ' + reason,
      changes: { deletedAt: { before: null, after: deletedAt.toISOString() }, reason: { before: null, after: reason } } });
    return { success: true };
  });
}

