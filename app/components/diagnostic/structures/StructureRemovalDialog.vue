<script setup lang="ts">
import {onMounted,ref} from 'vue';
import type {StructureListRow,StructureRemovalInfo,StructureRemovalMode} from '~~/shared/types/diagnostic-structures-api';

const props=defineProps<{structure:StructureListRow}>();
const emit=defineEmits<{close:[];removed:[mode:StructureRemovalMode]}>();
const url='/api/diagnostic/structures/'+props.structure.id;
const info=ref<StructureRemovalInfo|null>(null);
const busy=ref(false),checking=ref(false),error=ref('');

function failure(e:unknown,fallback:string){
  const problem=e as {status?:number;data?:{message?:string}};
  if(problem.status===403)return 'Нет права на удаление сооружений.';
  return problem.data?.message || fallback;
}

async function inspect(){
  info.value=null;
  error.value='';
  checking.value=true;
  try {
    info.value=await $fetch<StructureRemovalInfo>(url+'/removal');
  } catch(e) {
    error.value=failure(e,'Не удалось проверить связи сооружения.');
  } finally {
    checking.value=false;
  }
}
onMounted(inspect);

async function confirm(mode:StructureRemovalMode){
  if(!info.value || busy.value || (mode==='permanent' && !info.value.canDeletePermanently))return;
  busy.value=true;
  error.value='';
  try {
    await $fetch(url,{method:'DELETE',retry:0,headers:{'x-space-diagnostic':'1'},
      body:{confirmed:true,mode,version:info.value.version}});
    emit('removed',mode);
  } catch(e) {
    const message=failure(e,'Не удалось выполнить операцию. Проверьте состояние сооружения ещё раз.');
    // Refresh usage before accepting another destructive action, including after a lost response.
    await inspect();
    error.value=error.value || message;
  } finally {
    busy.value=false;
  }
}
</script>

<template>
  <UModal open title="Удаление сооружения" :description="'Код ИССО '+structure.issoCode" :dismissible="!busy" :close="busy ? false : undefined"
    :ui="{content:'st-card-panel sm:max-w-lg',header:'st-remove-header',body:'st-remove-body',footer:'st-card-footer st-remove-footer'}"
    @update:open="v=>{if(!v && !busy)emit('close')}">
    <template #body>
      <strong>{{ structure.structureName }} · {{ structure.roadName }} · {{ structure.location }}</strong>
      <p v-if="checking" role="status">Проверяем связи с договорами и командировками…</p>
      <div v-if="error" role="alert">{{ error }} <button v-if="!info && !checking" @click="inspect">Повторить проверку</button></div>
      <template v-if="info">
        <template v-if="!info.canDeletePermanently">
          <ul>
            <li v-if="info.contracts">Договоры Space, включая архивные: {{ info.contracts }}</li>
            <li v-if="info.legacyContracts">Дополнительные ссылки на договоры в старой базе: {{ info.legacyContracts }}</li>
            <li v-if="info.trips">Командировки: {{ info.trips }}</li>
          </ul>
          <p><strong>Это вывод сооружения из эксплуатации?</strong></p>
          <p>Сооружение исчезнет из действующего справочника. Договоры, работы и отчёты сохранят историю.</p>
        </template>
        <template v-else>
          <p>Связей с договорами и командировками не найдено.</p>
          <p>Если сооружение выведено из эксплуатации, его карточку можно сохранить в архиве. При полном удалении запись будет удалена без возможности восстановления.</p>
        </template>
      </template>
    </template>
    <template #footer>
      <button type="button" :disabled="busy" @click="emit('close')">Отмена</button>
      <button v-if="info" type="button" :disabled="busy" @click="confirm('decommission')">Вывести из эксплуатации</button>
      <button v-if="info?.canDeletePermanently" type="button" class="st-remove-permanent" :disabled="busy" @click="confirm('permanent')">Удалить полностью</button>
    </template>
  </UModal>
</template>

<style>
.st-remove-body{display:grid;gap:10px}
.st-remove-header,.st-remove-footer{background:var(--st-panel)}
.st-card-panel .st-remove-permanent{background:#a52b27;color:#fff;border-color:#a52b27}
.st-card-panel .st-remove-permanent:hover:not(:disabled){background:#83221f}
</style>
