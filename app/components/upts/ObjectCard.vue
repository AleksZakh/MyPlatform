<script setup lang="ts">
import { computed } from 'vue';
import type { UptsContractDTO } from '~~/shared/types/upts';
import type { WorkUser } from '~~/shared/types/work';
import { workUserName } from '~~/shared/types/work';
import { uptsContractColor } from '~~/shared/utils/upts-color';
import { formatWorkDate } from '~~/shared/utils/work-board';
const props=defineProps<{object:UptsContractDTO;owner?:WorkUser;count?:number;canManage?:boolean}>();
const emit=defineEmits<{open:[];works:[];add:[];files:[];edit:[]}>();
const title=computed(()=>props.object.objectDetails?.sourceCadastralNumber || props.object.number || props.object.name);
const initials=computed(()=>workUserName(props.owner).split(/\s+/).filter(Boolean).slice(0,2).map(s=>s[0]).join(''));
const contractText=computed(()=>{
  const d=props.object.objectDetails;
  return [d?.basisContractNumber,d?.basisContractDate?'от '+formatWorkDate(d.basisContractDate):''].filter(Boolean).join(' ') || 'Не указан';
});
</script>
<template>
  <article class="upts-object-card" :style="{'--object-color':object.color || uptsContractColor(object.id)}">
    <div class="upts-object-card-body">
      <header>
        <button class="upts-object-card-title" type="button" @click="emit('open')">{{ title }}</button>
        <button class="upts-object-card-count" type="button" :aria-label="'Работы объекта: '+(count || 0)" @click="emit('works')">{{ count || 0 }}</button>
      </header>
      <div class="upts-object-card-content">
        <dl><div><dt>Объект</dt><dd>{{ object.objectDetails?.road || 'Не указан' }}</dd></div><div><dt>Этап</dt><dd>{{ object.objectDetails?.stage || 'Не указан' }}</dd></div><div><dt>Договор</dt><dd>{{ contractText }}</dd></div></dl>
        <div class="upts-object-card-tools">
          <button type="button" aria-label="Документы объекта" title="Документы объекта" @click="emit('files')"><Icon name="lucide:folder-open" /></button>
          <button v-if="canManage" type="button" aria-label="Изменить объект" title="Изменить объект" @click="emit('edit')"><Icon name="lucide:pencil" /></button>
        </div>
      </div>
      <footer><button v-if="canManage" class="upts-object-card-add" type="button" @click="emit('add')">+ Работа</button><button v-else class="upts-object-card-add" type="button" @click="emit('works')">Работы</button><time v-if="object.dueDate">{{ formatWorkDate(object.dueDate) }}</time><span v-if="owner" class="upts-object-card-person" :title="workUserName(owner)" :aria-label="workUserName(owner)">{{ initials }}</span></footer>
    </div>
  </article>
</template>
<style scoped>
.upts-object-card{width:250px;max-width:100%;min-width:0;padding:5px;border-radius:11px;background:color-mix(in srgb,var(--object-color) 50%,var(--work-panel));border-top:9px solid color-mix(in srgb,var(--object-color) 70%,var(--work-panel));align-self:start}
.upts-object-card-body{border:1px solid var(--work-line);border-radius:7px;background:var(--work-panel);color:var(--work-text);padding:9px 10px 7px}
.upts-object-card header{display:flex;align-items:start;gap:6px}.upts-object-card button{border:0;background:transparent;padding:0;color:inherit;border-radius:4px}.upts-object-card .upts-object-card-title{font-size:14px;line-height:1.4;text-align:left;flex:1;min-width:0;overflow-wrap:anywhere;font-weight:600}.upts-object-card .upts-object-card-count{font-size:11px;line-height:18px;min-width:20px;padding:0 4px;border-radius:12px;background:var(--work-line);color:var(--work-text)}
.upts-object-card-content{display:flex;align-items:start;gap:6px;margin-top:7px}.upts-object-card dl{flex:1;min-width:0;margin:0}.upts-object-card dl>div+div{margin-top:5px}.upts-object-card dt{font-size:11px;color:var(--work-muted);line-height:1.3}.upts-object-card dd{font-size:12px;line-height:1.4;margin:1px 0 0;overflow-wrap:anywhere}.upts-object-card-tools{display:grid;gap:9px}.upts-object-card-tools button{color:var(--work-muted);width:22px;height:22px;font-size:16px}.upts-object-card footer{border-top:1px solid var(--work-line);margin-top:9px;padding-top:6px;display:flex;align-items:center;gap:7px;font-size:11px;color:var(--work-muted)}.upts-object-card .upts-object-card-add{margin-right:auto;font-size:12px}.upts-object-card-person{border-radius:50%;width:23px;height:23px;display:grid;place-items:center;background:var(--work-line);color:var(--work-text);font-size:9px}.upts-object-card button:hover{color:var(--work-accent)}.upts-object-card:focus-within{outline:2px solid var(--work-accent);outline-offset:2px}
</style>
