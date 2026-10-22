<script setup lang="ts">
import { computed, ref } from 'vue';
const props = defineProps<{ modelValue: string; items: string[]; placeholder?: string; loading?: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [string] }>();
const open = ref(false);
const items = computed(() => [...new Set([...(props.modelValue ? [props.modelValue] : []), ...props.items])]);
function create(value: string) {
 const name = value.trim();
 if (!name) return;
 const existing = items.value.find(item => item.toLocaleLowerCase('ru-RU') === name.toLocaleLowerCase('ru-RU'));
 emit('update:modelValue', existing || name);
 open.value = false;
}
</script>
<template>
 <USelectMenu v-model:open="open" :model-value="modelValue || undefined" :items="items" :loading="loading" :placeholder="placeholder || 'Выберите или создайте новый вариант'" :search-input="{ placeholder: 'Поиск или новый вариант…' }" create-item class="w-full min-w-0 shadow-sm" @update:model-value="value => emit('update:modelValue', String(value || ''))" @create="create">
  <template #create-item-label="{ item }">Создать: «{{ item }}»</template>
 </USelectMenu>
</template>
