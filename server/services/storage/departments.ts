import { mkdir, lstat } from 'node:fs/promises';
import { prisma } from '../../utils/prisma';
import { checkedStoragePath } from './paths';
import type { DepartmentStorage } from '../../../shared/types/department-storage';

const normalize = (s: string) => s.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
export function departmentCatalog(departments: { id: number; key: string; name: string; isActive: boolean }[]): DepartmentStorage[] {
  const result: DepartmentStorage[] = [
    { key: 'lab', name: 'Лабораторный контроль', path: 'lab', departmentIds: [], active: true },
    { key: 'diagnostic', name: 'Диагностика', path: 'diagnostic', departmentIds: [], active: true },
    { key: 'upts', name: 'УПТС', path: 'upts', departmentIds: [], active: true },
  ];
  for (const d of departments) {
    const key = normalize(d.key), name = normalize(d.name);
    const builtin = ['lab', 'labcontrol'].includes(key) || name === 'лабораторный контроль' ? 'lab'
      : ['diagnostic', 'diagnostics'].includes(key) || name === 'диагностика' ? 'diagnostic'
      : key === 'upts' || ['уптс', 'управление подготовки территории строительства'].includes(name) ? 'upts' : null;
    if (builtin) result.find(r => r.key === builtin)!.departmentIds.push(d.id);
    else result.push({ key: 'department-' + d.id, name: d.name, path: 'departments/' + d.id, departmentIds: [d.id], active: d.isActive });
  }
  return result;
}
export async function storageDepartments() {
  return departmentCatalog(await prisma.department.findMany({ select: { id: true, key: true, name: true, isActive: true }, orderBy: { name: 'asc' } }));
}
export async function directoryExists(relative: string): Promise<boolean> {
  try { return (await lstat(await checkedStoragePath(relative))).isDirectory(); }
  catch (e: any) { if (e.code === 'ENOENT') return false; throw e; }
}
/** No arbitrary root from the browser, no rename/migration, no symlink traversal. */
export async function ensureDepartmentDirectory(relative: string) {
  const catalog = await storageDepartments();
  if (!catalog.some(d => d.path === relative)) throw new Error('Неизвестный каталог подразделения');
  let current = '';
  for (const part of relative.split('/')) {
    current = [current, part].filter(Boolean).join('/');
    const target = await checkedStoragePath(current, true);
    try { await mkdir(target, { mode: 0o750 }); } catch (e: any) { if (e.code !== 'EEXIST') throw e; }
    if (!await directoryExists(current)) throw new Error('Ожидался каталог подразделения');
  }
}
