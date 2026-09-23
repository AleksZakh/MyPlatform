import type { AccessBlock, AccessSource } from '../types/access-management'

export function normalizeAdminLogins(value: unknown): Set<string> {
  const values = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/[,;\s]+/) : []
  return new Set(values.filter((item): item is string => typeof item === 'string')
    .map(item => item.trim().toLowerCase()).filter(Boolean))
}

export function isSystemAdminLogin(login: string | null, config: unknown): boolean {
  return !!login && normalizeAdminLogins(config).has(login.trim().toLowerCase())
}

/** Used by the API guard and the administrative matrix. No client value grants access. */
export function decideAccess(input: {
  userActive: boolean
  resourceActive: boolean
  systemAdmin: boolean
  systemAdminOnly?: boolean
  direct: boolean
  departmentActive: boolean
  departmentGranted: boolean
  domainGroupGranted?: boolean
  spaceGroupGranted?: boolean
}): { allowed: boolean; sources: AccessSource[]; blockedBy: AccessBlock } {
  if (!input.userActive) return { allowed: false, sources: [], blockedBy: 'USER_INACTIVE' }
  if (!input.resourceActive) return { allowed: false, sources: [], blockedBy: 'RESOURCE_INACTIVE' }
  if (input.systemAdminOnly && !input.systemAdmin) return { allowed: false, sources: [], blockedBy: 'ADMIN_REQUIRED' }
  const sources: AccessSource[] = []
  if (input.systemAdmin) sources.push('SYSTEM_ADMIN')
  if (input.direct) sources.push('USER')
  if (input.departmentActive && input.departmentGranted) sources.push('DEPARTMENT')
  if (input.spaceGroupGranted) sources.push('SPACE_GROUP')
  if (input.domainGroupGranted) sources.push('DOMAIN_GROUP')
  return { allowed: sources.length > 0, sources, blockedBy: sources.length ? null : 'NO_PERMISSION' }
}
