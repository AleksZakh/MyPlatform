export const ACCESS_ACTIONS = ['VIEW', 'CREATE', 'UPDATE', 'DELETE'] as const
export type AccessActionName = typeof ACCESS_ACTIONS[number]
export type AccessSubjectKind = 'user' | 'department' | 'domainGroup'
export type AccessSource = 'SYSTEM_ADMIN' | 'USER' | 'DEPARTMENT' | 'DOMAIN_GROUP'
export type AccessBlock = 'USER_INACTIVE' | 'RESOURCE_INACTIVE' | 'ADMIN_REQUIRED' | 'NO_PERMISSION' | null

export interface AccessCell {
  directGranted: boolean
  inheritedGranted: boolean
  domainGroups: { id: number; name: string }[]
  systemGranted: boolean
  effectiveGranted: boolean
  sources: AccessSource[]
  blockedBy: AccessBlock
  canGrant: boolean
  canRevoke: boolean
  grantedByLogin: string | null
}

export interface AccessRow {
  id: number
  key: string
  name: string
  description: string | null
  type: string
  isActive: boolean
  group: string
  actions: Record<AccessActionName, AccessCell>
}

export interface AccessSnapshot {
  success: true
  revision: string
  directoryWarning: string | null
  canManage: boolean
  subject: {
    kind: AccessSubjectKind
    id: number
    name: string
    isActive: boolean
    status: string
    isSystemAdmin: boolean
    department: { id: number; name: string; isActive: boolean } | null
    memberCount: number | null
  }
  actions: AccessActionName[]
  data: AccessRow[]
  summary: {
    totalResources: number
    directPermissions: number
    effectivePermissions: number
  }
}

export interface AccessChange {
  resourceId: number
  action: AccessActionName
  granted: boolean
}

export interface AccessMutation {
  revision: string
  changes: AccessChange[]
}

export interface AccessSubjectOption {
  id: number
  name: string
  detail: string
  isActive: boolean
}
