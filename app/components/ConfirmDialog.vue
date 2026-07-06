<!-- components/ConfirmDialog.vue -->
<template>
  <!-- <UModal v-model="isOpen"> -->
    <!-- <div class="fixed inset-0 bg-gray-500 bg-opacity-10 z-40"> -->
      <div v-if="isOpen" class="p-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg w-full max-w-md">
        <div class="flex items-center gap-3 mb-4">
          <div class="text-red-500 text-2xl">🗑️</div>
          <h3 class="text-lg font-semibold">{{ title }}</h3>
        </div>
        
        <p class="text-gray-600 mb-2">{{ description }}</p>
        <p v-if="content" class="text-sm text-gray-500">{{ content }}</p>
        
        <div class="flex justify-end gap-3 mt-6 pt-4 border-t">
          <UButton 
            @click="close"
            variant="outline"
          >
            {{ cancelText || 'Отмена' }}
          </UButton>
          <UButton 
            @click="confirm"
            color="error"
          >
            {{ confirmText || 'Удалить' }}
          </UButton>
        </div>
      </div>
    <!-- </div> -->
  <!-- </UModal> -->
</template>

<script setup lang="ts">
const props = defineProps<{
  title?: string
  description?: string
  content?: string
  confirmText?: string
  cancelText?: string
}>()

const isOpen = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
  (e: 'close'): void
}>()

function confirm() {
  emit('confirm')
  isOpen.value = false
}

function close() {
  emit('cancel')
  emit('close')
  isOpen.value = false
}
</script>