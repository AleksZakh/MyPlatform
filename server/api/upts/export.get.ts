import { defineEventHandler, setHeader, getQuery } from 'h3';
import { snapshot } from '../../services/upts';
import { uptsWorkbook } from '../../services/upts-report';
import { writeAuditEvent } from '../../utils/auditLog';
import { workActor } from '../../services/work/access';
export default defineEventHandler(async (event) => {
  const data = await snapshot(event),
    buffer = await uptsWorkbook(data, getQuery(event));
  const actor = await workActor(event);
  await writeAuditEvent({
    event,
    actorUserId: actor.id,
    category: 'DATA',
    result: 'SUCCESS',
    resourceKey: 'projects.shared',
    entityType: 'UptsReport',
    action: 'EXPORT',
    note: `Отчёт УПТС: ${data.projects.length} проектов, ${data.tasks.length} задач`,
  });
  setHeader(
    event,
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  setHeader(
    event,
    'Content-Disposition',
    `attachment; filename="Space-UPTS-${data.today}.xlsx"`,
  );
  return Buffer.from(buffer);
});
