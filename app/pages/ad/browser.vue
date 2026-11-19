<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { usePhoneDirectory } from '~/composables/usePhoneDirectory';
import type { ContactDTO } from '~~/shared/types/contacts';

useHead({ title: 'Телефонный справочник — Space' });
const tabs = [
  { id: 'engineering', label: 'Автодор-Инжиниринг' },
  { id: 'group', label: 'ГК Автодор' },
  { id: 'management', label: 'УК Автодор' },
  { id: 'roads', label: 'Автодор-Платные дороги и другие общества группы компаний' },
] as const;
const activeTab = ref<(typeof tabs)[number]['id']>('engineering');
const activeIndex = computed(() => tabs.findIndex(tab => tab.id === activeTab.value));
const selectedId = ref<string | null>(null);
const phoneFilter = ref('');
const centersOpen = ref(true);
const { contacts, loading, error, search, department, departments, filtered, page, pageCount, sortKey, descending, sort, load, updatedLabel } = usePhoneDirectory(activeTab);
const hasData = computed(() => true);
const matches = computed(() => filtered.value.filter(c => c.telephoneNumber.includes(phoneFilter.value.trim())));
const pageRows = computed(() => matches.value.slice((page.value - 1) * 25, page.value * 25));
const totalPages = computed(() => Math.max(1, Math.ceil(matches.value.length / 25)));
const selected = computed(() => contacts.value.find(c => c.id === selectedId.value));
const failedAvatarUrl = ref('');
const editing = ref(false);
const saving = ref(false);
const editError = ref('');
const editFields = ref({ city: '', address: '', room: '', mobilePhone: '' });
function beginEdit() {
  if (!selected.value?.canEdit) return;
  editFields.value = {
    city: selected.value.city, address: selected.value.address,
    room: selected.value.room, mobilePhone: selected.value.mobilePhone,
  };
  editing.value = true;
  editError.value = '';
}
async function saveEdit() {
  const contact = selected.value;
  if (!contact?.canEdit || saving.value) return;
  saving.value = true;
  editError.value = '';
  try {
    const saved = await $fetch<typeof editFields.value>(`/api/contacts/${encodeURIComponent(contact.id)}`, {
      method: 'PATCH', body: editFields.value, query: { scope: activeTab.value },
    });
    Object.assign(contact, saved);
    editing.value = false;
  } catch (cause: unknown) {
    const failure = cause as { data?: { message?: string; data?: { message?: string } } };
    editError.value = failure.data?.data?.message || failure.data?.message || 'Не удалось сохранить изменения.';
  } finally { saving.value = false; }
}
const columns: {key: Exclude<keyof ContactDTO, 'id' | 'canEdit' | 'avatarUrl'>; label: string}[] = [
  { key: 'fullName', label: 'ФИО' },
  { key: 'department', label: 'Отдел' },
  { key: 'telephoneNumber', label: 'Вн. тел.' },
  { key: 'email', label: 'mail' },
];
watch(activeTab, () => { selectedId.value = null; search.value = ''; department.value = ''; phoneFilter.value = ''; page.value = 1; });
watch(selectedId, () => { editing.value = false; editError.value = ''; failedAvatarUrl.value = ''; });
watch(phoneFilter, () => { selectedId.value = null; page.value = 1; });
watch(totalPages, n => { page.value = Math.min(page.value, n); });
</script>

<template>
  <section class="directory">
    <header class="titlebar"><span><Icon name="lucide:phone" /> Телефонный справочник</span><button title="Обновить данные AD" :disabled="loading" @click="load"><Icon name="lucide:refresh-cw" /></button></header>
    <div class="workspace">
      <nav class="tabs" :class="{ 'roads-active': activeTab === 'roads' }" aria-label="Организации" :style="{ '--active-index': activeIndex }">
        <button v-for="tab in tabs" :key="tab.id" :class="{ active: activeTab === tab.id }" :aria-current="activeTab === tab.id ? 'page' : undefined" @click="activeTab = tab.id">{{ tab.label }}</button>
      </nav>
      <main class="main">
        <div class="controls">
          <div class="searchbox">
            <input v-model="search" type="search" placeholder="ФИО, отдел, должность, телефон, почта" maxlength="200" aria-label="Поиск по всем полям" :disabled="!hasData" />
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
                  <td>{{ (page - 1) * 25 + i + 1 }}</td><td class="name">{{ contact.fullName }}</td><td class="department-name" :title="contact.department || undefined">{{ contact.department || '—' }}</td><td>{{ contact.telephoneNumber || '—' }}</td><td><a v-if="contact.email" :href="`mailto:${contact.email}`" @click.stop>{{ contact.email }}</a><span v-else>—</span></td><td>{{ contact.city || '—' }}</td>
                </tr>
              </template>
              <tr v-else><td colspan="6" class="empty">{{ error || (contacts.length ? 'По заданным условиям никого не найдено. Попробуйте изменить условия фильтрации.' : 'В справочнике пока нет контактов.') }}</td></tr>
            </tbody>
          </table>
        </div>
        <nav v-if="hasData && totalPages > 1" class="pages"><span>Страница {{ page }} из {{ totalPages }}</span><button :disabled="page <= 1" @click="page--">Назад</button><button :disabled="page >= totalPages" @click="page++">Вперёд</button></nav>
      </main>
      <aside class="details">
        <template v-if="selected">
          <div class="avatar">
            <img v-if="selected.avatarUrl && failedAvatarUrl !== selected.avatarUrl" :src="selected.avatarUrl" class="avatar-photo" alt="" width="150" height="150" @error="failedAvatarUrl = selected.avatarUrl" />
            <Icon v-else name="streamline-freehand-color:face-id-male-1" size="112" aria-hidden="true" />
          </div>
          <h3>{{ selected.fullName }}</h3>
          <p class="position">{{ selected.position || 'Должность не указана' }}</p>
          <p class="department-full">{{ selected.department || 'Подразделение не указано' }}</p>
          <form v-if="editing" class="edit-form" @submit.prevent="saveEdit">
            <label>Город<input v-model="editFields.city" maxlength="120" /></label>
            <label>Адрес<input v-model="editFields.address" maxlength="500" /></label>
            <label>Комната<input v-model="editFields.room" maxlength="100" /></label>
            <label>Мобильный телефон<input v-model="editFields.mobilePhone" maxlength="50" type="tel" /></label>
            <p class="readonly-note">ФИО, отдел, должность, email и внутренний телефон поступают из AD и не редактируются здесь.</p>
            <p v-if="editError" class="edit-error" role="alert">{{ editError }}</p>
            <div class="edit-actions"><button type="button" :disabled="saving" @click="editing = false">Отмена</button><button type="submit" :disabled="saving">{{ saving ? 'Сохранение…' : 'Сохранить' }}</button></div>
          </form>
          <template v-else>
            <button v-if="selected.canEdit" class="edit-button" @click="beginEdit"><Icon name="lucide:pencil" /> Редактировать</button>
            <dl>
              <dt><Icon name="lucide:map-pin" /> Город</dt><dd>{{ selected.city || '—' }}</dd>
              <dt><Icon name="lucide:building-2" /> Адрес</dt><dd>{{ selected.address || '—' }}</dd>
              <dt><Icon name="lucide:door-open" /> Комната</dt><dd>{{ selected.room || '—' }}</dd>
              <dt><Icon name="lucide:mail" /> Email</dt><dd><a v-if="selected.email" :href="`mailto:${selected.email}`">{{ selected.email }}</a><span v-else>—</span></dd>
              <dt><Icon name="lucide:phone-call" /> Вн. номер</dt><dd>{{ selected.telephoneNumber || '—' }}</dd>
              <dt><Icon name="lucide:smartphone" /> Моб. номер</dt><dd>{{ selected.mobilePhone || '—' }}</dd>
            </dl>
          </template>
        </template>
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
.table-area table{table-layout:fixed;min-width:880px}
.table-area th:nth-child(1){width:4%}
.table-area th:nth-child(2){width:23%}
.table-area th:nth-child(3){width:27%}
.table-area th:nth-child(4){width:12%}
.table-area th:nth-child(5){width:23%}
.table-area th:nth-child(6){width:11%}
.table-area td{overflow-wrap:anywhere}
.table-area td.department-name{font-size:11px;line-height:1.3;white-space:normal;word-break:normal;hyphens:auto;padding-top:6px;padding-bottom:6px}
.details{background:var(--panel);border-left:1px solid var(--line);padding:19px 14px;overflow:auto;min-width:0}.details h2{font-size:14px;font-weight:500;text-align:center;margin:0 0 25px}.details h3{font-size:16px;margin:0 0 18px}.details dl{overflow-wrap:anywhere}.details dt{color:var(--muted);font-size:12px}.details dd{margin:3px 0 13px}.hint{text-align:center;color:var(--muted);margin-top:45px}.status{flex:none;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;background:var(--space-raised,#dce5f4);border-top:1px solid var(--line);font-size:12px}.status small{color:var(--muted)}
@media(max-width:1100px){.workspace{grid-template-columns:185px minmax(0,1fr) 225px;gap:7px}.controls{grid-template-columns:minmax(0,1fr) 160px}.tabs button{font-size:14px}.details{padding:14px 8px}}
@media(max-width:800px){.directory{height:auto;min-height:calc(100dvh - 110px);overflow:visible}.workspace{display:flex;flex-direction:column}.tabs{flex-direction:row;overflow-x:auto}.tabs button{min-width:145px}.tabs button.active:after{height:4px;width:auto;left:0;right:0;top:auto}.main{min-height:480px}.controls{grid-template-columns:minmax(0,1fr) 160px}.table-area{min-height:250px}.details{border:1px solid var(--line)}.status{flex-wrap:wrap}}
@media(max-width:560px){.controls{display:flex;flex-direction:column}.centers{min-height:50px}.table-area{overflow-x:auto}.table-area table{min-width:650px}}
.directory{height:100%;min-height:0;box-sizing:border-box}
.workspace{min-height:0}
.tabs,.searchbox,.filters,.centers,.table-area,.details{box-shadow:0 2px 8px rgba(18,27,39,.12)}
.tabs{background:var(--space-raised,#e9eaed)}
.tabs button{transition:background-color .16s ease,color .16s ease,border-color .16s ease}
.tabs button.active{color:var(--space-text,#39414d);border-color:#626b74;background:var(--space-panel,#fff)}
.tabs button.active:after{background:#626b74;transition:background-color .18s ease}
.tabs{position:relative}
.tabs button{height:65px;min-height:65px}
.tabs button:last-child{height:114px;min-height:114px;line-height:1.35}
.tabs:after{content:'';position:absolute;right:0;top:calc(8px + var(--active-index) * 68px);height:65px;width:7px;border-radius:6px;background:#626b74;transition:top .2s ease-out,height .2s ease-out;pointer-events:none}
.tabs.roads-active:after{height:114px}
@media(max-width:1100px){.tabs button:last-child{height:130px;min-height:130px}.tabs.roads-active:after{height:130px}}
.tabs button.active:after{display:none}
.searchbox,.filters{background:var(--space-raised,#e5e7eb)}
.table-area{background:var(--space-raised,#e9eaed)}
.table-area table{background:transparent}
.table-area thead{background:var(--space-raised,#e9eaed)}
.details{background:var(--space-raised,#e3e6ea)}
.avatar{width:150px;height:150px;display:grid;place-items:center;margin:0 auto 13px;background:var(--space-panel,#f7f7f7);color:var(--space-muted,#b4b8bd)}
.avatar-photo{display:block;width:100%;height:100%;object-fit:cover}
.avatar :deep(svg){width:112px;height:112px;stroke-width:1}
.details h3{font-size:19px;font-weight:500;margin:0 0 14px;overflow-wrap:anywhere}
.details .position{margin:0 0 8px}
.details .department-full{font-size:12px;line-height:1.5;color:var(--muted);margin:0 0 20px}
.details dt{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:inherit}
.details dd{margin:4px 0 12px 24px;overflow-wrap:anywhere}
.details dl :deep(svg){flex:none}
@media(max-width:800px){.directory{min-height:0;height:100%}}
@media(max-width:800px){.tabs:after{display:none}.tabs button.active:after{display:block;background:#626b74}}
@media(max-width:800px){.tabs button:last-child{min-width:245px;height:65px;min-height:65px;font-size:12px}}
.directory{--soft:color-mix(in srgb,var(--space-panel,#fff) 55%,var(--space-raised,#e9eaed) 45%)}
.tabs,.table-area,.table-area thead,.details{background:var(--soft)}
.edit-button,.edit-actions button{display:inline-flex;align-items:center;justify-content:center;gap:6px;border:1px solid var(--line);border-radius:5px;padding:6px 10px;background:var(--panel)}
.edit-button{margin:0 0 17px}.edit-form{display:flex;flex-direction:column;gap:12px}.edit-form label{display:flex;flex-direction:column;gap:4px}.edit-form input{width:100%;box-sizing:border-box}.edit-actions{display:flex;gap:8px;justify-content:flex-end}.edit-actions button[type=submit]{background:var(--space-accent,#2563eb);color:white}.readonly-note{font-size:12px;color:var(--muted)}.edit-error{color:var(--space-danger,#b42318)}
</style>
