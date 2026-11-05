<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import type { UptsContractDTO } from '~~/shared/types/upts';
import { UPTS_CONTRACT_TYPES } from '~~/shared/types/upts-library';
import { workKindName } from '~~/shared/utils/upts-work-kinds';
import { workUserName, type WorkUser } from '~~/shared/types/work';
import { formatWorkDate } from '~~/shared/utils/work-board';
const props=defineProps<{object:UptsContractDTO}>();
const staff=ref<WorkUser[]>([]);
onMounted(async()=>{try{staff.value=await $fetch<WorkUser[]>('/api/upts/people');}catch{/* Card remains readable if the directory is temporarily unavailable. */}});
const person=(id?:number|null)=>{const u=staff.value.find(u=>u.id===id);return u?workUserName(u):id?'Сотрудник #'+id:'Не назначен';};
const fields=computed(()=>{const c=props.object,d=c.objectDetails||{};return [
 ['Тип объекта',c.contractType?UPTS_CONTRACT_TYPES[c.contractType]:'Не указан'],['Вид работ',workKindName(d.workKindKey)||'Не выбран'],
 ['Автомобильная дорога',d.road],['Этап',d.stage],['Правообладатели',d.rightHolders?.join('; ')],['Область',d.region],['Тип сделки',d.dealType],
 ['Кадастровый номер исходного ЗУ',d.sourceCadastralNumber],['Площадь исходного ЗУ, кв. м',d.sourceArea],['Вид права',d.rightKind],['ВРИ исходного ЗУ',d.permittedUses?.join('; ')],['Тип учёта',d.accountingType],['Условный номер',c.number],
 ['Куратор',person(d.curatorId)],['Кадастровый инженер',person(d.engineerId)],['Срок',formatWorkDate(c.dueDate)],
 ...(c.contractType==='OTHER'?[['Описание деятельности',d.otherDescription]]:[]),
 ];});
</script>
<template><dl class="upts-facts upts-object-facts"><div v-for="[label,value] in fields" :key="label"><dt>{{ label }}</dt><dd>{{ value || 'Не указано' }}</dd></div><div v-for="(entry,i) in object.objectDetails?.kuvdEntries" :key="'kuvd-'+i"><dt>КУВД {{ i+1 }}</dt><dd>{{ entry.number || 'Без номера' }} · {{ formatWorkDate(entry.date) || 'Без даты' }}</dd></div></dl></template>
<style scoped>.upts-object-facts dd{overflow-wrap:anywhere;white-space:pre-line}.upts-object-facts>div{min-width:0}</style>
