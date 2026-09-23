import { defineEventHandler } from 'h3'
import { prisma } from '../utils/prisma'
import { getAccessActor } from '../services/access-control.service'
import { getDomainGroupContext } from '../services/domain-group-access.service'
import { buildAccessSnapshot } from '../services/access-management.service'
import { departmentPages, toolPages, type NavigationData } from '../../shared/navigation/catalog'

export default defineEventHandler(async event => {
  const actor = await getAccessActor(event)
  const membership = await getDomainGroupContext(event, actor.user)
  const snapshot = await prisma.$transaction(tx => buildAccessSnapshot(tx, 'user', actor.user.id,
    useRuntimeConfig(event).adminLogins, false, membership))
  const canView = (key: string) => snapshot.data.some(r => r.key === key && r.actions.VIEW.effectiveGranted)
  const departments = await prisma.department.findMany({ where: { isActive: true }, select: { key: true, name: true }, orderBy: { name: 'asc' } })
  const tools = canView('admin.center') ? toolPages.filter(t => t.adminOnly ? actor.isSystemAdmin : !!t.resource && canView(t.resource))
    .map(({ label, to, description, icon }) => ({ label, to, description, icon })) : []
  const sections: NavigationData['sections'] = [{ label: 'Главная', to: '/' }]
  // Existing general department landing pages remain discoverable for authenticated users.
  for (const page of departmentPages) {
    if (page.key === 'lab' && !snapshot.data.some(r => r.key.startsWith('lab.') && r.actions.VIEW.effectiveGranted)) continue
    sections.push({ label: departments.find(d => d.key === page.key)?.name || page.label, to: page.to })
  }
  if (canView('lab.sampling-tests')) sections.push({ label: 'Лаборатория — акты отбора проб', to: '/departments/lab/sampling' })
  if (canView('lab.test-protocols')) sections.push({ label: 'Лаборатория — протоколы испытаний', to: '/departments/lab/testprotocol' })
  if (canView('admin.center')) sections.push({ label: 'Инструменты', to: '/admin' })
  return { tools, sections, departments, isSystemAdmin: actor.isSystemAdmin } satisfies NavigationData
})
