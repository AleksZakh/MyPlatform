<!-- Контент для третьей вкладки -->
<template>
  <UTabs
    :items="items"
    orientation="vertical"
    class="vertical-tabs  absolute left-0 right-0 bottom-0 top-0"
    color="info"
    variant="link"
    :ui="{
      list: 'flex items-center justify-center ',
      label: 'text-balance font-normal text-base',
      trigger: 'flex items-center px-4 py-8 max-w-27 flex-col',
      content: 'relative p-2 bg-white rounded-xl border border-gray-200 shadow-sm h-full',
      indicator: 'absolute transition-all duration-300',
      leadingIcon: 'w-5 h-5 size-10',                  // иконка внутри триггера
    }"
  >
    <!-- Слот для вкладки "ПЛП" -->
    <template #plp>
      <LabPlpForm />
    </template>

    <!-- Слот для вкладки "Материалы" -->
    <template #materials>
      <LabMaterialsForm />
    </template>

    <!-- Слот для вкладки "Производители" -->
    <template #manufacturers>
      <LabManufacturersForm />
    </template>

    <!-- Слот для вкладки "Объекты" -->
    <template #objects>
      <LabObjectsForm />
    </template>
  </UTabs>
</template>

<script setup lang="ts">
const items = [
  {
    label: 'ПЛП',
    icon: 'streamline:shipping-transfer-truck-time-truck-shipping-delivery-time-waiting-delay',
    slot: 'plp'  // ← имя слота
  },
  {
    label: 'Материалы',
    icon: 'game-icons:concrete-bag',
    slot: 'materials'  // ← имя слота
  },
  {
    label: 'Производители',
    icon: 'streamline-ultimate:factory-building-1',
    slot: 'manufacturers'
  },
  {
    label: 'Объекты',
    icon: 'streamline-freehand-color:worldwide-web-location-pin',
    slot: 'objects'  // ← имя слота
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

