<script setup lang="ts">
defineProps<{modelValue:string;disabled?:boolean;required?:boolean}>();
const emit=defineEmits<{'update:modelValue':[string]}>();
const display=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)?s.split('-').reverse().join('.'):s;
function change(e:Event){const s=(e.target as HTMLInputElement).value;emit('update:modelValue',/^\d{2}\.\d{2}\.\d{4}$/.test(s)?s.split('.').reverse().join('-'):s);}
</script>
<template><input :value="display(modelValue)" :disabled="disabled" :required="required" placeholder="дд.мм.гггг" inputmode="numeric" maxlength="10" @input="change"/></template>
