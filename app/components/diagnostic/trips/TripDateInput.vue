<script setup lang="ts">
import {computed} from 'vue';
import {tripDay} from '~~/shared/utils/diagnostic-trips';
const props=defineProps<{modelValue:string;disabled?:boolean;required?:boolean;label?:string}>();
const emit=defineEmits<{'update:modelValue':[string]}>();
const display=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)?s.split('-').reverse().join('.'):s;
const calendarValue=computed(()=>tripDay(props.modelValue)?props.modelValue:'');
function change(e:Event){const s=(e.target as HTMLInputElement).value;emit('update:modelValue',/^\d{2}\.\d{2}\.\d{4}$/.test(s)?s.split('.').reverse().join('-'):s);}
function pick(e:Event){emit('update:modelValue',(e.target as HTMLInputElement).value);}
function open(e:Event){const input=e.target as HTMLInputElement;try{input.showPicker?.();}catch{/* Native date control remains available with keyboard and browser indicator. */}}
</script>
<template><span class="trip-date-control"><input class="trip-date-text" :value="display(modelValue)" :disabled="disabled" :required="required" :aria-label="label" placeholder="дд.мм.гггг" inputmode="numeric" maxlength="10" @input="change"/><span class="trip-date-calendar" :class="{'is-disabled':disabled}" title="Выбрать дату из календаря"><Icon name="streamline-freehand-color:calendar-grid" aria-hidden="true"/><input type="date" :value="calendarValue" :disabled="disabled" min="1900-01-01" max="2200-12-31" :aria-label="`Календарь: ${label||'выбор даты'}`" @click="open" @input="pick"/></span></span></template>
