import { z } from 'zod';
import { uptsMetaInput } from '../upts-input';
import { createError } from 'h3';
const id = z.number().int().positive().max(2147483647);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => {
 const d = new Date(v+'T00:00:00Z'); return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10) === v && v >= '1900-01-01' && v <= '2200-12-31';
}, 'Неверная дата').nullable();
const base = { uptsObjectId: id.nullable().optional(), title: z.string().trim().min(1).max(250), description: z.string().trim().max(20000),
 kind: z.enum(['TASK','BUG','IMPROVEMENT','RESEARCH','MILESTONE']), status: z.enum(['TODO','IN_PROGRESS','REVIEW','DONE']),
 priority: z.enum(['LOW','NORMAL','HIGH','URGENT']), visibility: z.enum(['PRIVATE','PARTICIPANTS','DEPARTMENT','PROJECT']),
 projectId: id.nullable(), departmentId: id.nullable(), assigneeId: id.nullable(),
 participantIds: z.array(id).max(50).refine(v => new Set(v).size === v.length),
 plannedDate: day, startDate: day, dueDate: day, blockedReason: z.string().trim().max(1000) };
export const taskInput = z.object({ ...base, clientKey: z.string().uuid(), version: id.optional() }).strict()
 .refine(v => !v.startDate || !v.dueDate || v.startDate <= v.dueDate, 'Начало позже срока завершения');
export const taskMove = z.object({ version: id, status: base.status.optional(), plannedDate: day.optional() }).strict()
 .refine(v => v.status !== undefined || v.plannedDate !== undefined);
export const projectInput = z.object({ upts:uptsMetaInput.optional(), clientKey: z.string().uuid(), version: id.optional(), name: z.string().trim().min(1).max(200),
 description: z.string().trim().max(20000), color: z.string().regex(/^#[0-9a-fA-F]{6}$/), scope: z.enum(['PRIVATE','TEAM','DEPARTMENT','GROUP']),
 departmentId: id.nullable(), groupId: id.nullable().optional(), startDate: day, dueDate: day }).strict()
 .refine(v => !v.startDate || !v.dueDate || v.startDate <= v.dueDate, 'Начало позже срока завершения');
export const memberInput = z.object({ version: id, userId: id, role: z.enum(['MANAGER','CURATOR','MEMBER','OBSERVER']) }).strict();
export const removeMemberInput = z.object({ version: id, userId: id, reassignTo: id.nullable().optional() }).strict();
export const versionInput = z.object({ version: id }).strict();
export const archiveInput = z.object({ version: id, archived: z.boolean() }).strict();
export const commentInput = z.object({ clientKey: z.string().uuid(), body: z.string().trim().min(1).max(5000) }).strict();
export function parse<T>(schema: z.ZodType<T>, input: unknown): T {
 const result = schema.safeParse(input); if (!result.success) throw createError({ statusCode: 400, message: 'Проверьте поля формы.', data: { issues: result.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })) } });
 return result.data;
}
export function positiveId(value: unknown): number {
 if (!/^\d+$/.test(String(value))) throw createError({ statusCode: 400, message: 'Неверный идентификатор.' });
 const result=Number(value); if (!Number.isSafeInteger(result) || result < 1 || result > 2147483647) throw createError({statusCode:400}); return result;
}
export const dbDay = (v: string | null) => v ? new Date(v+'T00:00:00Z') : null;
