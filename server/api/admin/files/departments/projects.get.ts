import { createError, defineEventHandler, getQuery } from 'h3';
import { diskAdmin } from '../../../../services/storage/disk';
import { storageDepartments } from '../../../../services/storage/departments';
import { prisma } from '../../../../utils/prisma';
import { workActor } from '../../../../services/work/access';
import { projectWhere } from '../../../../services/work/policy';
import { visibleProject } from '../../../../services/work/service';
import { positiveId } from '../../../../services/work/input';
export default defineEventHandler(async event => {
  await diskAdmin(event);
  const a = await workActor(event), q = getQuery(event), page = q.page ? positiveId(q.page) : 1;
  const department = (await storageDepartments()).find(d => d.key === q.department);
  if (!department) throw createError({ statusCode: 400, message: 'Неизвестное подразделение' });
  const belongs = department.key === 'upts' ? { upts: { isNot: null } } : { upts: { is: null }, departmentId: { in: department.departmentIds } };
  if (!q.projectId) {
    const where = { ...projectWhere(a), ...belongs };
    const [rows, total] = await Promise.all([
      prisma.workProject.findMany({ where, select: { id: true, name: true, archivedAt: true }, orderBy: { id: 'desc' }, skip: (page - 1) * 100, take: 100 }),
      prisma.workProject.count({ where }),
    ]);
    return { title: 'Проекты подразделения', items: rows.map(p => ({ kind: 'project', id: p.id, name: p.name + (p.archivedAt ? ' · архив' : '') })), total, page };
  }
  const id = positiveId(q.projectId);
  const project = await visibleProject(prisma, id, a);
  if (!await prisma.workProject.findFirst({ where: { id, ...belongs }, select: { id: true } })) throw createError({ statusCode: 404 });
  const contractId = q.contractId ? positiveId(q.contractId) : null;
  const contract = contractId ? await prisma.uptsContract.findFirst({ where: { id: contractId, projectId: id }, select: { number: true } }) : null;
  if (contractId && !contract) throw createError({ statusCode: 404 });
  const where = { projectId: id, contractId, deletedAt: null, OR: [{ scope: 'SHARED' }, { scope: 'PRIVATE', ownerId: a.id }] };
  const [files, total, contracts] = await Promise.all([
    prisma.workProjectFile.findMany({ where, select: { id: true, name: true, size: true, scope: true }, orderBy: { createdAt: 'desc' }, take: 100, skip: (page - 1) * 100 }),
    prisma.workProjectFile.count({ where }),
    contractId || page !== 1 ? [] : prisma.uptsContract.findMany({ where: { projectId: id }, select: { id: true, number: true, name: true }, orderBy: { id: 'asc' } }),
  ]);
  return { title: contract ? 'Объект ' + contract.number : project.name, page, total,
    items: [ ...contracts.map(c => ({ kind: 'contract', id: c.id, name: `Объект ${c.number} · ${c.name}` })),
      ...files.map(f => ({ kind: 'file', id: f.id, name: f.name, size: f.size, private: f.scope === 'PRIVATE', url: `/api/work/projects/${id}/files/${f.id}` })) ],
  };
});
