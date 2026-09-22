import { ACCESS_ACTIONS, type AccessActionName } from '../../shared/types/access-management'

/** Explicit operations for non-table resources. Extend here when adding a feature. */
const featureActions: Readonly<Record<string, readonly AccessActionName[]>> = {
  'admin.center': ['VIEW'],
  'admin.users': ['VIEW'],
  'system.audit-log': ['VIEW'],
  'admin.department-mapping': [],
  'admin.ad-cache-refresh': ['UPDATE'],
  // Reserved until scoped delegation is implemented; legacy grants can be revoked.
  'admin.department-permissions': [],
  'lab.event-journal': ['VIEW'],
  'lab.incoming-control.edit-lock-override': ['UPDATE'],
}

/** Membership changes can indirectly grant permissions; keep them admin-only in v1. */
export function isSystemAdminOperation(key: string): boolean {
  return key === 'admin.department-permissions' || key === 'admin.department-mapping'
}

export function assignableActions(resource: { key: string; type: string }): readonly AccessActionName[] {
  return featureActions[resource.key] ?? (resource.type === 'TABLE' ? ACCESS_ACTIONS : [])
}
