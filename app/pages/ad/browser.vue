<script setup lang="ts">
import { usePhoneDirectory } from '~/composables/usePhoneDirectory';
import type { ContactDTO } from '~~/shared/types/contacts';
useHead({ title: 'Телефонный справочник — Space' });
const {
  contacts,
  loading,
  error,
  search,
  department,
  departments,
  page,
  pageCount,
  filtered,
  rows,
  start,
  end,
  updatedLabel,
  sortKey,
  descending,
  sort,
  load,
} = usePhoneDirectory();
const columns: { key: Exclude<keyof ContactDTO, 'id'>; label: string }[] = [
  { key: 'fullName', label: 'ФИО' },
  { key: 'telephoneNumber', label: 'Телефон' },
  { key: 'email', label: 'Электронная почта' },
  { key: 'department', label: 'Подразделение' },
  { key: 'position', label: 'Должность' },
];
</script>

<template>
  <section class="phone-directory">
    <header class="phone-heading">
      <div>
        <h1>Телефонный справочник</h1>
        <p>Контакты сотрудников компании</p>
      </div>
      <button :disabled="loading" @click="load">
        <Icon name="lucide:refresh-cw" />Обновить
      </button>
    </header>
    <div class="phone-filters">
      <label class="phone-search"
        >Поиск
        <input
          v-model="search"
          type="search"
          maxlength="200"
          placeholder="ФИО, телефон, почта, должность"
        />
      </label>
      <label
        >Подразделение
        <select v-model="department" aria-label="Подразделение">
          <option value="">Все подразделения</option>
          <option v-for="name in departments" :key="name" :value="name">
            {{ name }}
          </option>
        </select>
      </label>
      <button
        v-if="search || department"
        @click="
          search = '';
          department = '';
        "
      >
        Сбросить
      </button>
    </div>
    <div v-if="error" class="phone-error" role="alert">
      <span>{{ error }}</span
      ><button :disabled="loading" @click="load">Повторить</button>
    </div>
    <div class="phone-table" :aria-busy="loading">
      <table>
        <caption class="phone-sr-only">
          Контакты сотрудников компании
        </caption>
        <thead>
          <tr>
            <th
              v-for="column in columns"
              :key="column.key"
              scope="col"
              :aria-sort="
                sortKey === column.key
                  ? descending
                    ? 'descending'
                    : 'ascending'
                  : 'none'
              "
            >
              <button @click="sort(column.key)">
                {{ column.label }}
                <span v-if="sortKey === column.key" aria-hidden="true">{{
                  descending ? '↓' : '↑'
                }}</span>
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td :colspan="columns.length" class="phone-empty">
              <span role="status">Загрузка контактов…</span>
            </td>
          </tr>
          <template v-else>
            <tr v-for="contact in rows" :key="contact.id">
              <td class="phone-name">{{ contact.fullName }}</td>
              <td>{{ contact.telephoneNumber || '—' }}</td>
              <td>
                <a
                  v-if="contact.email"
                  :href="`mailto:${encodeURIComponent(contact.email)}`"
                  >{{ contact.email }}</a
                ><span v-else>—</span>
              </td>
              <td>{{ contact.department || '—' }}</td>
              <td>{{ contact.position || '—' }}</td>
            </tr>
            <tr v-if="!rows.length">
              <td :colspan="columns.length" class="phone-empty">
                {{
                  error
                    ? 'Контакты не загружены.'
                    : contacts.length
                      ? 'По вашему запросу сотрудники не найдены.'
                      : 'В справочнике пока нет контактов.'
                }}
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
    <footer class="phone-footer">
      <div aria-live="polite">
        <span v-if="!loading"
          >Показано: {{ filtered.length ? start + 1 : 0 }}–{{ end }} из
          {{ filtered.length }}</span
        >
        <small v-if="updatedLabel"
          >Данные обновлены: {{ updatedLabel }} (МСК)</small
        >
      </div>
      <nav aria-label="Страницы справочника">
        <button :disabled="loading || page <= 1" @click="page--">
          ← Назад
        </button>
        <span>Страница {{ page }} из {{ pageCount }}</span>
        <button :disabled="loading || page >= pageCount" @click="page++">
          Вперёд →
        </button>
      </nav>
    </footer>
  </section>
</template>

<style scoped>
.phone-directory {
  padding: 20px 24px;
  min-height: 100%;
  background: var(--space-bg, #f5f7fb);
  color: var(--space-text, #263445);
  font-size: 14px;
}
.phone-heading,
.phone-filters,
.phone-footer,
.phone-footer nav {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}
.phone-heading {
  justify-content: space-between;
  margin-bottom: 14px;
}
.phone-heading h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 650;
}
.phone-heading p {
  margin: 4px 0 0;
  color: var(--space-muted, #667589);
}
.phone-directory button,
.phone-directory input,
.phone-directory select {
  font: inherit;
  padding: 7px 10px;
  border: 1px solid var(--space-line, #cbd5e1);
  border-radius: 5px;
  background: var(--space-panel, #fff);
  color: inherit;
}
.phone-directory button {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.phone-directory button:hover:not(:disabled) {
  border-color: var(--space-accent, #2563eb);
}
.phone-directory button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.phone-filters {
  align-items: end;
  margin-bottom: 12px;
}
.phone-filters label {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}
.phone-filters .phone-search {
  flex: 1;
  min-width: 220px;
}
.phone-filters select {
  max-width: 420px;
}
.phone-error {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 10px;
  margin-bottom: 12px;
  background: var(--space-danger-bg, #fee4e2);
  color: var(--space-danger, #b42318);
  border-radius: 5px;
}
.phone-table {
  overflow: auto;
  border: 1px solid var(--space-line, #cbd5e1);
  border-radius: 7px;
}
.phone-table table {
  width: 100%;
  min-width: 800px;
  border-collapse: collapse;
  background: var(--space-panel, #fff);
  text-align: left;
}
.phone-table th,
.phone-table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--space-line, #d4dce5);
  vertical-align: top;
  overflow-wrap: anywhere;
}
.phone-table th {
  background: var(--space-raised, #edf2f7);
  white-space: nowrap;
}
.phone-table th button {
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
  justify-content: start;
  font-weight: 600;
}
.phone-table tbody tr:last-child td {
  border-bottom: 0;
}
.phone-table tbody tr:hover {
  background: var(--space-hover, #f1f5f9);
}
.phone-table .phone-name {
  font-weight: 500;
  min-width: 210px;
}
.phone-table a {
  color: var(--space-accent, #176b88);
}
.phone-table a:hover {
  text-decoration: underline;
}
.phone-table .phone-empty {
  text-align: center;
  padding: 30px 12px;
  color: var(--space-muted, #667589);
}
.phone-footer {
  justify-content: space-between;
  margin-top: 12px;
  font-size: 12px;
}
.phone-footer small {
  display: block;
  margin-top: 4px;
  color: var(--space-muted, #667589);
}
.phone-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
@media (max-width: 700px) {
  .phone-directory {
    padding: 12px;
  }
  .phone-filters label,
  .phone-filters select {
    width: 100%;
    max-width: 100%;
  }
  .phone-footer nav {
    gap: 8px;
  }
}
</style>
