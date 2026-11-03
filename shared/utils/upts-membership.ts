/** Exact saved department/group names only; a partial match never grants access. */
export function isUptsGroup(group: { name: string; isActive: boolean }): boolean {
  const name = group.name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('ru-RU');
  return group.isActive && ['уптс', 'upts', 'управление подготовки территории строительства'].includes(name);
}
export function isUptsDepartment(department: { key: string; name: string; isActive: boolean } | null | undefined): boolean {
  if (!department?.isActive) return false;
  const normalize = (s: string) => s.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('ru-RU');
  return normalize(department.key) === 'upts'
    || ['уптс', 'управление подготовки территории строительства'].includes(normalize(department.name));
}
