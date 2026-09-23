<script setup lang="ts">
import { computed } from 'vue'
import DepartmentMemberPicker from '~/components/admin/DepartmentMemberPicker.vue'
import { useStructureAdmin } from '~/composables/useStructureAdmin'
useSeoMeta({ title: 'Space — отделы и внутренние группы' })
const route = useRoute()
const router = useRouter()
const tab = computed<'departments' | 'groups'>({
  get: () => route.query.tab === 'groups' ? 'groups' : 'departments',
  set: value => { void router.replace({ query: { ...route.query, tab: value } }) },
})
const { busy, error, notice, departments, spaceDepartments, directoryName, departmentId, plan, cacheDate, withoutDepartment,
  groups, groupSearch, groupsMore, groupId, name, active, members, domains, memberKind, memberSearch, candidates, membersMore, candidateSummary, candidateWarning,
  addMany, batchProgress, groupDraftVersion, dirty, hasGroup, sync, newGroup, openGroup, saveGroup, add, activate, reloadDepartments } = useStructureAdmin()
</script>
<template>
  <div class="structure-page">
    <header><NuxtLink to="/admin/users">← Администрирование пользователей</NuxtLink><h1>Отделы и группы Space</h1>
      <nav><button :aria-pressed="tab === 'departments'" @click="tab = 'departments'">Отделы из AD</button><button :aria-pressed="tab === 'groups'" @click="tab = 'groups'">Группы Space</button><NuxtLink to="/admin/access">Назначение прав →</NuxtLink></nav>
    </header>
    <p v-if="error" role="alert" class="error">{{ error }}</p><p v-if="notice" role="status" class="notice">{{ notice }}</p>
    <section v-show="tab === 'departments'">
      <h2>Отделы по полю department</h2>
      <p>Источник — кэш профилей AD. Перед применением проверьте переводы: они меняют наследуемые права сотрудников.</p>
      <p>Кэш: {{ cacheDate || 'не загружен' }} · Без отдела: {{ withoutDepartment }}</p>
      <button :disabled="busy" @click="reloadDepartments">Обновить список из кэша</button>
      <div class="selectors">
        <label>Название из AD<select v-model="directoryName" :disabled="busy"><option value="">Выберите отдел</option><option v-for="d in departments" :key="d.directoryName" :value="d.directoryName">{{ d.directoryName }} ({{ d.usersCount }})</option></select></label>
        <label>Подразделение Space<select v-model="departmentId" :disabled="busy"><option :value="null">Использовать сопоставление / одноимённый отдел или создать</option><option v-for="d in spaceDepartments" :key="d.id" :value="d.id">{{ d.name }}</option></select></label>
      </div>
      <button :disabled="busy || !directoryName" @click="sync('preview')">Предпросмотр</button>
      <div v-if="plan" class="preview">
        <h3>{{ plan.target.name }}</h3><p>{{ plan.createsDepartment ? 'Будет создан новый отдел.' : 'Используется существующий отдел.' }} Связей к изменению: {{ plan.changes.length }} · Без изменений: {{ plan.unchanged }}</p>
        <div class="scroll"><table><thead><tr><th>Сотрудник</th><th>Сейчас</th><th>После применения</th></tr></thead><tbody><tr v-for="item in plan.changes" :key="item.userId"><td>{{ item.name }}</td><td>{{ item.beforeName || 'Без отдела' }}</td><td>{{ plan.target.name }}</td></tr></tbody></table></div>
        <details v-if="plan.skipped.length"><summary>Пропущены: {{ plan.skipped.length }}</summary><p v-for="(item, i) in plan.skipped" :key="i">{{ item.name }} — {{ item.reason }}</p></details>
        <button class="primary" :disabled="busy || plan.applied" @click="sync('apply')">{{ plan.applied ? 'Применено' : 'Применить синхронизацию' }}</button>
        <NuxtLink v-if="plan.applied" to="/admin/access?kind=department">Назначить права отделу →</NuxtLink>
      </div>
    </section>
    <section v-show="tab === 'groups'" class="group-layout">
      <aside><h2>Внутренние группы</h2><button :disabled="busy" @click="newGroup">Создать группу</button><label>Поиск группы<input v-model="groupSearch" maxlength="120" /></label>
        <ul><li v-for="g in groups" :key="g.id"><button :disabled="busy" :aria-pressed="g.id === groupId" @click="openGroup(g.id)">{{ g.name }}<small>{{ g.detail }}{{ g.isActive ? '' : ' · отключена' }}</small></button></li></ul><p v-if="groupsMore">Уточните поиск: показаны первые 50 групп.</p>
      </aside>
      <div v-if="hasGroup">
        <h2>{{ groupId ? 'Состав группы' : 'Новая группа Space' }}</h2>
        <label>Название<input v-model="name" maxlength="255" :disabled="busy" /></label>
        <label class="check"><input v-model="active" type="checkbox" :disabled="busy" /> Группа активна</label>
        <p>Отключённая группа сохраняет состав и назначения, но не даёт доступа.</p>
        <h3>Пользователи ({{ members.length }})</h3>
        <div class="scroll"><table aria-label="Состав группы"><thead><tr><th>Сотрудник</th><th>Состояние</th><th>Действия</th></tr></thead><tbody><tr v-for="m in members" :key="m.id"><td>{{ m.name }}<small>{{ m.detail }}</small></td><td>{{ m.status === 'ACTIVE' ? 'Активен в Space' : m.status === 'BLOCKED' ? 'Заблокирован' : 'Вход не разрешён' }}</td><td><button v-if="m.authType === 'DOMAIN' && ['PENDING_ACTIVATION', 'DISABLED'].includes(m.status || '')" :disabled="busy || dirty || !groupId" @click="activate(m)">Активировать</button> <button :disabled="busy" :aria-label="`Удалить ${m.name}`" @click="members = members.filter(x => x.id !== m.id)">Удалить</button></td></tr><tr v-if="!members.length"><td colspan="3">Сотрудники пока не добавлены.</td></tr></tbody></table></div>
        <p v-if="dirty">Для активации участников сначала сохраните состав группы.</p><h3>Группы AD ({{ domains.length }})</h3><ul class="chips"><li v-for="m in domains" :key="m.id">{{ m.name }}{{ m.isActive ? '' : ' (отключена)' }} <button :disabled="busy" :aria-label="`Удалить ${m.name}`" @click="domains = domains.filter(x => x.id !== m.id)">×</button></li></ul>
        <p>Участники включённых групп AD наследуют права группы Space. Состав проверяется через AD; поимённая копия не создаётся.</p>
        <DepartmentMemberPicker :key="`${groupId ?? 'new'}:${groupDraftVersion}`" :members="members" :busy="busy" :progress="batchProgress" @add="addMany" />
        <details><summary>Добавить группу безопасности AD</summary>
          <button :disabled="busy" @click="memberKind = 'domainGroup'">Загрузить группы AD</button>
          <label>Поиск группы AD<input v-model="memberSearch" :disabled="busy" maxlength="120" /></label>
          <NuxtLink to="/admin/access?kind=domainGroup">Импортировать группу из AD →</NuxtLink>
          <ul v-if="memberKind === 'domainGroup'" class="candidates"><li v-for="m in candidates" :key="m.id"><span>{{ m.name }}</span><button :disabled="busy || domains.some(x => x.id === m.id)" @click="add(m)">Добавить</button></li></ul>
          <p v-if="memberKind === 'domainGroup' && membersMore">Уточните поиск: показаны первые 50 результатов.</p>
        </details>
        <div class="actions"><button class="primary" :disabled="busy || !name.trim() || (!!groupId && !dirty)" @click="saveGroup">Сохранить группу и состав</button><span v-if="dirty">Есть несохранённые изменения</span></div>
        <p v-if="groupId && !dirty"><NuxtLink to="/admin/access?kind=spaceGroup">Назначить права группе Space →</NuxtLink></p>
        <p v-if="error && groupId">При конфликте откройте группу заново из списка; это сбросит черновик после подтверждения.</p>
      </div><p v-else>Создайте группу или выберите существующую.</p>
    </section>
  </div>
</template>
<style scoped>
.structure-page { height:100%; overflow:auto; box-sizing:border-box; padding:20px; background:#f5f7fb; color:#172b4d; font-size:13px; }
h1 { font-size:21px; } h2 { font-size:17px; } h3 { font-size:15px; } p { line-height:1.5; color:#52637a; }
nav,.actions { display:flex; flex-wrap:wrap; align-items:center; gap:12px; } section { background:white; border:1px solid #dce4ed; border-radius:10px; padding:18px; margin-top:16px; }
button,input,select { font:inherit; } button { cursor:pointer; padding:8px 12px; border:1px solid #bdcada; border-radius:6px; background:white; color:#25486d; } button:disabled { opacity:.5; cursor:default; } button[aria-pressed=true],.primary { background:#2563b8; color:white; }
label { display:flex; flex-direction:column; gap:6px; margin:14px 0; } input,select { padding:9px; border:1px solid #bdcada; border-radius:6px; min-width:0; box-sizing:border-box; max-width:100%; } .check { flex-direction:row; }
.selectors { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }.group-layout { display:grid; grid-template-columns:210px minmax(0,1fr); gap:16px; }.group-layout>* { min-width:0; }
ul { list-style:none; padding:0; } li { margin:6px 0; } aside li button { width:100%; text-align:left; } small { display:block; color:#64748b; font-size:13px; overflow-wrap:anywhere; } button[aria-pressed=true] small { color:white; }
.chips { display:flex; gap:8px; flex-wrap:wrap; }.chips li { background:#edf3fb; padding:5px 8px; border-radius:8px; }.chips button { padding:2px 8px; }.candidates { max-height:280px; overflow:auto; }.candidates li { display:flex; justify-content:space-between; gap:10px; padding:8px; border-bottom:1px solid #e4eaf1; }
.error { white-space:pre-line; padding:12px; background:#fff0ee; color:#942b20; }.notice { padding:12px; background:#eaf8f0; color:#176047; }.preview { margin-top:16px; }.scroll { max-height:320px; overflow:auto; }table { width:100%; border-collapse:collapse; text-align:left; }th,td { padding:7px; border-bottom:1px solid #dce4ed; }a { color:#2563b8; } details { margin:12px 0; }
@media(max-width:800px) { .group-layout,.selectors { grid-template-columns:1fr; }.structure-page { padding:12px; } }
</style>

<style scoped>thead { position:sticky; top:0; background:#f3f6fb; }.actions { position:sticky; bottom:0; background:white; padding:10px 0; border-top:1px solid #dce4ed; }.scroll { max-height:240px; }td { overflow-wrap:anywhere; }</style>
