<!-- Контент для третьей вкладки -->
<template>
  <UTabs
    :items="items"
    orientation="vertical"
    class="vertical-tabs absolute left-0 right-0 bottom-0 top-0"
    color="info"
    variant="link"
    :ui="{
      list: 'flex items-center justify-center ',
      trigger: 'flex items-center px-4 py-8 max-w-27 flex-col',
      label: 'text-balance font-normal text-base',
      content: 'relative p-2 bg-white rounded-xl border border-gray-200 shadow-sm h-full',
      indicator: 'absolute transition-all duration-300 ',
      leadingIcon: 'w-5 h-5 size-10 ',                  // иконка внутри триггера
    }"
  >
    <!-- Слот для вкладки "ПЛП" -->
    <template #sampling>
      <LabSamplingForm />
    </template>

    <!-- Слот для вкладки "Поступление материала" -->
    <template #receipt_material>
      <LabReceiptMaterialForm />
    </template>

    <!-- Слот для вкладки "Протоколиспытаний" -->
    <template #test_report>
      <LabTestReportForm />
    </template>

  </UTabs>
</template>

<script setup lang="ts">
const items = [
  {
    label: 'Отбор проб',
    icon: 'uil:jackhammer',
    slot: 'sampling'  // ← имя слота
  },
  {
    label: 'Поступление материала',
    icon: 'solar:delivery-line-duotone',
    slot: 'receipt_material'  // ← имя слота
  },
  {
    label: 'Протокол испытаний',
    icon: 'streamline-ultimate:laboratory-drug-file',
    slot: 'test_report'
  }
];
</script>

<style scoped>
/* Для табов только в этом компоненте */
.vertical-tabs .tab-trigger {
    writing-mode: vertical-rl;
    transform: rotate(180deg);
}
</style>

