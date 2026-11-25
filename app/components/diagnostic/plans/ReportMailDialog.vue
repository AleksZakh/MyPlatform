<script setup lang="ts">
import {ref,onMounted} from 'vue';
import type {ReportInfo} from '~~/shared/utils/diagnostic-reports';
const props=defineProps<{report:ReportInfo;skipPrompt:boolean}>();
const emit=defineEmits<{close:[remember:boolean,sent:boolean]}>();
const dialog=ref<HTMLDialogElement>(),people=ref<{id:number;name:string;email:string}[]>([]),ids=ref<number[]>([]);
const remember=ref(props.skipPrompt),loading=ref(false),sending=ref(false),message=ref(''),loadError=ref(false);
async function load(){
  loading.value=true;loadError.value=false;message.value='';
  try{people.value=await $fetch('/api/diagnostic/reports/recipients');}
  catch{message.value='Не удалось загрузить получателей.';loadError.value=true;}
  finally{loading.value=false;}
}
function close(){if(!sending.value)emit('close',remember.value,false);}
async function send(){
  if(sending.value||!ids.value.length)return;
  sending.value=true;message.value='';
  try{
    const response=await $fetch<{sent:number[]}>('/api/diagnostic/reports/'+props.report.id+'/mail',{
      method:'POST',retry:0,headers:{'x-space-diagnostic':'1'},body:{recipientIds:ids.value}});
    if(response.sent.length===ids.value.length){emit('close',remember.value,true);return;}
    ids.value=ids.value.filter(id=>!response.sent.includes(id));
    people.value=people.value.filter(p=>!response.sent.includes(p.id));
    message.value='Сервер принял письмо для '+response.sent.length+' получателей. Остальные остались в списке.';
  }catch(e:any){message.value=e.data?.message||'Не удалось подтвердить доставку письма.';}
  finally{sending.value=false;}
}
onMounted(()=>{dialog.value?.showModal();void load();});
</script>
<template>
 <dialog ref="dialog" class="report-mail" aria-labelledby="report-mail-title" @cancel.prevent="close">
  <header><h3 id="report-mail-title">Отправить отчёт на почту?</h3><button type="button" class="opr-button" aria-label="Закрыть" :disabled="sending" @click="close">×</button></header>
  <section><p>{{report.title}}</p>
   <fieldset :disabled="sending"><legend>Получатели</legend>
    <p v-if="loading" role="status">Загрузка…</p>
    <label v-for="p in people" :key="p.id"><input v-model="ids" type="checkbox" :value="p.id"/><span>{{p.name}}<small>{{p.email}}</small></span></label>
    <p v-if="!loading&&!people.length&&!loadError">У сотрудников ОДИС нет доступных адресов.</p>
   </fieldset>
   <p v-if="message" role="alert">{{message}} <button v-if="loadError" class="opr-button" @click="load">Повторить</button></p>
  </section>
  <footer><label><input v-model="remember" type="checkbox"/>Не показывать это сообщение</label><div>
   <button class="opr-button" :disabled="sending" @click="close">Без отправки</button>
   <button class="opr-button" :disabled="!ids.length||sending" @click="send">{{sending?'Отправка…':'Отправить'}}</button>
  </div></footer>
 </dialog>
</template>
<style scoped>
.report-mail{position:fixed;inset:0;margin:auto;width:min(560px,94vw);max-height:88dvh;border:1px solid var(--opr-line);border-radius:7px;padding:0;background:var(--opr-field);color:var(--opr-text);box-shadow:0 12px 45px #0004}
.report-mail::backdrop{background:#13263766}.report-mail header,.report-mail footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;background:var(--opr-chrome)}
.report-mail header{border-bottom:1px solid var(--opr-line)}h3{font-size:16px;font-weight:600}.report-mail section{padding:14px 16px}.report-mail fieldset{margin-top:10px;max-height:42dvh;overflow:auto;border:1px solid var(--opr-line);padding:6px 12px}.report-mail label{display:flex;align-items:center;gap:8px;font-size:13px}.report-mail fieldset label{padding:4px 0}.report-mail small{display:block;color:var(--opr-muted)}footer{border-top:1px solid var(--opr-line);flex-wrap:wrap}footer div{display:flex;gap:6px}.report-mail input{accent-color:var(--opr-accent)}
</style>
