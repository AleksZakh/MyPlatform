<template>
  <section class="my-4 rounded-lg border p-4">
    <div class="flex items-center justify-between gap-4">
      <h2 class="text-lg font-semibold">Удаления</h2>
      <button type="button" class="text-blue-700" :disabled="busy" @click="load">Обновить</button>
    </div>
    <p class="my-2 text-sm text-gray-500">Удаления реестра и справочников из журнала аудита. Фильтры действующих записей ниже к этому списку не применяются.</p>
    <p v-if="error" role="alert" class="text-red-700">{{ error }}</p>
    <p v-else-if="busy">Загрузка…</p>
    <div v-else class="overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead><tr><th class="p-2">Дата</th><th class="p-2">Запись</th><th class="p-2">Исполнитель</th><th class="p-2">Причина и описание</th></tr></thead>
        <tbody><tr v-for="row in rows" :key="row.id" class="border-t">
          <td class="p-2 whitespace-nowrap">{{ new Date(row.timestamp).toLocaleString('ru-RU') }}</td>
          <td class="p-2">{{ names[row.entityType || ''] || row.entityType }} №{{ row.entityId }}</td>
          <td class="p-2">{{ row.actorLogin || row.actorEmail }}</td><td class="p-2 whitespace-pre-wrap">{{ row.note || 'Описание отсутствует' }}</td>
        </tr><tr v-if="!rows.length"><td colspan="4" class="p-3">Событий удаления нет.</td></tr></tbody>
      </table>
    </div>
    <div class="mt-3 flex gap-4 items-center">
      <button type="button" :disabled="busy || page <= 1" @click="move(-1)">Назад</button>
      <span>{{ page }} / {{ Math.max(1, Math.ceil(total / 25)) }} · Событий: {{ total }}</span>
      <button type="button" :disabled="busy || page * 25 >= total" @click="move(1)">Вперёд</button>
    </div>
  </section>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue';
interface Row { id: number; timestamp: string; entityType: string | null; entityId: number | null; actorLogin: string | null; actorEmail: string; note: string | null }
const rows = ref<Row[]>([]), total = ref(0), page = ref(1), busy = ref(false), error = ref('');
const names: Record<string, string> = { SamplingTest: 'Отбор проб', ReceiptMaterial: 'Поступление', TestProtocol: 'Протокол', Material: 'Материал', Manufacturer: 'Производитель', TestObject: 'Объект', TestLocation: 'Место отбора', Plp: 'ПЛП' };
async function load() {
  if (busy.value) return;
  busy.value = true; error.value = '';
  try { const result = await $fetch<{ rows: Row[]; total: number }>('/api/lab/event-journal/deletions', { query: { page: page.value } }); rows.value = result.rows; total.value = result.total; }
  catch { error.value = 'Не удалось загрузить удаления. Проверьте доступ к журналу и повторите запрос.'; }
  finally { busy.value = false; }
}
function move(delta: number) { if (busy.value) return; page.value += delta; void load(); }
onMounted(load);
</script>
