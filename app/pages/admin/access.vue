<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { AccessSubjectKind, AccessSubjectOption } from '~~/shared/types/access-management'

useSeoMeta({ title: 'Space — управление правами' })
const route = useRoute()
const router = useRouter()
const kind = computed<AccessSubjectKind>({
  get: () => ['user', 'department', 'domainGroup', 'spaceGroup'].includes(String(route.query.kind)) ? route.query.kind as AccessSubjectKind : 'department',
  set: value => { void router.replace({ query: { ...route.query, kind: value } }) },
})
const search = ref('')
const subjects = ref<AccessSubjectOption[]>([])
const selected = ref<AccessSubjectOption | null>(null)
const loading = ref(false)
const error = ref('')
const hasMore = ref(false)
let sequence = 0
let timer: ReturnType<typeof setTimeout> | undefined
let disposed = false
async function load() {
  const current = ++sequence
  loading.value = true
  error.value = ''
  try {
    const response = await $fetch<{ items: AccessSubjectOption[]; hasMore: boolean }>('/api/admin/access/subjects', {
      query: { kind: kind.value, search: search.value },
    })
    if (disposed || current !== sequence) return
    subjects.value = response.items
    hasMore.value = response.hasMore
  } catch {
    if (disposed || current !== sequence) return
    subjects.value = []
    error.value = 'Не удалось загрузить список. Проверьте доступ и повторите.'
  } finally {
    if (!disposed && current === sequence) loading.value = false
  }
}
watch(kind, () => { selected.value = null; subjects.value = []; clearTimeout(timer); void load() })
watch(search, () => { sequence++; clearTimeout(timer); timer = setTimeout(load, 250) })
onMounted(load)
onBeforeUnmount(() => { disposed = true; sequence++; clearTimeout(timer) })
</script>

<template>
  <div class="access-page">
    <header><div><NuxtLink to="/admin/users">← Сотрудники и подразделения</NuxtLink><h1>Управление правами</h1><NuxtLink to="/admin/structure">Отделы из AD и группы Space →</NuxtLink></div></header>
    <div class="access-layout">
      <aside aria-label="Получатель прав">
        <label>Назначить права<select v-model="kind"><option value="department">Подразделению</option><option value="user">Сотруднику</option><option value="spaceGroup">Группе Space</option><option value="domainGroup">Доменной группе</option></select></label>
        <AdminDomainGroupImport v-if="kind === 'domainGroup'" @imported="selected = $event; search = ''; load()" />
        <label>Поиск<input v-model="search" type="search" maxlength="120" placeholder="Название, имя или логин" /></label>
        <p v-if="loading" role="status">Загрузка…</p>
        <p v-if="error" role="alert">{{ error }} <button type="button" @click="load">Повторить</button></p>
        <ul v-if="!loading">
          <li v-for="item in subjects" :key="item.id"><button type="button" :aria-pressed="selected?.id === item.id" @click="selected = item"><strong>{{ item.name }}</strong><small>{{ item.detail }}</small></button></li>
        </ul>
        <p v-if="!loading && !subjects.length && !error">Ничего не найдено.</p>
        <p v-if="hasMore">Показаны первые 50 результатов. Уточните поиск.</p>
      </aside>
      <main>
        <AdminAccessMatrix v-if="selected" :key="`${kind}:${selected.id}`" :kind="kind" :subject-id="selected.id" />
        <p v-else class="choose-subject">Выберите сотрудника, подразделение или доменную группу.</p>
      </main>
    </div>
  </div>
</template>

<style scoped>
.access-page { height: 100%; min-height: 0; display: flex; flex-direction: column; overflow: auto; padding: 20px; box-sizing: border-box; color: #172b4d; background: #f5f7fa; }
header { margin-bottom: 20px; } header a { color: #315f96; font-size: 13px; } h1 { font-size: 24px; font-weight: 650; margin: 8px 0 0; }
.access-layout { display: grid; grid-template-columns: minmax(220px, 280px) minmax(0, 1fr); gap: 20px; align-items: start; }
aside, main { min-width: 0; background: white; padding: 18px; border: 1px solid #dce4ed; border-radius: 12px; }
label { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; font-size: 13px; }
input, select { border: 1px solid #becada; border-radius: 7px; background: white; color: inherit; width: 100%; box-sizing: border-box; padding: 9px; }
ul { list-style: none; margin: 15px 0 0; padding: 0; } li { margin-bottom: 5px; }
li button { width: 100%; text-align: left; padding: 12px; border-radius: 8px; border: 1px solid transparent; background: transparent; color: inherit; cursor: pointer; }
li button[aria-pressed=true] { background: #edf4fc; border-color: #a7c3e6; } strong, small { display: block; } strong { font-size: 13px; } small { margin-top: 4px; font-size: 11px; color: #63758b; overflow-wrap: anywhere; }
.choose-subject { padding: 25px 0; color: #63758b; } aside p { color: #52637a; font-size: 13px; }
@media(max-width: 850px) { .access-layout { grid-template-columns: 1fr; } .access-page { padding: 12px; } }
.access-page { overflow: hidden; padding: 12px 14px; }
header { flex-shrink: 0; margin-bottom: 10px; } h1 { font-size: 21px; margin-top: 5px; }
.access-layout { flex: 1 1 0; min-height: 0; align-items: stretch; gap: 12px; }
aside, main { min-height: 0; padding: 12px; }
aside { overflow: auto; } main { display: flex; flex-direction: column; overflow: hidden; }
main :deep(.access-matrix) { flex: 1 1 0; min-height: 0; }
@media(max-width: 850px) {
  .access-page { overflow: auto; }
  .access-layout { flex: none; }
  aside { max-height: 320px; }
  main { height: max(500px, 75dvh); }
}
</style>
