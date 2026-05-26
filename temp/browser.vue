<!-- pages/ad/browser.vue -->
<template>
  <div>
    <h1>Просмотр Active Directory</h1>
    
    <div class="flex gap-2 p-4">
      <button class="bg-blue-200 text-white px-4 py-2 rounded" @click="loadUsers">Загрузить пользователей</button>
      <button class="bg-blue-200 text-white px-4 py-2 rounded" @click="loadGroups">Загрузить группы</button>
      <button class="bg-blue-200 text-white px-4 py-2 rounded" @click="loadAll">Загрузить всё</button>
    </div>
    
    <div v-if="loading">Загрузка...</div>
    
    <div v-if="users">
      <h2>Пользователи ({{ users.length }})</h2>
      <pre>{{ JSON.stringify(users.slice(0, 10), null, 2) }}</pre>
    </div>
    
    <div v-if="groups">
      <h2>Группы ({{ groups.length }})</h2>
      <pre>{{ JSON.stringify(groups.slice(0, 10), null, 2) }}</pre>
    </div>
  </div>
</template>

<script setup>
const users = ref(null);
const groups = ref(null);
const loading = ref(false);

async function loadUsers() {
  loading.value = true;
  try {
    const response = await fetch('/api/ad/get-users');
    const data = await response.json();
    users.value = data.users;
    console.log('Загружено пользователей:', data.count);
    console.log('Список пользователей:', data.users);
  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    loading.value = false;
  }
}

async function loadGroups() {
  loading.value = true;
  try {
    const response = await fetch('/api/ad/get-groups');
    const data = await response.json();
    groups.value = data.groups;
    console.log('Загружено групп:', data.count);
    console.log('Первая группа:', data.groups?.[0]);
  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    loading.value = false;
  }
}

async function loadAll() {
loading.value = true;
  try {
    const response = await fetch('/api/ad/search');
    const data = await response.json();
    groups.value = data.results.groups || [];
    for (const group of groups.value) {
      console.log(`Группа: ${group.cn}, Описание: ${group.description}, Члены: ${group.member?.length || 0}`);
    }
    console.log('Загружено :', groups.value);
    // console.log('Первая группа:', data.groups?.[0]);
  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    loading.value = false;
  }
//   await Promise.all([loadUsers(), loadGroups()]);
}
</script>