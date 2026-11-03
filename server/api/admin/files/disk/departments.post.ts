import { createError, defineEventHandler, getHeader, setHeader } from 'h3';
import { diskAdmin } from '../../../../services/storage/disk';
import { storageRoot } from '../../../../services/storage/paths';
import { projectFilesRoot } from '../../../../services/work/file-storage';
import { storageDepartments } from '../../../../services/storage/departments';
import { measureDepartmentStorage } from '../../../../services/storage/usage';
import { prisma } from '../../../../utils/prisma';
import { writeAuditEvent } from '../../../../utils/auditLog';
let running = false, next = 0;
export default defineEventHandler(async event => {
  const actor = await diskAdmin(event);
  if (getHeader(event, 'x-space-disk-scan') !== '1') throw createError({ statusCode: 403 });
  if (running || Date.now() < next) {
    const retryAfter = Math.max(1, Math.ceil((next - Date.now()) / 1000)); setHeader(event, 'Retry-After', retryAfter);
    throw createError({ statusCode: 429, statusMessage: 'Too Many Requests', message: 'Расчёт объёма уже выполняется или запускался недавно.', data: { retryAfter } });
  }
  running = true; next = Date.now() + 60000;
  try {
    const departments = await storageDepartments();
    const projects = await prisma.workProject.findMany({ select: { id: true, departmentId: true, upts: { select: { projectId: true } } } });
    const projectOwners = new Map(projects.map(p => [p.id, p.upts ? 'upts' : departments.find(d => p.departmentId && d.departmentIds.includes(p.departmentId))?.key || 'projects']));
    const report = await measureDepartmentStorage({ storage: storageRoot, projects: projectFilesRoot, departments, projectOwners });
    await writeAuditEvent({ event, actorUserId: actor.id, category: 'ADMIN', action: 'STORAGE_USAGE_SCAN', result: 'SUCCESS', resourceKey: 'system.file-storage',
      entityType: 'DiskInspection', note: 'Измерен объём файлов подразделений', afterData: { status: report.status, totalBytes: report.totalBytes } });
    return report;
  } catch {
    next = Date.now() + 10000;
    throw createError({ statusCode: 503, statusMessage: 'Service Unavailable', message: 'Не удалось измерить хранилища подразделений. Проверьте доступ к базе данных и каталогам хранилища.', data: { retryAfter: 10 } });
  } finally { running = false; }
});
