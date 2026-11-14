<script setup lang="ts">
import {ref,reactive,computed} from 'vue';
import type {TripCatalog,TripRecord,TripStructureItem} from '~~/shared/types/diagnostic-trips';
import {tripToday,tripDefaultHours,tripDays,tripWorkType,hourUnits,hourLabel} from '~~/shared/utils/diagnostic-trip-lifecycle';
import {parseTripInput} from '~~/shared/utils/diagnostic-trips';
import TripDateInput from './TripDateInput.vue';
import TripStructurePicker from './TripStructurePicker.vue';
const props=defineProps<{trip:TripRecord|null;catalog:TripCatalog;readOnly:boolean;closing?:boolean}>();
const emit=defineEmits<{close:[];saved:[TripRecord]}>();
const c=props.trip,form=reactive({contractId:c?.contractId??0,executorId:c?.executorId??props.catalog.executors.find(e=>e.name==='ОДИС')?.id??0,start:c?.start??'',finish:c?.finish??'',noStructures:c?.noStructures??false,destination:c?.destination??'',assignment:c?.assignment??'',equipment:c?.equipment??'',transport:c?.transport??'',accommodation:c?.accommodation??'',note:c?.note??'',participantIds:[...(c?.participantIds||[])]});
const structures=ref<TripStructureItem[]>([...(c?.structures||[])]),participantQuery=ref(''),busy=ref(false),error=ref(''),confirmClose=ref(false);
const locked=computed(()=>props.readOnly||busy.value);
const resolvedParticipants=ref<{id:number;name:string}[]>([]);
const allParticipants=computed(()=>[...props.catalog.participants,...resolvedParticipants.value,...(c?.participants||[]).filter(p=>!props.catalog.participants.some(u=>u.id===p.id))]);
const matches=computed(()=>[
 ...props.catalog.participants.map(u=>({...u,key:String(u.id)})),
 ...(props.catalog.directoryParticipants||[]).filter(u=>!resolvedDirectoryIds.value.includes(u.directoryObjectId)).map(u=>({id:0,name:u.name,key:'ad:'+u.directoryObjectId})),
 ...resolvedParticipants.value.filter(u=>!props.catalog.participants.some(p=>p.id===u.id)).map(u=>({...u,key:String(u.id)})),
].filter(u=>!form.participantIds.includes(u.id)&&u.name.toLocaleLowerCase('ru').includes(participantQuery.value.toLocaleLowerCase('ru'))).sort((a,b)=>a.name.localeCompare(b.name,'ru')));
const resolvedDirectoryIds=ref<string[]>([]),addPerson=ref('');
async function add(){
 if(!addPerson.value)return;error.value='';
 try{
  let id:number;
  if(addPerson.value.startsWith('ad:')){
   busy.value=true;const guid=addPerson.value.slice(3);
   const person=await $fetch<{id:number;name:string}>('/api/diagnostic/trips/participants',{method:'POST',headers:{'x-space-diagnostic':'1'},body:{directoryObjectId:guid}});
   if(!resolvedParticipants.value.some(p=>p.id===person.id))resolvedParticipants.value.push(person);resolvedDirectoryIds.value.push(guid);id=person.id;
  }else id=Number(addPerson.value);
  if(!form.participantIds.includes(id))form.participantIds.push(id);addPerson.value='';
 }catch(e:any){error.value=e?.data?.message||e.message||'Не удалось добавить участника.';}finally{busy.value=false;}
}
function changeContract(e:Event){const next=Number((e.target as HTMLSelectElement).value);if(next===form.contractId)return;if(structures.value.length&&!window.confirm('При смене договора выбранные сооружения будут очищены. Продолжить?')){(e.target as HTMLSelectElement).value=String(form.contractId);return;}form.contractId=next;structures.value=[];}
const snapshot=()=>JSON.stringify({form,structures:structures.value.map(s=>s.id)}),initial=snapshot();
function close(){if(busy.value)return;if(!props.readOnly&&snapshot()!==initial)confirmClose.value=true;else emit('close');}
function toggleNoStructures(e:Event){const next=(e.target as HTMLInputElement).checked;if(next&&structures.value.length&&!window.confirm('Убрать выбранные сооружения из командировки?')){(e.target as HTMLInputElement).checked=false;return;}form.noStructures=next;if(next)structures.value=[];}
const factHours=reactive<Record<number,string>>(Object.fromEntries((c?.participants||[]).map(p=>[p.id,p.factHours??tripDefaultHours(c!.start,c!.finish)])));
const totalHours=computed(()=>{try{return hourLabel(Object.values(factHours).reduce((sum,h)=>sum+hourUnits(h),0n));}catch{return '—';}});
const mailLabel=(s:string)=>({PENDING:'В очереди',SENDING:'Отправляется',SENT:'Передано почтовому серверу',FAILED:'Ошибка отправки',UNKNOWN:'Результат неизвестен'}[s]||s);
async function save(){
 error.value='';
 if(props.closing){await complete();return;}
 if(props.readOnly)return;
 if(addPerson.value){error.value='Участник выбран, но не добавлен в список. Нажмите «Добавить» либо сбросьте выбор участника перед сохранением.';return;}
 try{
  const input=parseTripInput({...form,structureIds:structures.value.map(s=>s.id)});
  const backdated=(!c||c.start!==input.start)&&input.start<tripToday();
  if(backdated&&!window.confirm('Вы планируете командировку в прошлом — заполняете её задним числом. Подтвердить сохранение?'))return;
  busy.value=true;
  const row=await $fetch<TripRecord>('/api/diagnostic/trips'+(c?'/'+c.id:''),{method:c?'PUT':'POST',headers:{'x-space-diagnostic':'1'},body:{...input,version:c?.version,backdatedConfirmed:backdated}});emit('saved',row);
 }catch(e:any){error.value=e?.data?.message||e.message||'Не удалось сохранить командировку.';}finally{busy.value=false;}
}
async function complete(){
 if(!c)return;
 try{
  const participants=c.participants.map(p=>({userId:p.id,hours:hourLabel(hourUnits(factHours[p.id]))}));
  if(!window.confirm(`Закрыть командировку ${c.number} и все связанные с ней работы? Факт: ${totalHours.value} чел·ч на всех участников.`))return;
  busy.value=true;
  const row=await $fetch<TripRecord>(`/api/diagnostic/trips/${c.id}/close`,{method:'POST',headers:{'x-space-diagnostic':'1'},body:{version:c.version,participants}});emit('saved',row);
 }catch(e:any){error.value=e?.data?.message||e.message||'Не удалось закрыть командировку.';}finally{busy.value=false;}
}

</script>
<template>
 <UModal :open="true" :title="closing?'Закрытие командировки '+trip?.number:trip?(readOnly?'Просмотр командировки':'Редактирование командировки'):'Новая командировка'" :ui="{content:'odis-trip-modal '+(readOnly?'odis-trip-view':'odis-trip-edit'),header:'trip-modal-header',body:'trip-modal-body',footer:'trip-modal-footer'}" @update:open="v=>{if(!v)close()}">
  <template #body><form id="odis-trip-form" @submit.prevent="save">
   <div class="trip-main-fields"><div class="trip-dates-contract"><label>Организация-исполнитель *<select v-model.number="form.executorId" :disabled="locked"><option :value="0">Выберите исполнителя</option><option v-for="e in catalog.executors" :key="e.id" :value="e.id">{{e.name}}</option></select></label><label>Номер договора *<select :value="form.contractId" :disabled="locked" @change="changeContract"><option :value="0">Выберите договор</option><option v-if="trip&&!catalog.contracts.some(c=>c.id===trip.contractId)" :value="trip.contractId">{{trip.contractNumber}} — недоступен</option><option v-for="c in catalog.contracts" :key="c.id" :value="c.id">{{c.number}}</option></select></label><label>Дата начала *<TripDateInput v-model="form.start" label="Дата начала" :disabled="locked" required/></label><label>Дата окончания *<TripDateInput v-model="form.finish" label="Дата окончания" :disabled="locked" required/></label></div>
   <div class="trip-participants"><label>Участники *<input v-if="!readOnly" v-model="participantQuery" :disabled="locked" placeholder="Найти участника по фамилии"/></label><div v-if="!readOnly" class="trip-person-add"><select v-model="addPerson" :disabled="locked"><option value="">Выберите участника</option><option v-for="p in matches" :key="p.key" :value="p.key">{{p.name}}</option></select><button type="button" :disabled="locked||!addPerson" @click="add">Добавить</button></div><ul><li v-for="id in form.participantIds" :key="id">{{allParticipants.find(p=>p.id===id)?.name||('#'+id)}}<button v-if="!readOnly" type="button" :disabled="locked" :aria-label="`Убрать участника ${allParticipants.find(p=>p.id===id)?.name}`" @click="form.participantIds=form.participantIds.filter(p=>p!==id)">×</button></li><li v-if="!form.participantIds.length">Участники не выбраны</li></ul></div></div>
   <div class="trip-bar"><strong>Сооружения</strong><label class="trip-inline-check"><input type="checkbox" :checked="form.noStructures" :disabled="locked" @change="toggleNoStructures"/>Без указания сооружений</label></div>
   <label v-if="form.noStructures" class="trip-destination">Место назначения / маршрут<textarea v-model="form.destination" :disabled="locked" rows="2" maxlength="10000"/></label>
   <div v-else-if="readOnly" class="trip-table-scroll trip-picker-table"><table><thead><tr><th>Код ИССО</th><th>Сооружение</th><th>Автодорога</th><th>Км+м</th><th>Доп. идентификатор</th></tr></thead><tbody><tr v-for="s in structures" :key="s.id"><td>{{s.code}}</td><td>{{s.structureName}}</td><td>{{s.roadName}}</td><td>{{s.location}}</td><td>{{s.additionalId}}</td></tr></tbody></table></div>
   <TripStructurePicker v-else v-model="structures" :contract-id="form.contractId" :disabled="locked"/>
   <p v-if="!readOnly&&!trip?.legacyIds.length&&form.start&&form.finish" class="trip-notice">{{form.noStructures?'Без сооружений работы по сооружениям не создаются.':`Для каждого сооружения будет создана работа «${tripWorkType(form.start,form.finish).name}» (${tripWorkType(form.start,form.finish).code}).`}}</p>
   <div class="trip-bar"><strong>Дополнительная информация</strong></div><div class="trip-extra"><label>Задание<textarea v-model="form.assignment" :disabled="locked" rows="2" maxlength="10000"/></label><label>Оборудование<textarea v-model="form.equipment" :disabled="locked" rows="2" maxlength="10000"/></label><label>Транспорт<input v-model="form.transport" :disabled="locked" maxlength="10000" list="trip-transport-options"/><datalist id="trip-transport-options"><option>Корпоративный транспорт</option><option>Личный транспорт</option><option>Общественный транспорт</option></datalist></label><label>Проживание<input v-model="form.accommodation" :disabled="locked" maxlength="10000"/></label><div class="trip-documents"><span>Документы по командировке</span><button type="button" disabled>Прикрепление документов пока недоступно</button></div><label>Примечания<textarea v-model="form.note" :disabled="locked" rows="2" maxlength="10000"/></label><div class="trip-info">{{trip?.number||'Номер будет назначен при сохранении'}}<br/>{{trip?.status==='COMPLETED'?'Завершена':'Запланирована'}}<span v-if="trip?.previousNumber"> · Прежний номер: {{trip.previousNumber}}</span><span v-if="trip?.legacyIds.length"> · Старые ID: {{trip.legacyIds.join(', ')}}</span></div></div>
   <section v-if="closing||trip?.participants.some(p=>p.factHours!=null)" class="trip-facts">
    <div class="trip-bar"><strong>Фактическое время участников</strong><span>Всего: {{totalHours}} чел·ч</span></div>
    <p v-if="closing" class="trip-notice">По умолчанию: {{tripDays(form.start,form.finish)}} дн. × 8 ч = {{tripDefaultHours(form.start,form.finish)}} ч каждому участнику. Общий объём распределяется поровну между сооружениями без повторного начисления.</p>
    <div class="trip-table-scroll"><table><thead><tr><th>Участник</th><th>Фактическое время, чел·ч</th></tr></thead><tbody><tr v-for="p in trip?.participants" :key="p.id"><td>{{p.name}}</td><td><input v-if="closing" v-model="factHours[p.id]" inputmode="decimal" :disabled="busy" :aria-label="`Фактическое время: ${p.name}`"/><span v-else>{{p.factHours??'—'}}</span></td></tr></tbody></table></div>
    <p v-if="closing" class="trip-notice">Будут закрыты все связанные работы этой поездки. Даты факта — {{form.start.split('-').reverse().join('.')}}–{{form.finish.split('-').reverse().join('.')}}.</p>
   </section>
   <section v-if="readOnly&&!closing&&trip?.emails?.length" class="trip-mail-status"><div class="trip-bar"><strong>Почтовые уведомления</strong></div><p v-for="(mail,i) in trip.emails" :key="i" class="trip-notice">{{trip.participants.find(p=>p.id===mail.userId)?.name||'Участник'}}: {{mailLabel(mail.status)}}<span v-if="mail.error"> — {{mail.error}}</span></p></section>
   <p v-if="!readOnly&&catalog.warning" class="trip-notice">{{catalog.warning}}</p><p v-if="error" class="trip-error" role="alert">{{error}}</p>
  </form></template>
  <template #footer><div class="trip-footer"><div v-if="confirmClose" role="alert">Закрыть без сохранения? <button type="button" @click="emit('close')">Да, закрыть</button><button type="button" @click="confirmClose=false">Продолжить</button></div><span>{{closing?'Закрытие командировки':readOnly?'Режим просмотра':'* Обязательные поля'}}</span><div><button v-if="closing" class="trip-primary trip-complete-button" form="odis-trip-form" type="submit" :disabled="busy">{{busy?'Закрытие…':'Закрыть командировку'}}</button><button v-else-if="!readOnly" class="trip-primary" form="odis-trip-form" type="submit" :disabled="busy">{{busy?'Сохранение…':'Сохранить'}}</button><button type="button" :disabled="busy" @click="close">{{closing?'Отменить':readOnly?'Закрыть':'Отменить'}}</button></div></div></template>
 </UModal>
</template>
