import { AccessAction } from '@prisma/client';
import type { H3Event } from 'h3';
import { getAccessActor, requirePermission } from '../services/access-control.service';
import type { DirectoryUser } from '../services/ad-directory.service';

export function directoryKey(user: DirectoryUser): string {
  const guid = user.directoryObjectId?.trim().toLowerCase();
  return guid ? `guid:${guid}` : `login:${user.login.trim().toLowerCase()}`;
}

export async function directoryEditor(event: H3Event) {
  const actor = await getAccessActor(event);
  let admin = actor.isSystemAdmin;
  if (!admin) {
    try {
      await requirePermission(event, 'admin.users', AccessAction.UPDATE, { auditDenial: false });
      admin = true;
    } catch (error: unknown) {
      const code = (error as { statusCode?: number }).statusCode;
      if (code !== 403) throw error;
    }
  }
  return { user: actor.user, admin };
}

export function mayEditContact(
  actor: Awaited<ReturnType<typeof directoryEditor>>,
  contact: DirectoryUser,
) {
  if (actor.admin) return true;
  const ownGuid = actor.user.directoryObjectId?.trim().toLowerCase();
  if (ownGuid && contact.directoryObjectId) {
    return ownGuid === contact.directoryObjectId.trim().toLowerCase();
  }
  return !!actor.user.login && actor.user.login.trim().toLowerCase() === contact.login.trim().toLowerCase();
}
