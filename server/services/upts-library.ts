import {ensureObjectStorage} from './upts-storage';
import {addObjectMember,queueUptsNotice} from './upts-workflow';
import {workStagesSchema,checkNewWorkStages} from './upts-work-stages';
import type {UptsObjectDetails} from '../../shared/types/upts-object';
import { objectDetailsSchema, checkObjectKind, checkObjectPeople, checkObjectSchedule } from './upts-object-input';
import { validWorkKind } from '../../shared/utils/upts-work-kinds';
import { uptsContractColor } from '../../shared/utils/upts-color';
import { uptsPeople } from './upts-people';
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
const stableJson=(value:unknown):string => JSON.stringify(value,(_key,v)=>v && typeof v==='object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])) : v);
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
const workInput = entry.extend({responsibleRole:z.enum(["CURATOR","ENGINEER"]).nullable().optional(),expectedResult:z.string().trim().max(2000).optional()}).strict();
const templateInput = entry
  .extend({ workIds: z.array(id).min(1).max(50), workKindKey:z.string().max(40).nullable().optional() })
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
    v = parse(workInput, raw);
  return transact(event, a, async (tx) => {
    const old = await tx.uptsWorkDefinition.findUnique({
      where: workId ? { id: workId } : { clientKey: v.clientKey },
    });
    if (workId && !old) fail(404, "Работа не найдена.");
    if (!workId && old) {
      if (old.name !== v.name || old.contractType !== v.contractType || (v.responsibleRole!==undefined && old.responsibleRole!==v.responsibleRole) || (v.expectedResult!==undefined && old.expectedResult!==v.expectedResult))
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
      ...(v.responsibleRole!==undefined?{responsibleRole:v.responsibleRole}:{}),
      ...(v.expectedResult!==undefined?{expectedResult:v.expectedResult}:{}),
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
  if(!validWorkKind(v.contractType,v.workKindKey)) fail(400,"Вид работ не соответствует типу объекта.");
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
        (v.workKindKey!==undefined && old.workKindKey!==v.workKindKey) ||
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
      ...(v.workKindKey!==undefined?{workKindKey:v.workKindKey}:{}),
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
  workStages: workStagesSchema,
  templateId: id.nullable(),
  templateVersion: id.nullable(),
  manualWorks: z.array(z.string().trim().min(1).max(250)).max(50),
};
const selectedWorksSchema=z.array(z.object({id,version:id}).strict()).max(50)
  .refine(items=>new Set(items.map(w=>w.id)).size===items.length,'Работы не должны повторяться.').optional();
type ResolvedWork={name:string;definitionId:number|undefined;responsibleRole:string|null;expectedResult:string;workKindKey:string|null;workKindKeys?:string[]};
async function titlesFor(
  tx: DB,
  type: string | null,
  v: {
    templateId: number | null;
    templateVersion: number | null;
    manualWorks: string[];
    selectedWorks?: { id: number; version: number }[];
    workKindKey?:string|null;
    workKindKeys?:string[];
  },
  allowManual = false,
):Promise<ResolvedWork[]> {
  if(!validWorkKind(type,v.workKindKey))fail(400,"Вид работ не соответствует типу объекта.");
  const selected = v.selectedWorks || [];
  if (Number(!!v.templateId) + Number(!!v.manualWorks.length) + Number(!!selected.length) > 1)
    fail(400, "Выберите один способ добавления: библиотека, шаблон или ручной ввод.");
  if (selected.length) {
    const matrix=v.workKindKeys ? await tx.uptsWorkTemplate.findMany({where:{active:true,contractType:type!,workKindKey:{in:v.workKindKeys}},include:includeItems}) : null;
    const rows = await tx.uptsWorkDefinition.findMany({where:{id:{in:selected.map(w=>w.id)}}});
    return selected.map(item=>{
      const work=rows.find(w=>w.id===item.id);
      if(!work || !work.active || work.contractType!==type)
        fail(400,'Работа недоступна или не соответствует типу объекта. Обновите библиотеку.');
      version(work.version,item.version);
      const workKindKeys=v.workKindKeys?.filter(key=>matrix?.some(t=>t.workKindKey===key && t.items.some(i=>i.workId===work.id)));
      if(workKindKeys && !workKindKeys.length)fail(400,'Работа не входит в выбранные виды работ. Обновите библиотеку.');
      return {name:work.name,definitionId:work.id,responsibleRole:work.responsibleRole,expectedResult:work.expectedResult,workKindKey:workKindKeys?.[0] || v.workKindKey || null,...(workKindKeys?{workKindKeys}:{})};
    });
  }
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
      fail(400, "Шаблон недоступен или не соответствует типу объекта.");
    version(t.version, v.templateVersion ?? undefined);
    if(v.workKindKey && t.workKindKey!==v.workKindKey)fail(400,"Шаблон не соответствует виду работ.");
    return t.items.map((i) => ({name:i.work.name,definitionId:i.work.id,responsibleRole:i.work.responsibleRole,expectedResult:i.work.expectedResult,workKindKey:t.workKindKey}));
  }
  if (v.manualWorks.length && type !== "OTHER" && !allowManual)
    fail(
      400,
      "Ручной состав предназначен для типа «Иное». Для других типов выберите шаблон.",
    );
  if (v.manualWorks.length && !type) fail(400,"Сначала укажите тип объекта в карточке.");
  return v.manualWorks.map(name=>({name,definitionId:undefined,responsibleRole:null,expectedResult:"",workKindKey:v.workKindKey || null}));
}
async function managedContract(tx: DB, a: Actor, contractId: number) {
  const c = await tx.uptsContract.findUnique({ where: { id: contractId } });
  if (!c || c.deletedAt) fail(404, "Объект не найден.");
  const p = await visibleProject(tx, c.projectId, a);
  if (!managesProject(p, a) || p.archivedAt)
    fail(403, "Изменения доступны руководителю активного проекта объекта.");
  return c;
}
async function addWorks(
  tx: DB,
  event: H3Event,
  a: Actor,
  c: { id: number; projectId: number;number:string;objectDetails:unknown },
  titles: Awaited<ReturnType<typeof titlesFor>>,
  workStages?: number[],
) {
  const details=c.objectDetails as UptsObjectDetails|null;
  const assigneeId=details?.engineerId || null;
  if(assigneeId){const p=await visibleProject(tx,c.projectId,a);await addObjectMember(tx,p,assigneeId);}
  const taskIds: number[] = [];
  for (let i = 0; i < titles.length; i++) {
    const task = await tx.workTask.create({
      data: {
        clientKey: randomUUID(),
        title: titles[i]!.name,
        uptsWorkMeta: {...(titles[i]!.workKindKeys?{workKindKeys:titles[i]!.workKindKeys}:{}),...(workStages ? {stageNumber:workStages[i]} : {}),definitionId:titles[i]!.definitionId,workKindKey:titles[i]!.workKindKey,responsibleRole:titles[i]!.responsibleRole,expectedResult:titles[i]!.expectedResult},
        projectId: c.projectId,
        uptsContractId: c.id,
        creatorId: a.id,
        assigneeId,
        visibility: "PROJECT",
      },
    });
    await audit(tx, event, a, "WorkTask", task.id, "CREATE", {
      id: task.id,
      title: task.title,
      projectId: c.projectId,
      uptsContractId: c.id,
      status: task.status,
      assigneeId:task.assigneeId,
      uptsWorkMeta:task.uptsWorkMeta,
    });
    await queueUptsNotice(tx,`created:${task.id}`,a.id,assigneeId,task.id,`Вам назначена работа «${task.title}» по объекту «${c.number}». Распределите работы между кадастровыми инженерами.`);
    taskIds.push(task.id);
  }
  return taskIds;
}
const contractInput = z
  .object({
    clientKey: z.string().uuid(),
    projectId: id.nullable().default(null),
    visibility: z.enum(["PRIVATE","TEAM","UPTS_DEPARTMENT","UPTS_ALL"]).optional(),
    memberIds: z.array(id).max(200).default([]),
    number: z.string().trim().min(1).max(100),
    name: z.string().trim().min(1).max(250),
    counterparty: z.string().trim().max(250),
    signedDate: uptsDay,
    dueDate: uptsDay,
    contractType: contractTypeSchema,
    objectDetails:objectDetailsSchema.optional(),
    selectedWorks:selectedWorksSchema,
    ...selection,
  })
  .strict()
  .refine(
    (v) => !v.signedDate || !v.dueDate || v.signedDate <= v.dueDate,
    "Дата объекта позже срока.",
  );
export async function createContract(event: H3Event, raw: unknown) {
  const a = await uptsActor(event),
    v = parse(contractInput, raw);
  checkObjectKind(v.contractType,v.objectDetails);
  if(v.selectedWorks!==undefined && (v.templateId || v.manualWorks.length))fail(400,'Выберите один способ добавления работ.');
  if(v.selectedWorks?.length && !v.objectDetails?.workKindKeys?.length)fail(400,'Выберите виды работ для объекта.');
  checkObjectSchedule(v.objectDetails,v.dueDate);
  await checkObjectPeople(event,v.objectDetails);
  if(v.projectId && v.visibility) fail(400,'Для выбранной видимости создайте отдельный объект.');
  if(v.visibility==='TEAM' && !v.memberIds.some(id=>id!==a.id)) fail(400,'Выберите сотрудников.');
  if(v.visibility!=='TEAM' && v.memberIds.length) fail(400,'Список сотрудников допустим только для групповой видимости.');
  const staffIds=v.memberIds.length ? new Set((await uptsPeople(event)).map(u=>u.id)) : new Set<number>();
  if(v.memberIds.some(id=>!staffIds.has(id))) fail(400,'Выберите активных сотрудников УПТС.');
  return transact(event, a, async (tx) => {
    const old = await tx.uptsContract.findUnique({
      where: { clientKey: v.clientKey },
    });
    if (old) {
      if(old.deletedAt)fail(409,'Объект удалён. Создайте новую карточку.');
      const oldProject = await visibleProject(tx,old.projectId,a);
      await managedContract(tx, a, old.id);
      if(v.visibility && oldProject.scope!==v.visibility) fail(409,'Ключ операции уже использован с другой видимостью.');
      if(v.visibility==='TEAM' && [...new Set(v.memberIds)].filter(id=>id!==a.id).sort((a,b)=>a-b).join()!==oldProject.members.filter(m=>m.userId!==(old.objectDetails as UptsObjectDetails|null)?.engineerId || v.memberIds.includes(m.userId)).map(m=>m.userId).sort((a,b)=>a-b).join()) fail(409,'Ключ операции уже использован с другим составом сотрудников.');
      if (
        old.number !== v.number ||
        old.name !== v.name ||
        old.contractType !== v.contractType ||
        (v.objectDetails!==undefined && stableJson(old.objectDetails)!==stableJson(v.objectDetails))
      )
        fail(409, "Ключ операции уже использован.");
      if(v.workStages || v.selectedWorks!==undefined){
        const initial=await tx.auditLog.findFirst({where:{entityType:'UptsContract',entityId:old.id,action:'CREATE'},orderBy:{id:'asc'}});
        const original=initial?.afterData as {workStages?:number[];selectedWorks?:{id:number;version:number}[]}|null;
        if(v.workStages && stableJson(original?.workStages || [])!==stableJson(v.workStages))fail(409,'Ключ операции уже использован с другим распределением по этапам.');
        if(v.selectedWorks!==undefined && stableJson(original?.selectedWorks || [])!==stableJson(v.selectedWorks))fail(409,'Ключ операции уже использован с другим составом работ.');
      }
      await ensureObjectStorage(tx,old);
      return old;
    }
    const titles = await titlesFor(tx, v.contractType, {...v,...(v.selectedWorks!==undefined?{workKindKeys:v.objectDetails?.workKindKeys || []}:{})});
    checkNewWorkStages(v.workStages,titles.length,v.objectDetails);
    if(v.objectDetails?.workKindKey && v.templateId && titles.some(w=>w.workKindKey!==v.objectDetails!.workKindKey)) fail(400,"Шаблон не соответствует выбранному виду работ.");
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
          scope: v.visibility || "UPTS_DEPARTMENT",
          members: {create:[...new Set(v.memberIds)].filter(id=>id!==a.id).map(userId=>({userId,role:'MEMBER'}))},
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
        memberIds: v.memberIds,
        reason: "Рабочая область объекта УПТС",
      });
    }
    let c = await tx.uptsContract.create({
      data: {
        clientKey: v.clientKey,
        projectId,
        number: v.number,
        name: v.name,
        counterparty: v.counterparty,
        contractType: v.contractType,
        objectDetails:v.objectDetails || {},
        signedDate: dbDay(v.signedDate),
        dueDate: dbDay(v.dueDate),
      },
    });
    c = await tx.uptsContract.update({where:{id:c.id},data:{color:uptsContractColor(c.id)}});
    if(!v.projectId) await tx.workProject.update({where:{id:projectId},data:{color:c.color!}});
    c={...c,storageFolder:await ensureObjectStorage(tx,c)};
    const taskIds = await addWorks(tx, event, a, c, titles, v.workStages);
    await audit(tx, event, a, "UptsContract", c.id, "CREATE", {
      ...c,
      templateId: v.templateId,
      templateVersion: v.templateVersion,
      taskIds,
      selectedWorks:v.selectedWorks || [],
      workStages: v.workStages || [],
      works: titles.map(w=>w.name),
    });
    return c;
  });
}
// A stable key is persisted with the operation; retries cannot duplicate a whole set.
const applyInput = z
  .object({ clientKey: z.string().uuid(), contractVersion: id, ...selection, workKindKey:z.string().max(40).nullable().optional(),
    selectedWorks:selectedWorksSchema,
  })
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
      ...(v.workKindKey ? {workKindKey:v.workKindKey} : {}),
      // Preserve fingerprints of template/manual requests created before this update.
      ...(v.selectedWorks?.length ? {selectedWorks:v.selectedWorks} : {}),
      ...(v.workStages ? {workStages:v.workStages} : {}),
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
    const titles = await titlesFor(tx, c.contractType, v, true);
    checkNewWorkStages(v.workStages,titles.length,c.objectDetails as UptsObjectDetails);
    if (!titles.length)
      fail(
        400,
        "Выберите работу из библиотеки, непустой шаблон или введите название работы.",
      );
    const taskIds = await addWorks(tx, event, a, c, titles, v.workStages);
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
      selectedWorks: v.selectedWorks || [],
      workStages: v.workStages || [],
      works: titles.map(w=>w.name),
      taskIds,
    });
    return { created: titles.length };
  });
}

export async function contractStageWorks(event:H3Event,contractId:number){
  const a=await uptsActor(event),c=await managedContract(prisma,a,contractId);
  const tasks=await prisma.workTask.findMany({where:{uptsContractId:c.id,deletedAt:null},orderBy:{id:'asc'},select:{id:true,version:true,title:true,status:true,uptsWorkMeta:true}});
  return {contractVersion:c.version,tasks};
}
