import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { H3Event } from "h3";
import type { Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma";
import { writeAuditEvent, computeAuditDelta } from "../utils/auditLog";
import { uptsActor } from "./upts-access";
import { hasWorkGrant } from "./work/access";
import { parse, dbDay } from "./work/input";
import { uptsDay } from "./upts-input";
import { visibleProject, fail, version } from "./work/service";
import { managesProject, type Actor } from "./work/policy";
import { hasUptsMembership } from "./upts-membership";
import {
  ensureProjectDirectory,
  ensureContractDirectory,
} from "./work/file-storage";

type DB = Prisma.TransactionClient;
const id = z.number().int().positive().max(2147483647);
export const contractTypeSchema = z.enum([
  "LAND",
  "OKS",
  "ZOUIT",
  "IPE",
  "MARKS",
  "OTHER",
]);
const entry = z
  .object({
    clientKey: z.string().uuid(),
    version: id.optional(),
    name: z.string().trim().min(1).max(250),
    contractType: contractTypeSchema,
    active: z.boolean(),
  })
  .strict();
const templateInput = entry
  .extend({ workIds: z.array(id).min(1).max(50) })
  .strict()
  .refine(
    (v) => new Set(v.workIds).size === v.workIds.length,
    "Работы в шаблоне не должны повторяться.",
  );
const includeItems = {
  items: { include: { work: true }, orderBy: { position: "asc" as const } },
};

async function audit(
  tx: DB,
  event: H3Event,
  a: Actor,
  entityType: string,
  entityId: number,
  action: string,
  after: unknown,
  before?: unknown,
) {
  await writeAuditEvent({
    event,
    db: tx,
    actorUserId: a.id,
    category: "DATA",
    result: "SUCCESS",
    resourceKey: "projects.shared",
    entityType,
    entityId,
    action,
    afterData: JSON.parse(JSON.stringify(after)),
    changes: before
      ? computeAuditDelta(
          before as Record<string, unknown>,
          after as Record<string, unknown>,
        )
      : undefined,
    note: "УПТС: " + action,
  });
}
// Recheck membership under the same lock used by the common work module.
async function transact<T>(
  event: H3Event,
  a: Actor,
  fn: (tx: DB) => Promise<T>,
) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261019)`;
      const user = await tx.user.findUnique({
        where: { id: a.id },
        select: {
          id: true,
          status: true,
          department: { select: { key: true, name: true, isActive: true } },
        },
      });
      if (
        !(await hasUptsMembership(
          tx,
          user,
          !!a.isSystemAdmin,
          a.directoryGroupIds,
        ))
      )
        fail(403, "Доступ к УПТС отозван.");
      return fn(tx);
    },
    { maxWait: 5000, timeout: 15000 },
  );
}
async function editor(event: H3Event) {
  const a = await uptsActor(event);
  if (!a.isSystemAdmin && !(await hasWorkGrant(event, "UPDATE")))
    fail(
      403,
      "Для изменения библиотеки требуется право изменения в разделе «Задачи и проекты».",
    );
  return a;
}
export async function library(event: H3Event) {
  const a = await uptsActor(event);
  const [works, templates, canManage] = await Promise.all([
    prisma.uptsWorkDefinition.findMany({
      orderBy: [{ contractType: "asc" }, { id: "asc" }],
    }),
    prisma.uptsWorkTemplate.findMany({
      include: includeItems,
      orderBy: [{ contractType: "asc" }, { id: "asc" }],
    }),
    a.isSystemAdmin ? Promise.resolve(true) : hasWorkGrant(event, "UPDATE"),
  ]);
  return { works, templates, canManage };
}
export async function saveWork(event: H3Event, raw: unknown, workId?: number) {
  const a = await editor(event),
    v = parse(entry, raw);
  return transact(event, a, async (tx) => {
    const old = await tx.uptsWorkDefinition.findUnique({
      where: workId ? { id: workId } : { clientKey: v.clientKey },
    });
    if (workId && !old) fail(404, "Работа не найдена.");
    if (!workId && old) {
      if (old.name !== v.name || old.contractType !== v.contractType)
        fail(409, "Ключ операции уже использован.");
      return old;
    }
    if (old) {
      version(old.version, v.version);
      if (old.contractType !== v.contractType)
        fail(
          400,
          "Тип существующей работы менять нельзя. Создайте другую работу.",
        );
    }
    if (
      await tx.uptsWorkDefinition.findFirst({
        where: {
          name: v.name,
          contractType: v.contractType,
          ...(old ? { id: { not: old.id } } : {}),
        },
      })
    )
      fail(409, "Работа с таким названием уже существует для этого типа.");
    const data = {
      name: v.name,
      contractType: v.contractType,
      active: v.active,
    };
    const saved = old
      ? await tx.uptsWorkDefinition.update({
          where: { id: old.id },
          data: { ...data, version: { increment: 1 } },
        })
      : await tx.uptsWorkDefinition.create({
          data: { ...data, clientKey: v.clientKey },
        });
    // A renamed/archived work changes template previews: invalidate their versions too.
    if (old)
      await tx.uptsWorkTemplate.updateMany({
        where: { items: { some: { workId: saved.id } } },
        data: { version: { increment: 1 } },
      });
    await audit(
      tx,
      event,
      a,
      "UptsWorkDefinition",
      saved.id,
      old
        ? old.active !== saved.active
          ? saved.active
            ? "RESTORE"
            : "ARCHIVE"
          : "UPDATE"
        : "CREATE",
      saved,
      old,
    );
    return saved;
  });
}
export async function saveWorkTemplate(
  event: H3Event,
  raw: unknown,
  templateId?: number,
) {
  const a = await editor(event),
    v = parse(templateInput, raw);
  return transact(event, a, async (tx) => {
    const old = await tx.uptsWorkTemplate.findUnique({
      where: templateId ? { id: templateId } : { clientKey: v.clientKey },
      include: includeItems,
    });
    if (templateId && !old) fail(404, "Шаблон не найден.");
    if (!templateId && old) {
      if (
        old.name !== v.name ||
        old.contractType !== v.contractType ||
        JSON.stringify(old.items.map((i) => i.workId)) !==
          JSON.stringify(v.workIds)
      )
        fail(409, "Ключ операции уже использован.");
      return old;
    }
    if (old) {
      version(old.version, v.version);
      if (old.contractType !== v.contractType)
        fail(
          400,
          "Тип существующего шаблона менять нельзя. Создайте копию для другого типа.",
        );
    }
    if (
      await tx.uptsWorkTemplate.findFirst({
        where: {
          name: v.name,
          contractType: v.contractType,
          ...(old ? { id: { not: old.id } } : {}),
        },
      })
    )
      fail(409, "Шаблон с таким названием уже существует для этого типа.");
    const works = await tx.uptsWorkDefinition.findMany({
      where: {
        id: { in: v.workIds },
        contractType: v.contractType,
        ...(v.active ? { active: true } : {}),
      },
    });
    if (works.length !== v.workIds.length)
      fail(
        400,
        "Выберите действующие работы одного типа. Для архивирования допускаются архивные работы.",
      );
    const data = {
      name: v.name,
      contractType: v.contractType,
      active: v.active,
    };
    const saved = old
      ? await tx.uptsWorkTemplate.update({
          where: { id: old.id },
          data: { ...data, version: { increment: 1 } },
        })
      : await tx.uptsWorkTemplate.create({
          data: { ...data, clientKey: v.clientKey },
        });
    await tx.uptsWorkTemplateItem.deleteMany({
      where: { templateId: saved.id },
    });
    await tx.uptsWorkTemplateItem.createMany({
      data: v.workIds.map((workId, position) => ({
        templateId: saved.id,
        workId,
        position,
      })),
    });
    const result = await tx.uptsWorkTemplate.findUniqueOrThrow({
      where: { id: saved.id },
      include: includeItems,
    });
    await audit(
      tx,
      event,
      a,
      "UptsWorkTemplate",
      saved.id,
      old
        ? old.active !== saved.active
          ? saved.active
            ? "RESTORE"
            : "ARCHIVE"
          : "UPDATE"
        : "CREATE",
      result,
      old,
    );
    return result;
  });
}
const selection = {
  templateId: id.nullable(),
  templateVersion: id.nullable(),
  manualWorks: z.array(z.string().trim().min(1).max(250)).max(50),
};
async function titlesFor(
  tx: DB,
  type: string | null,
  v: {
    templateId: number | null;
    templateVersion: number | null;
    manualWorks: string[];
  },
) {
  if (v.templateId) {
    if (v.manualWorks.length)
      fail(400, "Выберите шаблон или ручной состав работ.");
    const t = await tx.uptsWorkTemplate.findUnique({
      where: { id: v.templateId },
      include: includeItems,
    });
    if (
      !t ||
      !t.active ||
      t.contractType !== type ||
      t.items.some((i) => !i.work.active || i.work.contractType !== type)
    )
      fail(400, "Шаблон недоступен или не соответствует типу договора.");
    version(t.version, v.templateVersion ?? undefined);
    return t.items.map((i) => i.work.name);
  }
  if (v.manualWorks.length && type !== "OTHER")
    fail(
      400,
      "Ручной состав предназначен для типа «Иное». Для других типов выберите шаблон.",
    );
  return v.manualWorks;
}
async function managedContract(tx: DB, a: Actor, contractId: number) {
  const c = await tx.uptsContract.findUnique({ where: { id: contractId } });
  if (!c) fail(404, "Договор не найден.");
  const p = await visibleProject(tx, c.projectId, a);
  if (!managesProject(p, a) || p.archivedAt)
    fail(403, "Изменения доступны руководителю активного проекта договора.");
  return c;
}
async function addWorks(
  tx: DB,
  event: H3Event,
  a: Actor,
  c: { id: number; projectId: number },
  titles: string[],
  keys?: string[],
) {
  const taskIds: number[] = [];
  for (let i = 0; i < titles.length; i++) {
    const task = await tx.workTask.create({
      data: {
        clientKey: keys?.[i] ?? randomUUID(),
        title: titles[i]!,
        projectId: c.projectId,
        uptsContractId: c.id,
        creatorId: a.id,
        visibility: "PROJECT",
      },
    });
    await audit(tx, event, a, "WorkTask", task.id, "CREATE", {
      id: task.id,
      title: task.title,
      projectId: c.projectId,
      uptsContractId: c.id,
      status: task.status,
    });
    taskIds.push(task.id);
  }
  return taskIds;
}
const contractInput = z
  .object({
    clientKey: z.string().uuid(),
    projectId: id.nullable(),
    number: z.string().trim().min(1).max(100),
    name: z.string().trim().min(1).max(250),
    counterparty: z.string().trim().max(250),
    signedDate: uptsDay,
    dueDate: uptsDay,
    contractType: contractTypeSchema,
    ...selection,
  })
  .strict()
  .refine(
    (v) => !v.signedDate || !v.dueDate || v.signedDate <= v.dueDate,
    "Дата договора позже срока.",
  );
export async function createContract(event: H3Event, raw: unknown) {
  const a = await uptsActor(event),
    v = parse(contractInput, raw);
  return transact(event, a, async (tx) => {
    const old = await tx.uptsContract.findUnique({
      where: { clientKey: v.clientKey },
    });
    if (old) {
      await managedContract(tx, a, old.id);
      if (
        old.number !== v.number ||
        old.name !== v.name ||
        old.contractType !== v.contractType
      )
        fail(409, "Ключ операции уже использован.");
      await ensureContractDirectory(old.projectId, old.id);
      return old;
    }
    const titles = await titlesFor(tx, v.contractType, v);
    let projectId = v.projectId;
    if (projectId) {
      const p = await visibleProject(tx, projectId, a);
      if (
        !managesProject(p, a) ||
        p.archivedAt ||
        !(await tx.uptsProject.findUnique({ where: { projectId } }))
      )
        fail(
          403,
          "Выберите доступный активный проект УПТС, которым вы управляете.",
        );
    } else {
      const p = await tx.workProject.create({
        data: {
          clientKey: randomUUID(),
          name: (v.number + " · " + v.name).slice(0, 200),
          ownerId: a.id,
          scope: "PRIVATE",
          dueDate: dbDay(v.dueDate),
          upts: { create: { projectType: "OTHER" } },
        },
      });
      projectId = p.id;
      await ensureProjectDirectory(p.id);
      await audit(tx, event, a, "WorkProject", p.id, "CREATE", {
        id: p.id,
        name: p.name,
        scope: p.scope,
        ownerId: a.id,
        reason: "Рабочая область договора УПТС",
      });
    }
    const c = await tx.uptsContract.create({
      data: {
        clientKey: v.clientKey,
        projectId,
        number: v.number,
        name: v.name,
        counterparty: v.counterparty,
        contractType: v.contractType,
        signedDate: dbDay(v.signedDate),
        dueDate: dbDay(v.dueDate),
      },
    });
    await ensureContractDirectory(projectId, c.id);
    const taskIds = await addWorks(tx, event, a, c, titles);
    await audit(tx, event, a, "UptsContract", c.id, "CREATE", {
      ...c,
      templateId: v.templateId,
      templateVersion: v.templateVersion,
      taskIds,
      works: titles,
    });
    return c;
  });
}
// A stable key is persisted with the operation; retries cannot duplicate a whole set.
const applyInput = z
  .object({ clientKey: z.string().uuid(), contractVersion: id, ...selection })
  .strict();
export async function applyContractWorks(
  event: H3Event,
  contractId: number,
  raw: unknown,
) {
  const a = await uptsActor(event),
    v = parse(applyInput, raw);
  return transact(event, a, async (tx) => {
    const c = await managedContract(tx, a, contractId);
    const prior = await tx.uptsWorkApplication.findUnique({
      where: { clientKey: v.clientKey },
    });
    const fingerprint = JSON.stringify({
      contractId,
      templateId: v.templateId,
      templateVersion: v.templateVersion,
      manualWorks: v.manualWorks,
    });
    if (prior) {
      if (
        prior.contractId !== contractId ||
        prior.actorId !== a.id ||
        prior.fingerprint !== fingerprint
      )
        fail(409, "Ключ операции уже использован.");
      return { created: prior.count };
    }
    version(c.version, v.contractVersion);
    const titles = await titlesFor(tx, c.contractType, v);
    if (!titles.length)
      fail(
        400,
        "Выберите непустой шаблон или заполните работы для типа «Иное».",
      );
    const taskIds = await addWorks(tx, event, a, c, titles);
    await tx.uptsWorkApplication.create({
      data: {
        clientKey: v.clientKey,
        contractId,
        actorId: a.id,
        fingerprint,
        count: titles.length,
      },
    });
    await tx.uptsContract.update({
      where: { id: c.id },
      data: { version: { increment: 1 } },
    });
    await audit(tx, event, a, "UptsContract", c.id, "APPLY", {
      contractId,
      templateId: v.templateId,
      templateVersion: v.templateVersion,
      works: titles,
      taskIds,
    });
    return { created: titles.length };
  });
}
