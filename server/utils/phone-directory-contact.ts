import type { DirectoryUser } from '../services/ad-directory.service';

type RawContact = Record<string, unknown>;

function attribute(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const normalized = attribute(item);
      if (normalized) return normalized;
    }
  }
  return null;
}

/** AD contacts do not have to possess a login or a user account. */
export function normalizePhoneContact(raw: RawContact, directoryObjectId: string): DirectoryUser | null {
  const fullName = attribute(raw.displayName) || attribute(raw.cn) ||
    [attribute(raw.givenName), attribute(raw.sn)].filter(Boolean).join(' ') ||
    attribute(raw.mail);
  if (!fullName) return null;

  return {
    directoryObjectId,
    login: '',
    userPrincipalName: null,
    fullName,
    email: attribute(raw.mail)?.toLowerCase() || null,
    company: attribute(raw.company),
    department: attribute(raw.department),
    position: attribute(raw.title),
    telephoneNumber: attribute(raw.telephoneNumber),
    distinguishedName: attribute(raw.distinguishedName) || attribute(raw.dn),
    userAccountControl: null,
    accountDisabled: false,
  };
}

export function isADContact(raw: RawContact): boolean {
  const value = raw.objectClass;
  const classes = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
  return classes.some(item => typeof item === 'string' && item.toLowerCase() === 'contact');
}
