import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { getQuery, type H3Event } from 'h3';
import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { workActor } from './work/access';
import {
  projectWhere,
  taskRights,
  managesProject,
  type Actor,
} from './work/policy';
import {
  visibleProject,
  projectDTO,
  projectInclude,
  userSelect,
  mutation,
  fail,
  version,
} from './work/service';
import { parse, positiveId, dbDay } from './work/input';
import { uptsDay } from './upts-input';
import {
  ensureProjectDirectory,
  ensureContractDirectory,
} from './work/file-storage';
import { portalToday, shiftDay } from '../../shared/utils/work-board';
import { filterUpts } from '../../shared/utils/upts';
import type { UptsSnapshot } from '../../shared/types/upts';

type DB = Prisma.TransactionClient;
const id = z.number().int().positive().max(2147483647);
const readiness = z.enum(['TODO', 'ACTIVE', 'BLOCKED', 'DONE', 'NA']);
const linkInput = z
  .object({
    clientKey: z.string().uuid(),
    objectId: id.nullable(),
    name: z.string().trim().min(1).max(250),
    cadastralNumber: z.string().trim().max(100).nullable(),
    address: z.string().trim().max(1000),
    goal: z.string().trim().max(1000),
  })
  .strict();
const progressInput = z
  .object({
    version: id,
    goal: z.string().trim().max(1000),
    note: z.string().trim().max(2000),
    cadastral: readiness,
    rights: readiness,
    restrictions: readiness,
    documents: readiness,
    handover: readiness,
  })
  .strict();
const contractInput = z
  .object({
    clientKey: z.string().uuid(),
    version: id.optional(),
    number: z.string().trim().min(1).max(100),
    name: z.string().trim().min(1).max(250),
    counterparty: z.string().trim().max(250),
    signedDate: uptsDay,
    dueDate: uptsDay,
  })
  .strict()
  .refine(
    (v) => !v.signedDate || !v.dueDate || v.signedDate <= v.dueDate,
    'Дата договора позже срока.',
  );
async function managed(db: DB, projectId: number, a: Actor) {
  const p = await visibleProject(db, projectId, a);
  if (!managesProject(p, a) || p.archivedAt)
    fail(403, 'Изменять сведения УПТС может руководитель активного проекта.');
  if (!(await db.uptsProject.findUnique({ where: { projectId } })))
    fail(404, 'Проект не подключён к УПТС.');
  return p;
}
export async function snapshot(event: H3Event) {
  const a = await workActor(event),
    q = getQuery(event);
  const projectId = q.projectId ? positiveId(q.projectId) : null,
    employeeId = q.employeeId ? positiveId(q.employeeId) : null;
  // Consistent snapshot and no silent truncation: XLSX and screen use the same complete scope.
  const data = await prisma.$transaction(
    async (tx) => {
      const where = {
        ...projectWhere(a),
        upts: { isNot: null },
        archivedAt: q.archived === '1' ? { not: null } : null,
        ...(projectId ? { id: projectId } : {}),
      };
      const count = await tx.workProject.count({ where });
      if (count > 500)
        fail(422, 'Более 500 проектов. Выберите отдельный проект.');
      const projects = await tx.workProject.findMany({
        where,
        include: {
          ...projectInclude,
          upts: {
            include: {
              objects: { include: { object: true }, orderBy: { id: 'asc' } },
              contracts: { orderBy: { id: 'asc' } },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });
      const taskWhere = {
        projectId: { in: projects.map((p) => p.id) },
        deletedAt: null,
        ...(employeeId ? { assigneeId: employeeId } : {}),
      };
      if ((await tx.workTask.count({ where: taskWhere })) > 10000)
        fail(422, 'Более 10 000 задач. Уточните проект или сотрудника.');
      const tasks = await tx.workTask.findMany({
        where: taskWhere,
        include: {
          assignee: { select: userSelect },
          participants: { select: { userId: true } },
          _count: { select: { comments: true } },
        },
        orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
      });
      const byId = new Map(projects.map((p) => [p.id, p]));
      return {
        projects: projects.map((p) => ({ ...projectDTO(p, a), upts: p.upts })),
        tasks: tasks.map((t) => {
          const p = byId.get(t.projectId!)!;
          return {
            ...t,
            ...taskRights({ ...t, project: p }, a),
            project: { id: p.id, name: p.name, color: p.color },
          };
        }),
        today: portalToday(),
      };
    },
    { isolationLevel: 'RepeatableRead', timeout: 15000 },
  );
  return filterUpts(JSON.parse(JSON.stringify(data)) as UptsSnapshot, {
    projectId,
    employeeId,
    q: String(q.q || '').slice(0, 200),
  });
}
export async function objectCatalog(event: H3Event) {
  const a = await workActor(event),
    q = String(getQuery(event).q || '').slice(0, 200);
  return prisma.uptsObject.findMany({
    where: {
      projects: { some: { project: { project: projectWhere(a) } } },
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { cadastralNumber: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: { name: 'asc' },
    take: 100,
  });
}
export async function objects(event: H3Event, projectId: number) {
  const a = await workActor(event);
  await visibleProject(prisma, projectId, a);
  return prisma.uptsProjectObject.findMany({
    where: { projectId },
    include: { object: true },
    orderBy: { id: 'asc' },
  });
}
export async function addObject(
  event: H3Event,
  projectId: number,
  raw: unknown,
) {
  const a = await workActor(event),
    v = parse(linkInput, raw);
  return mutation(event, a, 'UptsProjectObject', 'CREATE', async (tx) => {
    await managed(tx, projectId, a);
    let objectId = v.objectId;
    if (objectId) {
      if (
        !(await tx.uptsObject.findFirst({
          where: {
            id: objectId,
            projects: { some: { project: { project: projectWhere(a) } } },
          },
        }))
      )
        fail(404, 'Объект недоступен.');
    } else {
      const retry = await tx.uptsObject.findUnique({
        where: { clientKey: v.clientKey },
        include: { projects: { where: { projectId }, select: { id: true } } },
      });
      if (retry) {
        if (
          !retry.projects.length ||
          retry.name !== v.name ||
          retry.address !== v.address ||
          retry.cadastralNumber !== (v.cadastralNumber?.trim() || null)
        )
          fail(409, 'Ключ объекта уже использован.');
        objectId = retry.id;
      } else {
        const cadastralNumber = v.cadastralNumber?.trim() || null;
        if (
          cadastralNumber &&
          (await tx.uptsObject.findUnique({ where: { cadastralNumber } }))
        )
          fail(
            409,
            'Такой кадастровый номер уже зарегистрирован. Выберите существующий доступный объект или обратитесь к ответственному.',
          );
        objectId = (
          await tx.uptsObject.create({
            data: {
              clientKey: v.clientKey,
              name: v.name,
              cadastralNumber,
              address: v.address,
            },
          })
        ).id;
      }
    }
    const previous = await tx.uptsProjectObject.findUnique({
      where: { projectId_objectId: { projectId, objectId } },
    });
    if (previous) return { id: previous.id, value: previous, changed: false };
    const result = await tx.uptsProjectObject.create({
      data: { projectId, objectId, goal: v.goal },
    });
    return { id: result.id, value: result };
  });
}
export async function updateObject(
  event: H3Event,
  projectId: number,
  objectLinkId: number,
  raw: unknown,
) {
  const a = await workActor(event),
    v = parse(progressInput, raw);
  return mutation(event, a, 'UptsProjectObject', 'UPDATE', async (tx) => {
    await managed(tx, projectId, a);
    const old = await tx.uptsProjectObject.findFirst({
      where: { id: objectLinkId, projectId },
    });
    if (!old) fail(404, 'Объект проекта не найден.');
    version(old.version, v.version);
    const result = await tx.uptsProjectObject.update({
      where: { id: old.id },
      data: { ...v, version: { increment: 1 } },
    });
    return { id: result.id, value: result };
  });
}
export async function saveContract(
  event: H3Event,
  projectId: number,
  raw: unknown,
  contractId?: number,
) {
  const a = await workActor(event),
    v = parse(contractInput, raw);
  return mutation(
    event,
    a,
    'UptsContract',
    contractId ? 'UPDATE' : 'CREATE',
    async (tx) => {
      await managed(tx, projectId, a);
      const old = contractId
        ? await tx.uptsContract.findFirst({
            where: { id: contractId, projectId },
          })
        : await tx.uptsContract.findUnique({
            where: { clientKey: v.clientKey },
          });
      if (contractId && !old) fail(404, 'Договор не найден.');
      if (old && old.projectId !== projectId)
        fail(409, 'Ключ операции уже использован.');
      if (!contractId && old) {
        await ensureContractDirectory(projectId, old.id);
        return { id: old.id, value: old, changed: false };
      }
      if (old) version(old.version, v.version);
      const data = {
        number: v.number,
        name: v.name,
        counterparty: v.counterparty,
        signedDate: dbDay(v.signedDate),
        dueDate: dbDay(v.dueDate),
      };
      const result = old
        ? await tx.uptsContract.update({
            where: { id: old.id },
            data: { ...data, version: { increment: 1 } },
          })
        : await tx.uptsContract.create({
            data: { ...data, projectId, clientKey: v.clientKey },
          });
      await ensureContractDirectory(projectId, result.id);
      return { id: result.id, value: result };
    },
  );
}
const templateInput = z
  .object({
    objectId: id.nullable(),
    items: z
      .array(
        z
          .object({
            clientKey: z.string().uuid(),
            title: z.string().trim().min(1).max(250),
          })
          .strict(),
      )
      .min(1)
      .max(50),
  })
  .strict()
  .refine(
    (v) => new Set(v.items.map((i) => i.clientKey)).size === v.items.length,
  );
export async function applyTemplate(
  event: H3Event,
  projectId: number,
  raw: unknown,
) {
  const a = await workActor(event),
    v = parse(templateInput, raw);
  return mutation(event, a, 'UptsTemplate', 'APPLY', async (tx) => {
    await managed(tx, projectId, a);
    if (
      v.objectId &&
      !(await tx.uptsProjectObject.findFirst({
        where: { id: v.objectId, projectId },
      }))
    )
      fail(400, 'Объект не принадлежит проекту.');
    let created = 0;
    for (const item of v.items) {
      const old = await tx.workTask.findUnique({
        where: { clientKey: item.clientKey },
      });
      if (old) {
        if (
          old.projectId !== projectId ||
          old.creatorId !== a.id ||
          old.uptsObjectId !== v.objectId ||
          old.title !== item.title ||
          old.deletedAt
        )
          fail(409, 'Ключ задачи уже использован.');
        continue;
      }
      await tx.workTask.create({
        data: {
          ...item,
          projectId,
          creatorId: a.id,
          visibility: 'PROJECT',
          uptsObjectId: v.objectId,
        },
      });
      created++;
    }
    return {
      id: projectId,
      value: { id: projectId, created },
      changed: created > 0,
    };
  });
}
export async function createDemo(event: H3Event, raw: unknown) {
  const a = await workActor(event),
    v = parse(z.object({ clientKey: z.string().uuid() }).strict(), raw),
    today = portalToday();
  return mutation(event, a, 'WorkProject', 'CREATE_DEMO', async (tx) => {
    const old = await tx.workProject.findUnique({
      where: { clientKey: v.clientKey },
    });
    if (old) {
      if (old.ownerId !== a.id) fail(409, 'Ключ операции уже использован.');
      return { id: old.id, value: { id: old.id }, changed: false };
    }
    const p = await tx.workProject.create({
      data: {
        clientKey: v.clientKey,
        name: 'ДЕМО · Подготовка территории автодороги',
        description:
          'Учебный проект: три объекта на разных стадиях. Все сведения условные.',
        ownerId: a.id,
        scope: 'PRIVATE',
        startDate: dbDay(shiftDay(today, -20)),
        dueDate: dbDay(shiftDay(today, 45)),
        upts: {
          create: {
            projectType: 'LAND',
            status: 'ACTIVE',
            basis: 'Демонстрационное поручение',
            initiator: 'Учебный пример',
            receivedDate: dbDay(shiftDay(today, -21)),
            isDemo: true,
          },
        },
      },
    });
    const names = [
      'Участок 01 · транспортная развязка',
      'Участок 02 · полоса отвода',
      'Объект 03 · подъездная дорога',
    ];
    for (let i = 0; i < 3; i++) {
      const o = await tx.uptsProjectObject.create({
        data: {
          project: { connect: { projectId: p.id } },
          object: {
            create: {
              clientKey: randomUUID(),
              name: names[i]!,
              address: 'Условная территория · демонстрационные данные',
            },
          },
          goal: 'Подготовить комплект материалов для строительства',
          cadastral: i === 0 ? 'ACTIVE' : 'DONE',
          rights: i === 0 ? 'TODO' : i === 1 ? 'BLOCKED' : 'DONE',
          restrictions: i === 2 ? 'DONE' : 'ACTIVE',
          documents: i === 2 ? 'DONE' : 'TODO',
          handover: i === 2 ? 'ACTIVE' : 'TODO',
          note: i === 1 ? 'Ожидаем исходные документы от инициатора' : '',
        },
      });
      for (let j = 0; j < 3; j++)
        await tx.workTask.create({
          data: {
            clientKey: randomUUID(),
            projectId: p.id,
            uptsObjectId: o.id,
            creatorId: a.id,
            assigneeId: j === 2 ? null : a.id,
            visibility: 'PROJECT',
            title: [
              'Проверить исходные сведения',
              'Подготовить материалы оформления',
              'Согласовать комплект документов',
            ][j]!,
            status:
              i === 2 && j < 2 ? 'DONE' : j === 0 ? 'IN_PROGRESS' : 'TODO',
            startDate: dbDay(shiftDay(today, -5)),
            dueDate: dbDay(
              shiftDay(today, i === 1 && j === 0 ? -2 : 7 + i * 5 + j),
            ),
            priority: i === 1 ? 'HIGH' : 'NORMAL',
            blockedReason:
              i === 1 && j === 0 ? 'Ожидаем исходные документы' : '',
          },
        });
    }
    const c = await tx.uptsContract.create({
      data: {
        clientKey: randomUUID(),
        projectId: p.id,
        number: 'ДЕМО-01',
        name: 'Подготовка кадастровых материалов',
        counterparty: 'Условный контрагент',
      },
    });
    await ensureProjectDirectory(p.id);
    await ensureContractDirectory(p.id, c.id);
    return { id: p.id, value: { id: p.id } };
  });
}
