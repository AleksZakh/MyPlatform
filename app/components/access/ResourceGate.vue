<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import AccessNotice from './AccessNotice.vue';
const props = defineProps<{ resource: string }>();
const request = useRequestFetch();
const state = ref<'loading' | 'allowed' | 'denied' | 'unavailable'>('loading');
let generation = 0;
async function check() {
  const current = ++generation;
  state.value = 'loading';
  try {
    const result = await request<{ allowed: boolean }>('/api/access/check', { query: { resource: props.resource, action: 'VIEW' } });
    if (current === generation) state.value = result.allowed ? 'allowed' : 'denied';
  } catch (error: any) {
    if (current === generation) state.value = [401, 403].includes(Number(error?.statusCode || error?.response?.status)) ? 'denied' : 'unavailable';
  }
}
// Keep SSR and the first client render identical. Protected child setup only
// runs after the current browser session has passed the server-side check.
let mounted = false;
watch(() => props.resource, () => { if (mounted) void check(); }, { flush: 'sync' });
onMounted(() => { mounted = true; void check(); });
onBeforeUnmount(() => { mounted = false; generation++; });
</script>
<template>
  <slot v-if="state === 'allowed'" />
  <p v-else-if="state === 'loading'" role="status">Проверка прав доступа…</p>
  <AccessNotice v-else :unavailable="state === 'unavailable'" @retry="check" />
</template>
