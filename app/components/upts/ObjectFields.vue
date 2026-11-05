<script setup lang="ts">
import { computed } from 'vue';
import type { UptsObjectDetails } from '~~/shared/types/upts-object';
import { workUserName, type WorkUser } from '~~/shared/types/work';
const details=defineModel<UptsObjectDetails>({required:true});
defineProps<{staff:WorkUser[];roads:string[];stages:string[]}>();
const holders=computed({get:()=>details.value.rightHolders?.join('\n')||'',set:v=>{details.value.rightHolders=v.split('\n');}});
const uses=computed({get:()=>details.value.permittedUses?.join('\n')||'',set:v=>{details.value.permittedUses=v.split('\n');}});
</script>
<template>
  <section class="upts-object-fields">
    <h3>Дорога и этап</h3>
    <div class="work-two">
      <label>Автомобильная дорога<input v-model="details.road" list="upts-object-roads" maxlength="500" placeholder="Например, М-4 или М-12" /><datalist id="upts-object-roads"><option v-for="r in roads" :key="r" :value="r" /></datalist></label>
      <label>Этап<input v-model="details.stage" list="upts-object-stages" maxlength="500" placeholder="Название или номер этапа" /><datalist id="upts-object-stages"><option v-for="s in stages" :key="s" :value="s" /></datalist></label>
    </div>
    <h3>Исходные сведения</h3>
    <label>Правообладатели<textarea v-model="holders" rows="2" maxlength="15030" placeholder="Каждый правообладатель — с новой строки" /></label>
    <div class="work-two">
      <label>Область<input v-model="details.region" maxlength="500" /></label>
      <label>Тип сделки<input v-model="details.dealType" maxlength="500" /></label>
      <label>Кадастровый номер исходного ЗУ<input v-model="details.sourceCadastralNumber" maxlength="100" /></label>
      <label>Площадь исходного ЗУ, кв. м<input v-model="details.sourceArea" inputmode="decimal" maxlength="30" pattern="[0-9]+([.,][0-9]+)?" /></label>
      <label>Вид права<input v-model="details.rightKind" maxlength="500" /></label>
      <label>Тип учёта<input v-model="details.accountingType" maxlength="500" /></label>
    </div>
    <label>ВРИ исходного ЗУ<textarea v-model="uses" rows="2" maxlength="15030" placeholder="Каждый вид разрешённого использования — с новой строки" /></label>
    <h3>Сведения КУВД</h3>
    <div v-for="(entry,index) in details.kuvdEntries" :key="index" class="upts-kuvd-row">
      <label>Номер КУВД<input v-model="entry.number" maxlength="100" /></label>
      <label>Дата КУВД<input v-model="entry.date" type="date" /></label>
      <button type="button" :aria-label="'Удалить запись КУВД '+(index+1)" @click="details.kuvdEntries!.splice(index,1)">×</button>
    </div>
    <button type="button" :disabled="(details.kuvdEntries?.length||0)>=30" @click="(details.kuvdEntries ||= []).push({number:'',date:null})">+ Запись КУВД</button>
    <h3>Ответственные по объекту</h3>
    <div class="work-two">
      <label>Куратор<select v-model="details.curatorId"><option :value="null">Не назначен</option><option v-if="details.curatorId && !staff.some(u=>u.id===details.curatorId)" :value="details.curatorId">Сотрудник #{{ details.curatorId }} (сохранён ранее)</option><option v-for="u in staff" :key="u.id" :value="u.id">{{ workUserName(u) }}</option></select></label>
      <label>Кадастровый инженер<select v-model="details.engineerId"><option :value="null">Не назначен</option><option v-if="details.engineerId && !staff.some(u=>u.id===details.engineerId)" :value="details.engineerId">Сотрудник #{{ details.engineerId }} (сохранён ранее)</option><option v-for="u in staff" :key="u.id" :value="u.id">{{ workUserName(u) }}</option></select></label>
    </div>
    <small class="work-muted">Куратор назначает работы и следит за их выполнением. Кадастровый инженер выполняет профильные работы. Укажите их также в команде объекта с нужными правами: выбор роли в карточке не меняет доступ и не назначает задачи автоматически.</small>
  </section>
</template>
<style scoped>
.upts-object-fields{display:grid;gap:12px;min-width:0}.upts-object-fields h3{font-size:16px;margin:10px 0 0}.upts-kuvd-row{display:grid;grid-template-columns:1fr 1fr auto;gap:8px;align-items:end;min-width:0}.upts-kuvd-row label{min-width:0}@media(max-width:600px){.upts-kuvd-row{grid-template-columns:1fr}.work-two{grid-template-columns:1fr}}
</style>
