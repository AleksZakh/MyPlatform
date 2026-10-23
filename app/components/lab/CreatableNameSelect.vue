<script setup lang="ts">
import CreatableNameSelect from '../common/CreatableNameSelect.vue';
defineProps<{modelValue:string;items:string[];placeholder?:string;loading?:boolean}>();
const emit=defineEmits<{'update:modelValue':[string]}>();
</script>
<template><CreatableNameSelect :model-value="modelValue" :items="items" :placeholder="placeholder" :loading="loading" @update:model-value="emit('update:modelValue',$event)" /></template>
