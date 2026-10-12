import { z } from 'zod';
const id = z.number().int().positive().max(2147483647);
const name = z.string().trim().min(1).max(120);
export const groupCreateInput = z.object({ clientId: z.string().uuid(), name, userIds: z.array(id).min(1).max(99) }).strict();
export const groupChangeInput = z.discriminatedUnion('action', [
 z.object({ action: z.literal('rename'), name }).strict(),
 z.object({ action: z.literal('add'), userIds: z.array(id).min(1).max(99) }).strict(),
 z.object({ action: z.literal('remove'), userId: id }).strict(),
 z.object({ action: z.literal('role'), userId: id, role: z.enum(['ADMIN','MEMBER']) }).strict(),
 z.object({ action: z.literal('transfer'), userId: id }).strict(),
 z.object({ action: z.literal('leave') }).strict(),
 z.object({ action: z.literal('archive'), archived: z.boolean() }).strict(),
]);
export type GroupChange = z.infer<typeof groupChangeInput>;
