/** Membership comes from the saved Space department (including confirmed AD sync).
 * Never infer it from a name, project role, admin privileges or client input. */
export function isUptsDepartment(department: { key: string; name: string; isActive: boolean } | null | undefined): boolean {
  if (!department?.isActive) return false;
  const normalize = (s: string) => s.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('ru-RU');
  return normalize(department.key) === 'upts'
    || ['уптс', 'управление подготовки территории строительства'].includes(normalize(department.name));
}
