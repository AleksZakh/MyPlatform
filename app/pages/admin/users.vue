<template>
  <div class="admin-page">
    <AdminUserDirectory />
  </div>
</template>


<script setup lang="ts">
useSeoMeta({
  title:
    'AdminCenter — пользователи',
})
</script>


<style scoped>
.admin-page {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;

  box-sizing: border-box;
  overflow: hidden;
}
</style>
