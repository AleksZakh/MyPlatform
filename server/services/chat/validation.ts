import { z } from 'zod';
export const messageInput = z.object({ clientId: z.string().uuid(), body: z.string().trim().min(1).max(4000) }).strict();
export const recipientInput = z.object({ userId: z.number().int().positive().max(2147483647) }).strict();
export const readInput = z.object({ through: z.number().int().positive().max(2147483647) }).strict();
export function pairKey(a: number, b: number) { return [a, b].sort((x, y) => x - y).join(':'); }
