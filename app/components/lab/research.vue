<template>
  <UTabs
    :items="items"
    orientation="vertical"
    class="vertical-tabs absolute inset-0"
    color="info"
    variant="link"
    :ui="{
      list:
        'flex items-center justify-center',
      trigger:
        'flex items-center px-4 py-8 max-w-27 flex-col',
      label:
        'text-balance font-normal text-base',
      content:
        'relative p-2 bg-white rounded-xl border border-gray-200 shadow-sm h-full min-w-0 overflow-hidden',
      indicator:
        'absolute transition-all duration-300',
      leadingIcon:
        'w-5 h-5 size-10',
    }"
  >
    <template #event_journal>
      <LabEventJournal />
    </template>

    <template #file_system>
      <LabFileSystem />
    </template>
  </UTabs>
</template>


<script setup lang="ts">
const items = [
  {
    label:
      'Журнал событий',

    icon:
      'streamline-freehand-color:form-edition-clipboard-write',

    slot:
      'event_journal',
  },

  {
    label:
      'Файловая система',

    icon:
      'streamline-freehand-color:organization-files',

    slot:
      'file_system',
  },
]
</script>


<style scoped>
.vertical-tabs {
  min-width: 0;
}
</style>
