<script setup lang="ts">
defineProps<{count:number;value:number;label:string;disabled?:boolean}>();
const emit=defineEmits<{change:[value:number]}>();
function choose(event:Event){
 const input=event.target as HTMLInputElement;
 if(!input.reportValidity())return;
 emit('change',Number(input.value));
}
</script>
<template>
 <select v-if="count<=100" class="cs-stage-control" :value="value" :aria-label="label" :disabled="disabled||count<1" @change="choose">
  <option v-if="value>count" :value="value" disabled>{{value}} — вне диапазона</option>
  <option v-for="n in Math.max(0,Math.floor(count||0))" :key="n" :value="n">{{n}}</option>
 </select>
 <input v-else class="cs-stage-control" type="number" required min="1" step="1" :max="count" :value="value"
   :aria-label="label" :disabled="disabled" @change="choose" @blur="e=>{const el=e.target as HTMLInputElement;if(!el.validity.valid)el.value=String(value)}"/>
</template>
