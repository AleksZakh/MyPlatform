import type { DirectoryUser } from '../services/ad-directory.service';

function nameParts(value: string): string[] {
  return value.normalize('NFKC').trim().toLocaleLowerCase('ru-RU')
    .replace(/ё/g, 'е').split(/\s+/).filter(Boolean);
}

/**
 * The assignment is supplied by the department configuration, not inferred from
 * a job title. AD currently caches neither a department head nor a manager link.
 * Accept either name order and an optional patronymic, but never fuzzy matches
 * or an arbitrary first namesake. Return only the public card fields.
 */
export function resolveDepartmentManager(
  users: readonly Pick<DirectoryUser, 'fullName' | 'accountDisabled'>[],
  configuredName: string,
): { name: string; avatar: string } {
  const expected = nameParts(configuredName);
  const matches = expected.length >= 2 ? users.filter(user => {
    if (user.accountDisabled || !user.fullName) return false;
    const actual = nameParts(user.fullName);
    return expected.every(part => actual.includes(part));
  }) : [];
  return {
    name: matches.length === 1 ? matches[0]!.fullName.trim().replace(/\s+/g, ' ') : configuredName,
    avatar: '',
  };
}
