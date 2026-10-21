import { defineEventHandler, setHeader } from 'h3';
import { prisma } from '../../utils/prisma';
import { requirePermission } from '../../services/access-control.service';
import type { AdminDashboardSummary } from '../../../shared/types/admin-dashboard';

export default defineEventHandler(async event => {
  const access = await requirePermission(event, 'admin.center', 'VIEW');
  setHeader(event, 'Cache-Control', 'private, no-store');
  let canViewUsers = false;
  try { await requirePermission(event, 'admin.users', 'VIEW', { auditDenial: false }); canViewUsers = true; }
  catch (error) { if ((error as { statusCode?: number }).statusCode !== 403) throw error; }
  // The same boundaries as the existing tools: user data is delegated; structure
  // and registration requests are available only to a system administrator.
  const [users, groups, activeGroups, departments, pending] = await Promise.all([
    canViewUsers ? prisma.user.groupBy({ where: { deletedAt: null }, by: ['status'], _count: { _all: true } }) : null,
    access.isSystemAdmin ? prisma.spaceGroup.count() : null,
    access.isSystemAdmin ? prisma.spaceGroup.count({ where: { isActive: true } }) : null,
    access.isSystemAdmin ? prisma.department.count({ where: { isActive: true } }) : null,
    access.isSystemAdmin ? prisma.registrationRequest.count({ where: { status: 'PENDING_REVIEW' } }) : null,
  ]);
  const count = (status: string) => users?.find(u => u.status === status)?._count._all || 0;
  return {
    users: users ? { total: users.reduce((n, row) => n + row._count._all, 0), active: count('ACTIVE'),
      pending: count('PENDING_ACTIVATION'), blocked: count('BLOCKED'), disabled: count('DISABLED') } : null,
    structure: access.isSystemAdmin ? { groups: groups!, activeGroups: activeGroups!, departments: departments! } : null,
    requests: access.isSystemAdmin ? { pending: pending! } : null,
    updatedAt: new Date().toISOString(),
  } satisfies AdminDashboardSummary;
});
