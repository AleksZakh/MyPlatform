import { defineEventHandler } from 'h3';
import { diskAdmin, diskSummary } from '../../../../services/storage/disk';
export default defineEventHandler(async event => {
  await diskAdmin(event);
  return diskSummary();
});
