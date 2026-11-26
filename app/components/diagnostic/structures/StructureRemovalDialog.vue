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
  <UModal open title="Удаление сооружения" :description="structure.issoCode"
    :dismissible="!busy" :close="!busy"
    :ui="{content:'diagnostic-contract-modal odis-work-card odis-structure-removal', header:'ow-chrome',
      description:'ow-number', body:'ow-body', footer:'ow-chrome ow-footer'}"
    @update:open="v=>{if(!v && !busy)emit('close')}">
    <template #body>
      <div class="ow-title"><h3>{{ structure.structureName }}</h3></div>
      <p class="ow-meta">{{ structure.roadName }} · {{ structure.location }}</p>
      <p v-if="checking" role="status">Проверяем связи с договорами и командировками…</p>
      <div v-if="error" role="alert">{{ error }} <button v-if="!info && !checking" type="button" @click="inspect">Повторить проверку</button></div>
      <template v-if="info">
        <template v-if="!info.canDeletePermanently">
          <ul class="removal-usage">
            <li v-if="info.contracts">Договоры Space, включая архивные: <strong>{{ info.contracts }}</strong></li>
            <li v-if="info.legacyContracts">Дополнительные ссылки на договоры в старой базе: <strong>{{ info.legacyContracts }}</strong></li>
            <li v-if="info.trips">Командировки: <strong>{{ info.trips }}</strong></li>
          </ul>
          <h4>Это вывод сооружения из эксплуатации?</h4>
          <p>Сооружение исчезнет из действующего справочника. Договоры, работы и отчёты сохранят историю.</p>
        </template>
        <template v-else>
          <p class="removal-usage">Связей с договорами и командировками не найдено.</p>
          <p>Если сооружение выведено из эксплуатации, его карточку можно сохранить в архиве. При полном удалении запись будет удалена без возможности восстановления.</p>
        </template>
      </template>
    </template>
    <template #footer>
      <button v-if="info" type="button" class="ow-primary" :disabled="busy" @click="confirm('decommission')">Вывести из эксплуатации</button>
      <button v-if="info?.canDeletePermanently" type="button" class="removal-delete" :disabled="busy" @click="confirm('permanent')">Удалить полностью</button>
      <button type="button" :disabled="busy" @click="emit('close')">Отмена</button>
    </template>
  </UModal>
</template>

<style src="~/assets/css/diagnostic-work-card.css"></style>
<style>
.diagnostic-contract-modal.odis-structure-removal { width: min(95vw, 36rem); }
.odis-structure-removal .ow-body { overflow-wrap: anywhere; }
.odis-structure-removal .removal-usage { border-top: 1px solid var(--contract-line); padding: 8px 0; }
.odis-structure-removal .ow-footer { flex-wrap: wrap; }
.odis-structure-removal .removal-delete { background: #953d3d; color: #fff; }
.odis-structure-removal [role=alert] button { text-decoration: underline; }
</style>
