import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { getHeader, getQuery, getMethod, setHeader, sendStream, type H3Event } from 'h3';
import type { WorkProjectFile } from '@prisma/client';
import { prisma } from '../../utils/prisma';
import { writeAuditEvent } from '../../utils/auditLog';
import { workActor } from './access';
import { visibleProject, fail } from './service';
import { createsTask, managesProject, projectRole, type Actor, type ProjectPolicy } from './policy';
import { parse, positiveId } from './input';
import { ensureContractDirectory, projectFileLimit, ensureProjectDirectory, receiveProjectFile, openProjectFile } from './file-storage';

const scopeInput = z.enum(['SHARED', 'PRIVATE']);
const uploadInput = z.object({
  clientKey: z.string().uuid(), scope: scopeInput,
  name: z.string().trim().min(1).max(240).refine(s => !/[\/\\\x00-\x1f\x7f]/.test(s) && s !== '.' && s !== '..', 'Недопустимое имя файла.'),
  size: z.number().int().positive().max(1073741824),
}).strict();
const stateInput = z.object({ version: z.number().int().positive(), deleted: z.boolean() }).strict();
function writable(p: ProjectPolicy, a: Actor, scope: string) {
  return !p.archivedAt && (scope === 'PRIVATE' || createsTask(p, a));
}
function canManage(file: WorkProjectFile, p: ProjectPolicy, a: Actor) {
  if (p.archivedAt) return false;
  if (file.scope === 'PRIVATE') return file.ownerId === a.id;
  return managesProject(p, a) || (file.ownerId === a.id && !!projectRole(p, a));
}
function dto(f: WorkProjectFile, p: ProjectPolicy, a: Actor) {
  return { id: f.id, projectId: f.projectId, ownerId: f.ownerId, scope: f.scope, name: f.name, size: f.size,
    version: f.version, createdAt: f.createdAt, deletedAt: f.deletedAt, canManage: canManage(f, p, a) };
}
const visibleFileWhere = (projectId: number, a: Actor) => ({ projectId, OR: [{ scope: 'SHARED' }, { scope: 'PRIVATE', ownerId: a.id }] });
async function contractFolder(event:H3Event,projectId:number,upload=false) {
 const raw=upload?getHeader(event,'x-file-contract'):getQuery(event).contractId;
 if(raw===undefined||raw==='')return null;
 const contractId=positiveId(raw);
 if(!await prisma.uptsContract.findFirst({where:{id:contractId,projectId}}))fail(404,'Договор не найден в проекте.');
 return contractId;
}
export async function projectFiles(event: H3Event, projectId: number) {
  const a = await workActor(event), p = await visibleProject(prisma, projectId, a);
  const contractId=await contractFolder(event,projectId);
  if(contractId)await ensureContractDirectory(projectId,contractId);
  const query = getQuery(event), scope = parse(scopeInput, query.scope || 'SHARED');
  const page = query.page ? positiveId(query.page) : 1;
  await ensureProjectDirectory(projectId); // Existing projects get directories on first use.
  const where = { projectId, contractId, scope, ...(scope === 'PRIVATE' ? { ownerId: a.id } : {}), deletedAt: query.trash === '1' ? { not: null } : null };
  const [rows, total] = await Promise.all([
    prisma.workProjectFile.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], take: 40, skip: (page - 1) * 40, include: { owner: { select: { id: true, fullName: true, login: true } } } }),
    prisma.workProjectFile.count({ where }),
  ]);
  return { items: rows.map(f => ({ ...dto(f, p, a), owner: f.owner })), total, page, maxBytes: projectFileLimit(), canUpload: writable(p, a, scope) };
}
export async function uploadProjectFile(event: H3Event, projectId: number) {
  const a = await workActor(event), p = await visibleProject(prisma, projectId, a);
  if (getHeader(event, 'x-space-work') !== '1' || getHeader(event, 'content-type')?.split(';')[0] !== 'application/octet-stream') fail(403, 'Загрузите файл через Space.');
  let name: string;
  try { name = decodeURIComponent(getHeader(event, 'x-file-name') || ''); } catch { return fail(400, 'Неверное имя файла.'); }
  const v = parse(uploadInput, { clientKey: getHeader(event, 'x-file-key'), scope: getHeader(event, 'x-file-scope'), name, size: Number(getHeader(event, 'x-file-size')) });
  const contractId=await contractFolder(event,projectId,true);
  if (!writable(p, a, v.scope)) fail(403, 'Нет права добавлять файлы в эту область проекта.');
  if (v.size > projectFileLimit()) fail(413, 'Файл превышает установленный лимит.');
  const length = getHeader(event, 'content-length');
  if (length !== undefined && Number(length) !== v.size) fail(400, 'Размер запроса не совпадает с размером файла.');
  const old = await prisma.workProjectFile.findUnique({ where: { clientKey: v.clientKey } });
  if (old) {
    if (old.contractId !== contractId || old.projectId !== projectId || old.ownerId !== a.id || old.scope !== v.scope || old.size !== v.size || old.name !== v.name || old.deletedAt) fail(409, 'Ключ загрузки уже использован.');
    return dto(old, p, a);
  }
  // Stream to disk before acquiring any database transaction or module lock.
  const stored = await receiveProjectFile(event, projectId, a.id, v.scope, v.size, contractId);
  // If DB commit outcome is uncertain, retain these bytes. Never delete a possibly committed file.
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261019)`;
    const current = await visibleProject(tx, projectId, a);
    if (!writable(current, a, v.scope)) fail(403, 'Права проекта изменились во время загрузки.');
    const user = await tx.user.findUnique({ where: { id: a.id }, select: { status: true } });
    if (user?.status !== 'ACTIVE') fail(403, 'Учётная запись неактивна.');
    const duplicate = await tx.workProjectFile.findUnique({ where: { clientKey: v.clientKey } });
    if (duplicate) fail(409, 'Загрузка с таким ключом уже завершена. Обновите список файлов.');
    const file = await tx.workProjectFile.create({ data: { id: randomUUID(), clientKey: v.clientKey, projectId, contractId, ownerId: a.id, scope: v.scope, name: v.name, ...stored } });
    await writeAuditEvent({ event, db: tx, actorUserId: a.id, category: 'DATA', result: 'SUCCESS', resourceKey: 'projects.shared', entityType: 'WorkProjectFile', entityId: projectId, action: 'CREATE', afterData: { fileId: file.id, scope: file.scope, size: file.size }, note: 'Файл проекта добавлен' });
    return dto(file, current, a);
  }, { maxWait: 5000, timeout: 15000 });
}
export async function projectFileState(event: H3Event, projectId: number, rawId: unknown, raw: unknown) {
  const a = await workActor(event), id = parse(z.string().uuid(), rawId), v = parse(stateInput, raw);
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261019)`;
    const p = await visibleProject(tx, projectId, a);
    const f = await tx.workProjectFile.findFirst({ where: { id, ...visibleFileWhere(projectId, a) } });
    if (!f) fail(404, 'Файл не найден.');
    if (!canManage(f, p, a)) fail(403, 'Нет права изменять этот файл.');
    if (v.version !== f.version) fail(409, 'Файл уже изменился. Обновите список.');
    if (!!f.deletedAt === v.deleted) return dto(f, p, a);
    const updated = await tx.workProjectFile.update({ where: { id }, data: { deletedAt: v.deleted ? new Date() : null, version: { increment: 1 } } });
    await writeAuditEvent({ event, db: tx, actorUserId: a.id, category: 'DATA', result: 'SUCCESS', resourceKey: 'projects.shared', entityType: 'WorkProjectFile', entityId: projectId, action: v.deleted ? 'DELETE' : 'RESTORE', afterData: { fileId: id, scope: f.scope, deleted: v.deleted }, note: v.deleted ? 'Файл проекта перемещён в корзину' : 'Файл проекта восстановлен' });
    return dto(updated, p, a);
  }, { maxWait: 5000, timeout: 15000 });
}
export async function downloadProjectFile(event: H3Event, projectId: number, rawId: unknown) {
  const a = await workActor(event), id = parse(z.string().uuid(), rawId);
  await visibleProject(prisma, projectId, a);
  const f = await prisma.workProjectFile.findFirst({ where: { id, deletedAt: null, ...visibleFileWhere(projectId, a) } });
  if (!f) fail(404, 'Файл не найден или недоступен.');
  let handle;
  try { handle = await openProjectFile(f); } catch { return fail(404, 'Файл отсутствует в хранилище.'); }
  setHeader(event, 'Content-Type', 'application/octet-stream');
  setHeader(event, 'Content-Disposition', `attachment; filename="document"; filename*=UTF-8''${encodeURIComponent(f.name).replace(/['()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase())}`);
  setHeader(event, 'X-Content-Type-Options', 'nosniff');
  setHeader(event, 'Content-Security-Policy', "sandbox; default-src 'none'");
  setHeader(event, 'Content-Length', f.size);
  if (getMethod(event) === 'HEAD') { await handle.close(); event.node.res.end(); return; }
  return sendStream(event, handle.createReadStream());
}
