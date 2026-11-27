import { requirePermission } from '../access-control.service';
import { contractAccess } from './access';
import { workAccess } from './work-access';
import { structureAccess } from './structure-access';
import { calendarRoster } from './calendar-roster';
import { parseWorklog, processWorklog } from './worklog-import';
import { createError, getHeader, readRawBody } from 'h3';
export async function worklogRequest(event: import('h3').H3Event): Promise<unknown> {
  const actor = await contractAccess(event, 'VIEW');
  await structureAccess(event);
  await workAccess(event, 'VIEW');
  const limit = 8 * 1024 * 1024;
  if (Number(getHeader(event, 'content-length')) > limit)
    throw createError({ statusCode: 413, message: 'Слишком большой лист.' });
  const raw = await readRawBody(event);
  if (!raw || Buffer.byteLength(raw) > limit)
    throw createError({ statusCode: 413, message: 'Проверьте размер файла.' });
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    throw createError({ statusCode: 400, message: 'Некорректный формат данных.' });
  }
  const input = parseWorklog(body),
    apply = body.apply === true;
  const granted = new Set<string>();
  if (apply) {
    if (
      getHeader(event, 'x-space-diagnostic') !== '1' ||
      getHeader(event, 'sec-fetch-site') === 'cross-site' ||
      !getHeader(event, 'content-type')?.startsWith('application/json')
    )
      throw createError({ statusCode: 403, message: 'Откройте форму импорта в Space.' });
    for (const name of ['contracts', 'structures'] as const) {
      for (const action of ['CREATE', 'UPDATE'] as const) {
        try {
          await requirePermission(event, 'diagnostic.' + name, action, { auditDenial: false });
          granted.add(name + action);
        } catch (error) {
          if ((error as { statusCode?: number }).statusCode !== 403) throw error;
        }
      }
    }
  }
  const roster = await calendarRoster(event);
  return processWorklog(event, actor.userId, input, roster.employees, apply, (need) => {
    const required = [
      need.existingContract ? 'contractsUPDATE' : 'contractsCREATE',
      ...(need.createStructure ? ['structuresCREATE'] : []),
      ...(need.editStructure ? ['structuresUPDATE'] : []),
    ];
    if (required.some((key) => !granted.has(key)))
      throw createError({
        statusCode: 403,
        message: 'Недостаточно прав для выбранных изменений договора или сооружений.',
      });
  });
}
