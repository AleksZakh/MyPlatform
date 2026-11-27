<script setup lang="ts">
import type {StructureHistoryEntry,StructureHistoryPage} from '~~/shared/types/diagnostic-structures-api';
import {structureRequestError} from '~/composables/diagnostic/useStructures';
const props = defineProps<{id:number;contractId?:number}>();
const rows = ref<StructureHistoryEntry[]>([]), next = ref<number|null>(null);
const busy = ref(false), error = ref('');
const actions: Record<string,string> = {CREATE:'Создание',UPDATE:'Изменение',IMPORT:'Импорт',DELETE:'Снятие с учёта'};
const controller = new AbortController();
async function load() {
  if (busy.value) return;
  busy.value=true; error.value='';
  try {
    const result = await $fetch<StructureHistoryPage>(`/api/diagnostic/structures/${props.id}`,{
      query:{section:'history',contractId:props.contractId,before:next.value ?? undefined},signal:controller.signal,
    });
    rows.value.push(...result.items); next.value=result.next;
  } catch(e) { if (!controller.signal.aborted) error.value=structureRequestError(e); }
  finally { busy.value=false; }
}
onMounted(load);
onBeforeUnmount(()=>controller.abort());
</script>
<template>
  <section aria-label="История изменений" class="object-history">
    <article v-for="row in rows" :key="row.id">
      <header><strong>{{actions[row.action] || row.action}}</strong> · {{row.actor}}
        <time :datetime="row.date">{{new Date(row.date).toLocaleDateString('ru-RU')}} · {{new Date(row.date).toLocaleTimeString('ru-RU',{hour12:false})}}</time>
      </header>
      <p v-if="row.source">{{ row.source }}</p>
      <table v-if="row.fields.length"><thead><tr><th>Поле</th><th>Было</th><th>Стало</th></tr></thead>
        <tbody><tr v-for="f in row.fields" :key="f.label"><th>{{f.label}}</th><td>{{f.before || '—'}}</td><td>{{f.after || '—'}}</td></tr></tbody>
      </table>
      <small v-else>Значения отдельных полей для этого события не записаны.</small>
    </article>
    <p v-if="busy" role="status">Загрузка истории…</p>
    <p v-else-if="error" role="alert">{{error}} <button type="button" @click="load">Повторить</button></p>
    <button v-else-if="next" type="button" @click="load">Показать ещё</button>
    <p v-else-if="!rows.length">В журнале пока нет записей об этом сооружении.</p>
  </section>
</template>
