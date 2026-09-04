<template>
  <div class=" h-full absolute left-0 right-0 lab-area">
    <UCard class="h-full tabs-wrapper absolute  left-0 right-0 bottom-0 top-0" :ui="{ root: 'rounded-none' }">
      <UTabs
        v-model="activeTab"
        :items="tabs"
        size="lg"
        color="custom"
        class=" tabs-area  absolute bottom-2 top-1 left-1 right-1"
        :ui="{
          trigger: 'border border-gray-200 rounded-md',
          list: 'p-1 gap-4 ',
          content: ' relative h-full'
        }"
      >
        <template #incomingInspection>
          <LabIncominginspection />
        </template>
        <template #research>
          <LabResearch />
        </template>
        <template #handbook>
          <LabHandbook />
        </template>
      </UTabs>
    </UCard>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Лабораторный контроль',
});

// Определение структуры вкладок
const tabs = [
  {
    label: 'Реестр входного контроля',
    icon: 'streamline-freehand-color:disability-blind-read',
    slot: 'incomingInspection', // этот слот будет отображаться для вкладки
    value: 'incomingInspection', // значение для v-model
  },
  {
    label: 'Исследования',
    icon: 'marketeq:research',
    slot: 'research',
    value: 'research',
  },
  {
    label: 'Справочник лаборатории',
    icon: 'streamline-freehand-color:book-bookmark',
    slot: 'handbook', // этот слот будет отображаться для вкладки
    value: 'handbook', // значение для v-model
  },
];

// Активная вкладка (по умолчанию первая)
const activeTab = ref('incomingInspection');
</script>

<style scoped>
/* Перебиваем внутренний слот body конкретной карточки */
:deep(.p-4.sm\:p-6) {
  padding: 5px 10px !important;
}
</style>
