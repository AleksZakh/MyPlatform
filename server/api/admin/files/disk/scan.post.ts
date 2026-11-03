import { createError, defineEventHandler, getHeader } from 'h3';
import { diskAdmin, scanDisk } from '../../../../services/storage/disk';
import { writeAuditEvent } from '../../../../utils/auditLog';
export default defineEventHandler(async event => {
  const actor = await diskAdmin(event);
  if (getHeader(event, 'x-space-disk-scan') !== '1') throw createError({ statusCode: 403, message: 'Запустите проверку из вкладки «Управление диском».' });
  // Log who requested the operation without filesystem paths or process data.
  await writeAuditEvent({ event, actorUserId: actor.id, category: 'ADMIN', action: 'DISK_SCAN_REQUEST', result: 'SUCCESS',
    resourceKey: 'system.file-storage', entityType: 'DiskInspection', note: 'Запрошена проверка диска без удаления файлов' });
  return scanDisk(event);
});
