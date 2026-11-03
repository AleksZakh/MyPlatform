<script setup lang="ts">
import AccessNotice from '~/components/access/AccessNotice.vue';
definePageMeta({ public: true });
useHead({ title: 'Доступ к ресурсу — Space' });
const route = useRoute();
const unavailable = computed(() => route.query.reason === 'unavailable');
function retry() {
  const from = route.query.from;
  // Only local paths; never accept external redirect targets.
  return navigateTo(typeof from === 'string' && /^\/(?![\/\\])/.test(from) && !from.startsWith('/access-denied') ? from : '/');
}
</script>
<template><AccessNotice :unavailable="unavailable" @retry="retry" /></template>
