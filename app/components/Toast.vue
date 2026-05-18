<script setup lang="ts">
import { ref, computed } from "vue";
import { useToastStore } from "../stores/toast.store";

const store = useToastStore();

// Автоматическое удаление через 3 секунды
watch(
  () => [...store.toasts],
  (newToasts) => {
    newToasts.forEach((toast) => {
      if (toast.id) {
        setTimeout(() => {
          store.removeToast(toast.id);
        }, 2000); // Через 3 секунды удаляется
      }
    });
  },
  { immediate: true }
);

const activeToasts = computed(() => store.toasts);

const handleRemove = (id: number | string) => {
  store.removeToast(id);
};
</script>

<template>
  <transition-group tag="div" name="fade" appear class="fixed top-16 left-1/2 transform translate-x-[-50%] z-50">
    <div
      v-for="toast in activeToasts"
      :key="toast.id"
      class="flex items-center justify-between bg-blue-500 px-4 py-2 mb-2 rounded-md shadow-lg"
      :class="{
        'bg-info': toast.type === 'inform',
        'bg-success': toast.type === 'success',
        'bg-warning': toast.type === 'warning',
        'bg-error': toast.type === 'error',
      }"
    >
      <span class="font-semibold mr-2 text-black">
        {{ toast.title }}
      </span>
      <span class="text-sm text-white">
        {{ toast.description }}
      </span>
      <button
        type="button"
        @click="handleRemove(toast.id)"
        class="ml-2 focus:outline-none w-5 absolute -top-px -right-px"
      >
        ×
      </button>
    </div>
  </transition-group>
</template>

<style scoped>
.bg-info {
  background-color: #4f94cd !important; /* Голубой */
}
.bg-success {
  background-color: #00fc7e !important; /* Салатовый */
}
.bg-warning {
  background-color: #ffd700 !important; /* Жёлтый */
}
.bg-error {
  background-color: #dc143c !important; /* Красный */
}

.fade-move,
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease-in-out;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>