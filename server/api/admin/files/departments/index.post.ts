import { createError, defineEventHandler, getHeader, readBody } from 'h3';
import { diskAdmin } from '../../../../services/storage/disk';
import { storageDepartments, ensureDepartmentDirectory } from '../../../../services/storage/departments';
import { withStorageLock } from '../../../../services/storage/operations';
import { writeAuditEvent } from '../../../../utils/auditLog';
export default defineEventHandler(async event => {
  const actor = await diskAdmin(event);
  if (getHeader(event, 'x-space-storage') !== '1') throw createError({ statusCode: 403 });
  const body = await readBody(event);
  const department = (await storageDepartments()).find(d => d.key === body?.key);
  if (!department) throw createError({ statusCode: 400, message: 'Неизвестная группа Space' });
  await withStorageLock(async () => {
    await ensureDepartmentDirectory(department.path);
    await writeAuditEvent({ event, actorUserId: actor.id, category: 'DATA', action: 'CREATE', result: 'SUCCESS', resourceKey: 'system.file-storage',
      entityType: 'SpaceGroupStorage', note: 'Подготовлен каталог группы Space', afterData: { department: department.key, path: department.path } });
  });
  return { path: department.path };
});
