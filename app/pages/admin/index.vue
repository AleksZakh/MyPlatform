<script setup lang="ts">
import type { NavigationData } from '~~/shared/navigation/catalog';
import AdminDashboard from '~/components/admin/AdminDashboard.vue';
import { useAdminDashboard } from '~/composables/useAdminDashboard';
useSeoMeta({ title: 'Space — центр администрирования' });
const { data, error, status, refresh } = await useFetch<NavigationData>('/api/navigation', { key: 'space-navigation' });
const { summary, activity, summaryError, activityError, loading, load } = useAdminDashboard(data);
async function reload() { await refresh(); if (!error.value) await load(); }
</script>
<template>
  <AdminDashboard :navigation="data || null" :summary="summary" :activity="activity"
    :loading="loading || status === 'pending'" :navigation-error="!!error"
    :summary-error="summaryError" :activity-error="activityError" @refresh="reload"/>
</template>
