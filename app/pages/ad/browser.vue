<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { usePhoneDirectory } from '~/composables/usePhoneDirectory';
import type { ContactDTO } from '~~/shared/types/contacts';

useHead({ title: 'Телефонный справочник — Space' });
const tabs = [
  { id: 'engineering', label: 'Автодор-Инжиниринг' },
  { id: 'group', label: 'ГК Автодор' },
  { id: 'management', label: 'УК Автодор' },
  { id: 'roads', label: 'Автодор-Платные дороги' },
] as const;
const activeTab = ref<(typeof tabs)[number]['id']>('engineering');
const selectedId = ref<string | null>(null);
const phoneFilter = ref('');
const centersOpen = ref(true);
const { contacts, loading, error, search, department, departments, filtered, page, pageCount, sortKey, descending, sort, load, updatedLabel } = usePhoneDirectory();
const hasData = computed(() => activeTab.value === 'engineering');
const matches = computed(() => hasData.value ? filtered.value.filter(c => c.telephoneNumber.includes(phoneFilter.value.trim())) : []);
const pageRows = computed(() => matches.value.slice((page.value - 1) * 25, page.value * 25));
const totalPages = computed(() => Math.max(1, Math.ceil(matches.value.length / 25)));
const selected = computed(() => hasData.value ? contacts.value.find(c => c.id === selectedId.value) : undefined);
const columns: {key: Exclude<keyof ContactDTO, 'id'>; label: string}[] = [
  { key: 'fullName', label: 'ФИО' },
  { key: 'department', label: 'Отдел' },
  { key: 'telephoneNumber', label: 'Вн. тел.' },
  { key: 'email', label: 'mail' },
];
watch(activeTab, () => { selectedId.value = null; search.value = ''; department.value = ''; phoneFilter.value = ''; page.value = 1; });
watch(phoneFilter, () => { selectedId.value = null; page.value = 1; });
watch(totalPages, n => { page.value = Math.min(page.value, n); });
</script>

<template>
  <section class="directory">
    <header class="titlebar"><span><Icon name="lucide:phone" /> Телефонный справочник</span><button title="Обновить данные AD" :disabled="loading" @click="load"><Icon name="lucide:refresh-cw" /></button></header>
    <div class="workspace">
      <nav class="tabs" aria-label="Организации">
        <button v-for="tab in tabs" :key="tab.id" :class="{ active: activeTab === tab.id }" :aria-current="activeTab === tab.id ? 'page' : undefined" @click="activeTab = tab.id">{{ tab.label }}</button>
      </nav>
      <main class="main">
        <div class="controls">
          <div class="searchbox">
            <input v-model="search" type="search" placeholder="ФИО" maxlength="200" aria-label="Поиск сотрудников" :disabled="!hasData" />
            <div class="summary"><span><i /> Все сотрудники</span><span>найдено — {{ matches.length }}</span></div>
          </div>
          <div class="filters">
            <label><span>Отдел</span><select v-model="department" :disabled="!hasData"><option value="">Все отделы</option><option v-for="name in departments" :key="name" :value="name">{{ name }}</option></select></label>
            <label><span>Вн. тел.</span><input v-model="phoneFilter" type="search" placeholder="–" :disabled="!hasData" /></label>
          </div>
          <aside class="centers">
            <div class="centers-header"><span>Рег.центры</span><span><button :title="centersOpen ? 'Свернуть' : 'Развернуть'" @click="centersOpen = !centersOpen"><Icon :name="centersOpen ? 'lucide:chevrons-down' : 'lucide:chevrons-up'" /></button><button title="Сбросить" @click="centersOpen = true"><Icon name="lucide:x" /></button></span></div>
            <small v-if="!centersOpen">Список свёрнут</small>
          </aside>
        </div>
        <div class="table-area" :aria-busy="loading && hasData">
          <table>
            <thead><tr><th>#</th><th v-for="column in columns" :key="column.key" :aria-sort="sortKey === column.key ? descending ? 'descending' : 'ascending' : 'none'"><button :disabled="!hasData" @click="sort(column.key)">{{ column.label }} <span v-if="sortKey === column.key">{{ descending ? '↓' : '↑' }}</span></button></th><th>Город</th></tr></thead>
            <tbody>
              <tr v-if="loading && hasData"><td colspan="6" class="empty">Загрузка контактов AD…</td></tr>
              <template v-else-if="pageRows.length">
                <tr v-for="(contact, i) in pageRows" :key="contact.id" tabindex="0" :class="{ selected: contact.id === selectedId }" @click="selectedId = contact.id" @keydown.enter="selectedId = contact.id">
                  <td>{{ (page - 1) * 25 + i + 1 }}</td><td class="name">{{ contact.fullName }}</td><td>{{ contact.department || '—' }}</td><td>{{ contact.telephoneNumber || '—' }}</td><td><a v-if="contact.email" :href="`mailto:${contact.email}`" @click.stop>{{ contact.email }}</a><span v-else>—</span></td><td>—</td>
                </tr>
              </template>
              <tr v-else><td colspan="6" class="empty">{{ !hasData ? 'Данные этой организации добавим на следующем этапе.' : error || (contacts.length ? 'По заданным условиям никого не найдено. Попробуйте изменить условия фильтрации.' : 'В справочнике пока нет контактов.') }}</td></tr>
            </tbody>
          </table>
        </div>
        <nav v-if="hasData && totalPages > 1" class="pages"><span>Страница {{ page }} из {{ totalPages }}</span><button :disabled="page <= 1" @click="page--">Назад</button><button :disabled="page >= totalPages" @click="page++">Вперёд</button></nav>
      </main>
      <aside class="details">
        <h2>Информация о выбранном сотруднике</h2>
        <template v-if="selected"><h3>{{ selected.fullName }}</h3><dl><dt>Должность</dt><dd>{{ selected.position || '—' }}</dd><dt>Отдел</dt><dd>{{ selected.department || '—' }}</dd><dt>Телефон</dt><dd>{{ selected.telephoneNumber || '—' }}</dd><dt>Электронная почта</dt><dd><a v-if="selected.email" :href="`mailto:${selected.email}`">{{ selected.email }}</a><span v-else>—</span></dd></dl></template>
        <p v-else class="hint">Выберите сотрудника в таблице</p>
      </aside>
    </div>
    <footer class="status"><span>Для звонков с городских телефонов используйте номер +7(495)727-11-95</span><small v-if="hasData && updatedLabel">AD: {{ updatedLabel }} (МСК)</small></footer>
  </section>
</template>

<style scoped>
.directory{--line:var(--space-line,#cbd5e1);--panel:var(--space-panel,#fff);--bg:var(--space-bg,#f5f6f8);--muted:var(--space-muted,#77818d);height:calc(100dvh - 112px);min-height:450px;display:flex;flex-direction:column;overflow:hidden;background:var(--bg);color:var(--space-text,#273444);font-size:13px;border:1px solid var(--line)}
.directory button,.directory input,.directory select{font:inherit;color:inherit}.directory button{cursor:pointer}.directory button:disabled{opacity:.5;cursor:default}
.titlebar{flex:none;display:flex;align-items:center;justify-content:space-between;padding:5px 10px;background:var(--panel);border-bottom:1px solid var(--line);font-size:14px}.titlebar span{display:flex;align-items:center;gap:7px}.titlebar button{background:var(--panel);border:1px solid var(--line);border-radius:4px;padding:3px 7px}
.workspace{display:grid;grid-template-columns:250px minmax(0,1fr) 300px;gap:12px;padding:10px 9px;min-height:0;flex:1}
.tabs{background:var(--panel);border-right:1px solid var(--line);display:flex;flex-direction:column;gap:3px;overflow:auto;padding:8px 9px}.tabs button{flex:none;position:relative;text-align:left;white-space:normal;min-height:42px;border:1px solid transparent;border-radius:5px;background:transparent;color:var(--muted);font-size:16px;padding:9px 10px}.tabs button:hover{background:var(--bg)}.tabs button.active{border-color:#ff8900;color:#f07800;background:var(--panel)}.tabs button.active:after{content:'';position:absolute;right:-10px;top:0;bottom:0;width:7px;border-radius:6px;background:#ff8a00}
.main{display:flex;flex-direction:column;gap:6px;min-height:0;min-width:0}.controls{display:grid;grid-template-columns:minmax(0,3fr) minmax(170px,1fr);grid-template-rows:90px 90px;gap:5px 10px}.searchbox,.filters,.centers{border:1px solid var(--line);border-radius:5px;padding:10px;background:var(--panel)}.searchbox{background:var(--space-raised,#e5e7eb);display:flex;flex-direction:column;justify-content:space-between;gap:8px}.directory input,.directory select{border:1px solid var(--line);border-radius:4px;background:var(--panel);min-width:0;padding:6px 10px}.searchbox input{width:100%;height:35px}.summary{display:flex;align-items:center;justify-content:space-between;gap:10px}.summary span:first-child{display:flex;align-items:center;gap:6px}.summary i{width:14px;height:14px;border-radius:50%;border:4px solid #2878f0;background:var(--panel)}.filters{display:flex;flex-direction:column;gap:8px}.filters label{display:flex;align-items:center;gap:12px}.filters label span{width:47px;flex:none}.filters select{width:min(100%,360px)}.filters input{width:135px}.centers{grid-column:2;grid-row:1/3;padding:8px}.centers-header{display:flex;justify-content:space-between;gap:5px}.centers-header>span:last-child{display:flex}.centers button{background:transparent;border:0;padding:2px}.centers small{color:var(--muted)}
.table-area{flex:1;min-height:0;overflow:auto;border:1px solid var(--line);border-radius:5px;background:var(--panel)}table{width:100%;border-collapse:collapse;text-align:left}thead{position:sticky;top:0;background:var(--panel);z-index:1}th,td{padding:8px 9px;border-bottom:1px solid var(--line);vertical-align:top}th{border-bottom-color:var(--muted);font-weight:600}th:first-child{width:38px}th button{background:transparent;border:0;font-weight:600;padding:0}tbody tr:not(:has(.empty)){cursor:pointer}tbody tr:hover,tbody tr.selected{background:var(--space-raised,#e6edf6)}.name{font-weight:600}.empty{color:var(--muted)}.pages{display:flex;justify-content:flex-end;align-items:center;gap:9px}.pages button{background:var(--panel);border:1px solid var(--line);border-radius:4px;padding:4px 9px}
.details{background:var(--panel);border-left:1px solid var(--line);padding:19px 14px;overflow:auto;min-width:0}.details h2{font-size:14px;font-weight:500;text-align:center;margin:0 0 25px}.details h3{font-size:16px;margin:0 0 18px}.details dl{overflow-wrap:anywhere}.details dt{color:var(--muted);font-size:12px}.details dd{margin:3px 0 13px}.hint{text-align:center;color:var(--muted);margin-top:45px}.status{flex:none;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;background:var(--space-raised,#dce5f4);border-top:1px solid var(--line);font-size:12px}.status small{color:var(--muted)}
@media(max-width:1100px){.workspace{grid-template-columns:185px minmax(0,1fr) 225px;gap:7px}.controls{grid-template-columns:minmax(0,1fr) 160px}.tabs button{font-size:14px}.details{padding:14px 8px}}
@media(max-width:800px){.directory{height:auto;min-height:calc(100dvh - 110px);overflow:visible}.workspace{display:flex;flex-direction:column}.tabs{flex-direction:row;overflow-x:auto}.tabs button{min-width:145px}.tabs button.active:after{height:4px;width:auto;left:0;right:0;top:auto}.main{min-height:480px}.controls{grid-template-columns:minmax(0,1fr) 160px}.table-area{min-height:250px}.details{border:1px solid var(--line)}.status{flex-wrap:wrap}}
@media(max-width:560px){.controls{display:flex;flex-direction:column}.centers{min-height:50px}.table-area{overflow-x:auto}.table-area table{min-width:650px}}
</style>
