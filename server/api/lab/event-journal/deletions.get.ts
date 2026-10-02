import { AccessAction, type Prisma } from '@prisma/client';
import { defineEventHandler, getQuery, setResponseHeader } from 'h3';
import { prisma } from '~~/server/utils/prisma';
import { requirePermission } from '~~/server/services/access-control.service';
export default defineEventHandler(async event => {
  await requirePermission(event, 'lab.event-journal', AccessAction.VIEW);
  setResponseHeader(event, 'Cache-Control', 'no-store');
  const query = getQuery(event);
  const rawPage = Number(query.page);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? Math.min(rawPage, 100000) : 1;
  const pageSize = 25;
  const where: Prisma.AuditLogWhereInput = {
    action: 'DELETE', result: 'SUCCESS',
    resourceKey: { in: ['lab.sampling-tests', 'lab.receipt-materials', 'lab.test-protocols', 'lab.materials', 'lab.manufacturers', 'lab.test-objects', 'lab.test-locations', 'lab.plps'] },
  };
  const [rows, total] = await prisma.$transaction([
    prisma.auditLog.findMany({ where, orderBy: [{ timestamp: 'desc' }, { id: 'desc' }], skip: (page - 1) * pageSize, take: pageSize,
      select: { id: true, timestamp: true, entityType: true, entityId: true, actorEmail: true, actorLogin: true, note: true } }),
    prisma.auditLog.count({ where }),
  ]);
  return { rows, total, page, pageSize };
});
