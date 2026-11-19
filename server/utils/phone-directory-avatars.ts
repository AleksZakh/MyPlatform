import type { DirectoryUser } from '../services/ad-directory.service';

type SpaceAvatarOwner = {
  userId: number;
  avatarVersion: string | null;
  user: { directoryObjectId: string | null; login: string | null };
};

export function phoneDirectoryAvatarUrls(owners: readonly SpaceAvatarOwner[]) {
  const byGuid = new Map<string, SpaceAvatarOwner>();
  const byLogin = new Map<string, SpaceAvatarOwner>();

  for (const owner of owners) {
    if (!owner.avatarVersion) continue;
    const guid = owner.user.directoryObjectId?.trim().toLowerCase();
    const login = owner.user.login?.trim().toLowerCase();
    if (guid) byGuid.set(guid, owner);
    if (login) byLogin.set(login, owner);
  }

  return (contact: Pick<DirectoryUser, 'directoryObjectId' | 'login'>): string | null => {
    const guid = contact.directoryObjectId?.trim().toLowerCase();
    const login = contact.login.trim().toLowerCase();
    const owner = (guid ? byGuid.get(guid) : undefined) || (login ? byLogin.get(login) : undefined);
    // A matching login must never override a different, known AD objectGUID.
    if (!owner || (guid && owner.user.directoryObjectId && owner.user.directoryObjectId.trim().toLowerCase() !== guid)) {
      return null;
    }
    return `/api/contacts/avatars/${owner.userId}?v=${encodeURIComponent(owner.avatarVersion!)}`;
  };
}
