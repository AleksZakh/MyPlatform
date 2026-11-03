import { defineEventHandler } from 'h3';
import { diskAdmin } from '../../../../services/storage/disk';
import { storageDepartments, directoryExists } from '../../../../services/storage/departments';
export default defineEventHandler(async event => {
  await diskAdmin(event);
  return { items: await Promise.all((await storageDepartments()).map(async d => ({ ...d,
    exists: await directoryExists(d.path).catch(() => false),
  }))) };
});
