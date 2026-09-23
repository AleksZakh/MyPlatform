import type { AccessSubjectOption } from './access-management'
export interface StructureMember extends AccessSubjectOption {
  departmentName?: string
  cacheLogin?: string
  cachedOnly?: boolean
  directoryObjectId?: string | null
  authType?: string
  status?: string
  updatedAt?: string
  accountDisabled?: boolean
}
