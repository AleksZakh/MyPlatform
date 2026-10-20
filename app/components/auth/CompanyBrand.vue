<template>
  <div class="flex items-center gap-3 min-w-0">
    <span class="flex h-16 w-20 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
      <img src="/images/avtodor-engineering-logo.svg" width="80" height="60" alt="Логотип Автодор Инжиниринг" class="h-14 w-[72px] object-contain" />
    </span>
    <div class="min-w-0" :class="inverse ? 'text-white' : 'text-gray-900'">
      <p class="text-lg font-semibold leading-snug">Автодор Инжиниринг</p>
      <!-- <p class="mt-1 text-sm leading-snug" :class="inverse ? 'text-gray-300' : 'text-gray-600'">Единое рабочее пространство</p> -->
    </div>
  </div>
</template>
<script setup lang="ts">
defineProps<{ inverse?: boolean }>();
</script>
