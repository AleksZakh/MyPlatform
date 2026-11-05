<script setup lang="ts">
import type { UptsObjectDetails } from '~~/shared/types/upts-object';
import { UPTS_CONTRACT_TYPES, type UptsContractType } from '~~/shared/types/upts-library';
const details=defineModel<UptsObjectDetails>({required:true});
const objectType=defineModel<UptsContractType|''>('objectType',{required:true});
const number=defineModel<string>('number',{required:true});
defineProps<{roads:string[];stages:string[]}>();
</script>
<template>
  <section class="upts-object-fields">
    <label>Объект<input v-model="details.road" list="upts-object-roads" maxlength="500" placeholder="Автомобильная дорога" /><datalist id="upts-object-roads"><option v-for="r in roads" :key="r" :value="r" /></datalist></label>
    <label>Этап<input v-model="details.stage" list="upts-object-stages" maxlength="500" /><datalist id="upts-object-stages"><option v-for="s in stages" :key="s" :value="s" /></datalist></label>
    <div class="upts-repeat-fields"><label v-for="(_,i) in details.rightHolders" :key="i">{{ i ? 'Дополнительный правообладатель' : 'Правообладатель' }}<span><input v-model="details.rightHolders![i]" maxlength="500" /><button v-if="i" type="button" :aria-label="'Убрать правообладателя '+(i+1)" @click="details.rightHolders!.splice(i,1)">×</button></span></label><button type="button" class="upts-add-field" :disabled="(details.rightHolders?.length||0)>=30" @click="(details.rightHolders ||= []).push('')">Добавить правообладателя</button></div>
    <label>Область<input v-model="details.region" maxlength="500" /></label>
    <label>Тип сделки<input v-model="details.dealType" maxlength="500" /></label>
    <label>Кадастровый номер исходного ЗУ<input v-model="details.sourceCadastralNumber" maxlength="100" /></label>
    <label>Площадь исходного ЗУ, кв. м<input v-model="details.sourceArea" inputmode="decimal" maxlength="30" pattern="[0-9]+([.,][0-9]+)?" /></label>
    <label>Вид права<input v-model="details.rightKind" maxlength="500" /></label>
    <div class="upts-repeat-fields"><label v-for="(_,i) in details.permittedUses" :key="i">{{ i ? 'Дополнительный ВРИ исходного ЗУ' : 'ВРИ исходного ЗУ' }}<span><input v-model="details.permittedUses![i]" maxlength="500" /><button v-if="i" type="button" :aria-label="'Убрать ВРИ '+(i+1)" @click="details.permittedUses!.splice(i,1)">×</button></span></label><button type="button" class="upts-add-field" :disabled="(details.permittedUses?.length||0)>=30" @click="(details.permittedUses ||= []).push('')">Добавить ВРИ</button></div>
    <label>Тип<select v-model="objectType" required><option value="" disabled>Не выбрано</option><option v-for="(label,key) in UPTS_CONTRACT_TYPES" :key="key" :value="key">{{ label }}</option></select></label>
    <label>Тип учёта<input v-model="details.accountingType" maxlength="500" /></label>
    <label>Условный номер<input v-model="number" required maxlength="100" /></label>
    <div class="upts-kuvd-group">
    <div v-for="(entry,i) in details.kuvdEntries" :key="i" class="upts-kuvd-entry"><label>Номер КУВД<input v-model="entry.number" maxlength="100" /></label><label>Дата КУВД<input v-model="entry.date" type="date" /></label><button v-if="i" class="upts-add-field" type="button" @click="details.kuvdEntries!.splice(i,1)">Убрать запись КУВД</button></div>
    <button type="button" class="upts-add-field" :disabled="(details.kuvdEntries?.length||0)>=30" @click="(details.kuvdEntries ||= []).push({number:'',date:null})">Добавить запись КУВД</button>
    </div>
    <label>Дата договора<input v-model="details.basisContractDate" type="date" /></label>
  </section>
</template>
<style scoped>
.upts-object-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 24px;align-items:start;min-width:0}.upts-object-fields>label{min-width:0}.upts-object-fields label{font-size:12px;color:var(--work-muted)}.upts-object-fields :is(input,select){color:var(--work-text)}.upts-repeat-fields{display:grid;gap:8px;min-width:0}.upts-repeat-fields label>span{display:flex;gap:6px;min-width:0}.upts-repeat-fields input{min-width:0;flex:1}.upts-object-fields .upts-add-field{justify-self:start;border:0;border-radius:0;border-bottom:1px dashed var(--work-muted);padding:0;background:transparent;color:var(--work-muted);font-size:12px}.upts-kuvd-group{grid-column:1/-1;display:grid;gap:8px;min-width:0}.upts-kuvd-entry{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 24px;min-width:0}.upts-kuvd-entry>button{grid-column:1/-1}
@media(max-width:640px){.upts-object-fields,.upts-kuvd-entry{grid-template-columns:1fr}}
</style>
