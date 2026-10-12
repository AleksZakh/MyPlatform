import { z } from 'zod';
// AD identities are opaque strings, not necessarily RFC UUIDs. The live AD lookup
// in provisionInvitationContact still verifies both login and directory identity.
export const invitationTarget = z.union([
 z.object({ userId: z.number().int().positive().max(2147483647) }).strict(),
 z.object({
  directoryLogin: z.string().trim().min(1).max(255),
  directoryObjectId: z.string().trim().min(1).max(255).regex(/^[^\s\u0000-\u001f\u007f]+$/u).optional(),
 }).strict(),
]);
