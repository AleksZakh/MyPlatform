<template>
  <div
    class="table-settings-area w-full flex justify-between items-center py-4"
  >
    <div>
      <span class="text-md font-medium">Показать</span>
      <USelect v-model="value" :items="rowCounts" class="w-24 ml-2" />
      <span class="text-md font-medium ml-2">записей</span>
    </div>
    <div class="flex items-center gap-2">
      <Icon name="streamline-freehand-color:memory-sd-card-search" width="20" />
      <span>Найти</span>
      <UInput placeholder="Поиск..." class="w-48 ml-2" />
    </div>
  </div>
</template>

<script setup lang="ts">
const value = ref('10');
const rowCounts = ref(['10', '25', '50', '100']);
</script>

<style lang="css" scoped></style>
