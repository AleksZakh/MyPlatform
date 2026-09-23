import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import type { StructureMember } from '~~/shared/types/structure-member'
import type { AccessSubjectOption } from '~~/shared/types/access-management'

type Department = { directoryName: string; usersCount: number; mapping: { department: { id: number; name: string } } | null }
type SyncPlan = { directoryName: string; cacheUpdatedAt: string; target: { id: number | null; name: string };
  createsDepartment: boolean; revision: string; unchanged: number; changes: { userId: number; name: string; beforeName: string | null }[];
  skipped: { name: string; reason: string }[]; applied?: boolean }
type GroupResponse = { revision: string; group: { id: number; name: string; isActive: boolean;
  users: { user: { id: number; login: string | null; fullName: string | null; email: string | null; status: string; authType: string; updatedAt: string; directoryObjectId: string | null } }[];
  domainGroups: { domainGroup: { id: number; name: string; isActive: boolean } }[] } }
export function useStructureAdmin() {
  const busy = ref(false), error = ref(''), notice = ref('')
  const departments = ref<Department[]>([]), spaceDepartments = ref<{ id: number; name: string }[]>([])
  const directoryName = ref(''), departmentId = ref<number | null>(null), plan = ref<SyncPlan | null>(null)
  const cacheDate = ref<string | null>(null), withoutDepartment = ref(0)
  const groups = ref<AccessSubjectOption[]>([]), groupSearch = ref(''), groupsMore = ref(false)
  const groupId = ref<number | null>(null), name = ref(''), active = ref(true), revision = ref('')
  const members = ref<StructureMember[]>([]), domains = ref<AccessSubjectOption[]>([])
  const memberKind = ref<'user' | 'domainGroup'>('user'), memberSearch = ref(''), candidates = ref<StructureMember[]>([]), membersMore = ref(false)
  const groupDraftVersion = ref(0)
  const batchProgress = ref('')
  const candidateSummary = ref(''), candidateWarning = ref('')
  const saved = ref(''), hasGroup = ref(false)
  const fingerprint = () => JSON.stringify({ name: name.value, active: active.value,
    users: members.value.map(m => m.id).sort((a,b) => a-b), domains: domains.value.map(m => m.id).sort((a,b) => a-b) })
  const dirty = computed(() => hasGroup.value && fingerprint() !== saved.value)
  const headers = { 'x-space-access-change': '1' }
  let disposed = false, memberSequence = 0, groupSequence = 0
  let timer: ReturnType<typeof setTimeout> | undefined, groupTimer: ReturnType<typeof setTimeout> | undefined
  function fail(e: unknown) {
    const value = e as { data?: { data?: { message?: string }; message?: string } }
    error.value = value.data?.data?.message || value.data?.message || 'Не удалось выполнить операцию.'
  }
  async function run(task: () => Promise<void>) {
    if (busy.value) return
    busy.value = true; error.value = ''; notice.value = ''
    try { await task() } catch(e) { fail(e) } finally { busy.value = false }
  }
  async function loadDepartments() {
    const r = await $fetch<{ directoryDepartments: Department[]; spaceDepartments: { id: number; name: string }[];
      directoryCache: { lastUpdated: string | null }; summary: { usersWithoutDepartment: number } }>('/api/admin/directory-departments')
    departments.value = r.directoryDepartments; spaceDepartments.value = r.spaceDepartments
    cacheDate.value = r.directoryCache.lastUpdated; withoutDepartment.value = r.summary.usersWithoutDepartment
  }
  watch(directoryName, value => { departmentId.value = departments.value.find(d => d.directoryName === value)?.mapping?.department.id ?? null; plan.value = null })
  watch(departmentId, () => { plan.value = null })
  async function sync(mode: 'preview' | 'apply') {
    await run(async () => {
      if (mode === 'apply' && !plan.value) return
      const response = await $fetch<SyncPlan>('/api/admin/directory-departments/sync', { method: 'POST', headers,
        body: { directoryName: directoryName.value, departmentId: departmentId.value, mode, revision: plan.value?.revision } })
      plan.value = response
      if (mode === 'apply') { await loadDepartments(); notice.value = 'Отдел и связи сотрудников сохранены. Можно назначать права.' }
    })
  }
  async function loadGroups() {
    const seq = ++groupSequence
    try {
      const r = await $fetch<{ items: AccessSubjectOption[]; hasMore: boolean }>('/api/admin/access/subjects', { query: { kind: 'spaceGroup', search: groupSearch.value } })
      if (!disposed && seq === groupSequence) { groups.value = r.items; groupsMore.value = r.hasMore }
    } catch(e) { if (!disposed && seq === groupSequence) fail(e) }
  }
  function discardAllowed() { return !dirty.value || window.confirm('Сбросить несохранённые изменения состава группы?') }
  function newGroup() {
    if (busy.value || !discardAllowed()) return
    groupDraftVersion.value++
    groupId.value = null; name.value = ''; active.value = true; members.value = []; domains.value = []; revision.value = ''
    hasGroup.value = true; saved.value = fingerprint(); notice.value = ''; error.value = ''
  }
  function fill(r: GroupResponse) {
    groupId.value = r.group.id; name.value = r.group.name; active.value = r.group.isActive; revision.value = r.revision
    members.value = r.group.users.map(m => ({ id: m.user.id, name: m.user.fullName || m.user.login || m.user.email || `#${m.user.id}`, detail: `${m.user.login || ''} · ${m.user.status}`, isActive: m.user.status === 'ACTIVE', status: m.user.status, authType: m.user.authType, updatedAt: m.user.updatedAt, directoryObjectId: m.user.directoryObjectId }))
    domains.value = r.group.domainGroups.map(m => ({ ...m.domainGroup, detail: 'Группа AD' }))
    hasGroup.value = true; saved.value = fingerprint()
  }
  async function openGroup(id: number) {
    if (busy.value || !discardAllowed()) return
    await run(async () => { fill(await $fetch<GroupResponse>(`/api/admin/space-groups/${id}`)) })
  }
  async function saveGroup() {
    await run(async () => {
      const url = groupId.value ? `/api/admin/space-groups/${groupId.value}` : '/api/admin/space-groups'
      fill(await $fetch<GroupResponse>(url, { method: groupId.value ? 'PUT' : 'POST', headers,
        body: { name: name.value, isActive: active.value, userIds: members.value.map(m => m.id), domainGroupIds: domains.value.map(m => m.id), revision: revision.value } }))
      await loadGroups(); notice.value = 'Группа и состав сохранены. Изменения наследования действуют при следующей проверке доступа.'
    })
  }
  async function findMembers() {
    const seq = ++memberSequence
    try {
      const r = memberKind.value === 'user'
        ? await $fetch<{ items: StructureMember[]; hasMore: boolean; warning?: string | null; summary?: { registered: number; cacheTotal: number; cachedOnly: number; withoutLogin: number; withoutIdentifier: number; matched: number } }>('/api/admin/directory-users/candidates', { query: { search: memberSearch.value } })
        : await $fetch<{ items: StructureMember[]; hasMore: boolean; warning?: string | null; summary?: { registered: number; cacheTotal: number; cachedOnly: number; withoutLogin: number; withoutIdentifier: number; matched: number } }>('/api/admin/access/subjects', { query: { kind: 'domainGroup', search: memberSearch.value } })
      if (!disposed && seq === memberSequence) {
        candidateWarning.value = r.warning || ''
        const s = r.summary
        candidateSummary.value = s ? `В Space: ${s.registered} · В кэше AD: ${s.cacheTotal} · Только в кэше: ${s.cachedOnly} · Найдено: ${s.matched}`
          + (s.withoutLogin ? ` · Без логина: ${s.withoutLogin}` : '')
          + (s.withoutIdentifier ? ` · Без идентификатора: ${s.withoutIdentifier}` : '') : ''
      }
      if (!disposed && seq === memberSequence) { candidates.value = r.items; membersMore.value = r.hasMore }
    } catch(e) { if (!disposed && seq === memberSequence) fail(e) }
  }
  function add(item: StructureMember) {
    if (item.cachedOnly) { void provision(item); return }
    const target = memberKind.value === 'user' ? members : domains
    if (!target.value.some(m => m.id === item.id)) target.value.push(item)
  }
  async function provision(item: StructureMember) {
    await run(async () => {
      const result = await $fetch<{ item: StructureMember; created: boolean }>('/api/admin/directory-users/provision', {
        method: 'POST', headers, body: { directoryObjectId: item.directoryObjectId, cacheLogin: item.cacheLogin },
      })
      if (!members.value.some(m => m.id === result.item.id)) members.value.push(result.item)
      notice.value = result.created
        ? 'Запись Space создана без разрешения входа. Сохраните состав группы, затем активируйте пользователя при необходимости.'
        : 'Учётная запись уже существует. Пользователь добавлен в черновик состава; сохраните группу.'
      await findMembers()
    })
  }
  async function addMany(items: StructureMember[]) {
    await run(async () => {
      if (members.value.length + items.filter(i => !members.value.some(m => m.id === i.id && !i.cachedOnly)).length > 1000) {
        error.value = 'В группе допускается до 1000 пользователей.'; return
      }
      const failures: string[] = []
      let added = 0
      for (const [index, item] of items.entries()) {
        batchProgress.value = `Добавление: ${index + 1} из ${items.length}`
        if (members.value.some(m => (!item.cachedOnly && m.id === item.id) || (!!item.directoryObjectId && m.directoryObjectId === item.directoryObjectId))) continue
        try {
          const member = item.cachedOnly ? (await $fetch<{ item: StructureMember }>('/api/admin/directory-users/provision', {
            method: 'POST', headers, body: { directoryObjectId: item.directoryObjectId, cacheLogin: item.cacheLogin },
          })).item : item
          if (!members.value.some(m => m.id === member.id)) {
            members.value.push({ ...member, departmentName: item.departmentName }); added++
          }
        } catch (e) { fail(e); failures.push(`${item.name}: ${error.value}`) }
      }
      batchProgress.value = ''
      error.value = failures.join('\n')
      notice.value = `Добавлено в состав: ${added}. Не удалось добавить: ${failures.length}. Сохраните группу и состав. Новые записи созданы без разрешения входа.`
    })
  }
  async function activate(item: StructureMember) {
    if (dirty.value || !groupId.value) return
    await run(async () => {
      const result = await $fetch<{ item: StructureMember }>('/api/admin/directory-users/activate', {
        method: 'POST', headers, body: { userId: item.id, updatedAt: item.updatedAt },
      })
      notice.value = `«${result.item.name}»: вход в Space разрешён. Пользователь войдёт со своим доменным паролем.`
      // Activation changes the user fields included in the group's revision. Reload the saved group.
      fill(await $fetch<GroupResponse>(`/api/admin/space-groups/${groupId.value}`))
      await findMembers()
    })
  }
  watch([memberKind, memberSearch], () => { memberSequence++; candidates.value = []; clearTimeout(timer); timer = setTimeout(findMembers, 250) })
  watch(groupSearch, () => { groupSequence++; clearTimeout(groupTimer); groupTimer = setTimeout(loadGroups, 250) })
  onMounted(() => { void run(loadDepartments); void loadGroups(); void findMembers() })
  onBeforeUnmount(() => { disposed = true; memberSequence++; groupSequence++; clearTimeout(timer); clearTimeout(groupTimer) })
  return { busy, error, notice, departments, spaceDepartments, directoryName, departmentId, plan, cacheDate, withoutDepartment,
    groups, groupSearch, groupsMore, groupId, name, active, members, domains, memberKind, memberSearch, candidates, membersMore,
    candidateSummary, candidateWarning, groupDraftVersion, addMany, batchProgress, dirty, hasGroup, sync, newGroup, openGroup, saveGroup, add, activate, reloadDepartments: () => run(loadDepartments) }
}
