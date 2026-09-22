import { createError, type H3Event } from 'h3'
import { createAdClient, findDomainUser, normalizeDirectoryObjectId } from './ad-directory.service'

export interface DirectorySecurityGroup {
  directoryObjectId: string
  name: string
  distinguishedName: string
}
const guidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
const securityGroup = '(objectCategory=group)(groupType:1.2.840.113556.1.4.803:=2147483648)'
const attributes = ['objectGUID', 'cn', 'sAMAccountName', 'distinguishedName', 'dn', 'groupType']

export function escapeLdapFilter(value: string): string {
  return value.replace(/[\\*()\x00]/g, char => `\\${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
}
export function guidLdapFilter(value: string): string {
  if (!guidPattern.test(value)) throw createError({ statusCode: 400, statusMessage: 'INVALID_DIRECTORY_GUID' })
  const bytes = value.replace(/-/g, '').match(/../g)!
  return [3,2,1,0,5,4,7,6,8,9,10,11,12,13,14,15].map(i => `\\${bytes[i]}`).join('')
}
function groupFromRaw(raw: Record<string, unknown>): DirectorySecurityGroup | null {
  const id = normalizeDirectoryObjectId(raw.objectGUID)
  const dn = raw.distinguishedName || raw.dn
  const name = raw.cn || raw.sAMAccountName
  if (!id || !guidPattern.test(id) || typeof dn !== 'string' || typeof name !== 'string') return null
  // Do not trust a distribution group even if the server ignored our filter.
  if ((Number(raw.groupType) & 0x80000000) === 0) return null
  return { directoryObjectId: id, name, distinguishedName: dn }
}
async function queryDirectory(event: H3Event, filter: string, fields: string[], userScope = false) {
  const config = useRuntimeConfig(event).ad as { baseDN: string; groupsBaseDN?: string }
  const baseDN = userScope ? config.baseDN : config.groupsBaseDN
  if (!baseDN) throw createError({ statusCode: 503, statusMessage: 'AD_GROUPS_BASE_DN_REQUIRED',
    data: { code: 'AD_GROUPS_BASE_DN_REQUIRED', message: 'Задайте NUXT_AD_GROUPS_BASE_DN для поиска групп AD.' } })
  const client = createAdClient(event)
  return new Promise<{ groups?: Record<string, unknown>[]; users?: Record<string, unknown>[] }>((resolve, reject) => {
    client.find({ baseDN, filter, attributes: fields, includeMembership: [],
      // No referrals across domains; use a configured domain scope.
      entryParser: (entry: any, raw: any, callback: (entry: any) => void) => {
        const rawGuid = Array.isArray(raw?.objectGUID) ? raw.objectGUID[0] : raw?.objectGUID
        if (rawGuid) entry.objectGUID = rawGuid
        callback(entry)
      },
      referrals: { enabled: false } } as any, (error: unknown, result: any) => {
      if (error) reject(createError({ statusCode: 503, statusMessage: 'AD_GROUP_LOOKUP_FAILED',
        data: { code: 'AD_GROUP_LOOKUP_FAILED', message: 'Не удалось проверить группы в Active Directory.' } }))
      else resolve(result || {})
    })
  })
}
export async function searchDirectoryGroups(event: H3Event, search: string): Promise<DirectorySecurityGroup[]> {
  const q = escapeLdapFilter(search.trim())
  const result = await queryDirectory(event, `(&${securityGroup}(|(cn=*${q}*)(sAMAccountName=*${q}*)))`, attributes)
  return (result.groups || []).map(groupFromRaw).filter((g): g is DirectorySecurityGroup => !!g)
    .sort((a, b) => a.name.localeCompare(b.name)).slice(0, 51)
}
export async function findDirectoryGroup(event: H3Event, id: string): Promise<DirectorySecurityGroup | null> {
  const result = await queryDirectory(event, `(&${securityGroup}(objectGUID=${guidLdapFilter(id)}))`, attributes)
  return (result.groups || []).map(groupFromRaw).find(g => g?.directoryObjectId === id.toLowerCase()) || null
}
/** Resolve the DB-bound AD object, never a browser-supplied login or group list. */
export async function resolveDomainGroupIds(event: H3Event, directoryObjectId: string, login: string): Promise<string[]> {
  // Use the same identity normalization as login. Do not silently rebind existing users.
  const user = await findDomainUser(login, event)
  if (!user || user.directoryObjectId !== directoryObjectId.toLowerCase() || user.accountDisabled || !user.distinguishedName) return []
  const groups = await queryDirectory(event,
    `(&${securityGroup}(member:1.2.840.113556.1.4.1941:=${escapeLdapFilter(user.distinguishedName)}))`, attributes)
  // Includes nested member links. AD primaryGroupID is deliberately not interpreted as a role.
  return [...new Set((groups.groups || []).map(groupFromRaw).filter((g): g is DirectorySecurityGroup => !!g)
    .map(g => g.directoryObjectId))].sort()
}
