export interface NavigationItem { label: string; to: string; description?: string; icon?: string }
export interface NavigationData { isSystemAdmin?: boolean; tools: NavigationItem[]; sections: NavigationItem[]; departments: { key: string; name: string }[] }
// Explicit routes: never construct links to a department page that does not exist yet.
// A future department page registers its route here and uses its stable Department.key.
export const departmentPages = [
  { key: 'hr', label: 'Отдел кадров', to: '/departments/hr' },
  { key: 'it', label: 'IT и разработка', to: '/departments/it' },
  { key: 'diagnostic', label: 'Диагностика', to: '/departments/diagnostic' },
  { key: 'lab', label: 'Лабораторный контроль', to: '/departments/lab' },
] as const
export const toolPages = [
  { label: 'Пользователи', to: '/admin/users', description: 'Учётные записи, профили и состояние сотрудников.', icon: 'lucide:users', resource: 'admin.users' },
  { label: 'Подразделения', to: '/admin/structure?tab=departments', description: 'Отделы из department в AD, сопоставление и состав.', icon: 'lucide:building-2', adminOnly: true },
  { label: 'Группы Space', to: '/admin/structure?tab=groups', description: 'Внутренние группы: пользователи и включённые группы AD.', icon: 'lucide:group', adminOnly: true },
  { label: 'Группы AD', to: '/admin/access?kind=domainGroup', description: 'Поиск и импорт групп безопасности из домена.', icon: 'lucide:network', adminOnly: true },
  { label: 'Права доступа', to: '/admin/access', description: 'Назначения сотрудникам, отделам и группам; источники доступа.', icon: 'lucide:shield-check', resource: 'admin.users' },
  { label: 'Журнал событий', to: '/admin/audit-log', description: 'Действия, изменения данных и отказы в доступе.', icon: 'lucide:history', resource: 'system.audit-log' },
  { label: 'Заявки', to: '/admin/registration-requests', description: 'Рассмотрение заявок на внешний доступ.', icon: 'lucide:clipboard-list', adminOnly: true },
] satisfies (NavigationItem & { resource?: string; adminOnly?: boolean })[]

export function breadcrumbs(path: string, query: Record<string, unknown>, departments: NavigationData['departments'] = [], customLabel?: string) {
  const result: NavigationItem[] = [{ label: 'Space', to: '/' }]
  const clean = path.replace(/\/+$/, '') || '/'
  if (clean === '/') return result
  if (clean === '/admin' || clean.startsWith('/admin/')) {
    result.push({ label: 'Инструменты', to: '/admin' })
    if (clean === '/admin') return result
    const tool = clean === '/admin/structure' ? toolPages.find(t => t.to.endsWith(query.tab === 'groups' ? 'tab=groups' : 'tab=departments'))
      : clean === '/admin/access' && query.kind === 'domainGroup' ? toolPages.find(t => t.to.endsWith('kind=domainGroup'))
      : toolPages.find(t => t.to === clean)
    if (tool) result.push({ label: tool.label, to: tool.to })
    else if (clean.startsWith('/admin/registration-requests/')) result.push({ label: 'Заявки', to: '/admin/registration-requests' }, { label: 'Карточка заявки', to: clean })
    else result.push({ label: customLabel || 'Администрирование', to: clean })
    return result
  }
  if (clean.startsWith('/departments/')) {
    const key = clean.split('/')[2]!
    const page = departmentPages.find(p => p.to === `/departments/${key}`)
    result.push({ label: departments.find(d => d.key === key)?.name || page?.label || 'Подразделение', to: page || clean === `/departments/${key}` ? `/departments/${key}` : '' })
    if (clean !== `/departments/${key}`) {
      const names: Record<string, string> = { sampling: 'Акты отбора проб', testprotocol: 'Протоколы испытаний', documents: 'Документы', vacancies: 'Вакансии', ticket: 'Техподдержка', wiki: 'База знаний', gis: 'ГИС', aisisso: 'АИС ИССО' }
      result.push({ label: customLabel || names[clean.split('/').at(-1)!] || 'Ресурс отдела', to: clean })
    }
    return result
  }
  const names: Record<string,string> = { '/profile': 'Профиль', '/settings': 'Настройки', '/access-denied': 'Доступ ограничен' }
  result.push({ label: customLabel || names[clean] || 'Текущая страница', to: clean })
  return result
}
