<!-- pages/ad/browser.vue -->
<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold mb-1">Сотрудники</h1>
    
    <div class="flex gap-2 p-4 bg-gray-100 rounded-lg mb-1">
      <button 
        class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition"
        @click="loadUsers"
        :disabled="loading"
      >
        Загрузить пользователей
      </button>
      <button 
        class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition"
        @click="loadGroups"
        :disabled="loading"
      >
        Загрузить группы
      </button>
      <button 
        class="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded transition"
        @click="loadAll"
        :disabled="loading"
      >
        Загрузить всё
      </button>
    </div>
    
    <div v-if="loading" class="text-center py-8">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      <p class="mt-2 text-gray-600">Загрузка данных...</p>
    </div>
    
    <!-- Таблица пользователей -->
    <div v-if="users && users.length > 0" class="mb-8">
      <h2 class="text-xl font-semibold mb-4">
        Пользователи ({{ filteredUsers.length }} из {{ users.length }})
      </h2>
      
      <!-- Поиск -->
      <div class="mb-4 relative w-fit">
        <div v-if="searchQuery" @click="fieldClear" class="absolute -right-4 -top-2">
          <Icon name="material-symbols-light:close-rounded" class="hover:text-red-500" mode="svg"  />
        </div>
        <input 
          v-model="searchQuery"
          type="text"
          placeholder="Поиск по имени, фамилии, email, телефону или отделу..."
          class="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        
      </div>
      
      <div class="overflow-x-auto shadow-md rounded-lg">
        <table class="min-w-full bg-white border border-gray-200">
          <thead class="bg-gray-100">
            <tr>
              <th 
                v-for="column in columns" 
                :key="column.key"
                @click="sortBy(column.key)"
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition"
              >
                <div class="flex items-center gap-1">
                  {{ column.label }}
                  <span v-if="sortKey === column.key" class="text-blue-500">
                    {{ sortDirection === 'asc' ? '↑' : '↓' }}
                  </span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr 
              v-for="user in paginatedUsers" 
              :key="user.sAMAccountName || user.cn"
              class="hover:bg-gray-50 transition"
            >
              <td class="px-4 py-2 font-medium text-sm text-gray-900">
                {{ user.cn || '-' }}
              </td>
              <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                {{ user.telephoneNumber || '-' }}
              </td>
              <td class="px-4 py-2 text-sm text-blue-600 hover:underline hover:underline-offset-4">
                <a :href="`mailto:${user.mail}`" v-if="user.mail">{{ user.mail }}</a>
                <span v-else class="text-gray-400">-</span>
              </td>
              <td class="px-4 py-2 text-sm text-gray-900">
                {{ user.department || '-' }}
              </td>
              <td class="px-4 py-2 text-sm text-gray-900">
                {{ user.title || '-' }}
              </td>
              <td class="px-4 py-2 text-sm text-gray-900">
                {{ user.l || '-' }}
              </td>
            </tr>
            <tr v-if="filteredUsers.length === 0">
              <td :colspan="columns.length" class="px-6 py-8 text-center text-gray-500">
                Пользователи не найдены
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Пагинация -->
      <div class="flex justify-between items-center mt-4">
        <div class="text-sm text-gray-600">
          Показано с {{ startIndex + 1 }} по {{ endIndex }} из {{ filteredUsers.length }}
        </div>
        <div class="flex gap-2">
          <button
            @click="prevPage"
            :disabled="currentPage === 1"
            class="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Назад
          </button>
          <span class="px-3 py-1">
            Страница {{ currentPage }} из {{ totalPages }}
          </span>
          <button
            @click="nextPage"
            :disabled="currentPage === totalPages"
            class="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Вперед →
          </button>
        </div>
      </div>
    </div>
    
    <!-- Таблица групп -->
    <div v-if="groups && groups.length > 0" class="mb-8">
      <h2 class="text-xl font-semibold mb-4">Группы ({{ groups.length }})</h2>
      
      <div class="overflow-x-auto shadow-md rounded-lg">
        <table class="min-w-full bg-white border border-gray-200">
          <thead class="bg-gray-100">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Название группы
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Описание
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Количество участников
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Distinguished Name
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr 
              v-for="group in groups.slice(0, 50)" 
              :key="group.cn || group.name"
              class="hover:bg-gray-50 transition"
            >
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {{ group.cn || group.name || '-' }}
              </td>
              <td class="px-6 py-4 text-sm text-gray-900">
                {{ group.description || '-' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ group.member?.length || 0 }}
              </td>
              <td class="px-6 py-4 text-sm text-gray-500 font-mono truncate max-w-md">
                {{ group.dn || '-' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="groups.length > 50" class="text-sm text-gray-500 mt-2">
        * Показаны первые 50 групп из {{ groups.length }}
      </p>
    </div>
    
    <!-- Состояние когда нет данных -->
    <div v-if="!loading && !users && !groups" class="text-center py-12 text-gray-500">
      <p>Нажмите на кнопку выше, чтобы загрузить данные из Active Directory</p>
    </div>
  </div>
</template>

<script setup>
const users = ref(null);
const groups = ref(null);
const loading = ref(false);

// Сортировка
const sortKey = ref('cn'); // сортировка по фамилии по умолчанию
const sortDirection = ref('asc');

// Поиск
const searchQuery = ref('');
const fieldClear = () => {
  searchQuery.value = '';
}

// Пагинация
const currentPage = ref(1);
const itemsPerPage = ref(20);

// Колонки таблицы
const columns = [
  { key: 'cn', label: 'ФИО' },
  { key: 'telephoneNumber', label: 'Телефон' },
  // telephoneNumber
  { key: 'mail', label: 'Email' },
  { key: 'department', label: 'Отдел' },
  { key: 'title', label: 'Должность' },
  { key: 'l', label: 'Город' },
];

// Сортировка пользователей
const sortBy = (key) => {
  if (sortKey.value === key) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortDirection.value = 'asc';
  }
};

// Фильтрация пользователей
const filteredUsers = computed(() => {
  if (!users.value) return [];
  
  let filtered = [...users.value];
  
  // Поиск по всем текстовым полям
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(user => {
      return (
        (user.cn?.toLowerCase() || '').includes(query) ||
        (user.telephoneNumber?.toLowerCase() || '').includes(query) ||
        (user.mail?.toLowerCase() || '').includes(query) ||
        (user.department?.toLowerCase() || '').includes(query) ||
        (user.title?.toLowerCase() || '').includes(query) ||
        (user.l?.toLowerCase() || '').includes(query)
      );
    });
  }
  
  // Сортировка
  filtered.sort((a, b) => {
    let aVal = a[sortKey.value] || '';
    let bVal = b[sortKey.value] || '';
    
    // Для строк - сортировка без учета регистра
    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    
    if (aVal < bVal) return sortDirection.value === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection.value === 'asc' ? 1 : -1;
    return 0;
  });
  
  return filtered;
});

// Пагинация
const totalPages = computed(() => Math.ceil(filteredUsers.value.length / itemsPerPage.value));
const startIndex = computed(() => (currentPage.value - 1) * itemsPerPage.value);
const endIndex = computed(() => Math.min(startIndex.value + itemsPerPage.value, filteredUsers.value.length));
const paginatedUsers = computed(() => filteredUsers.value.slice(startIndex.value, endIndex.value));

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
};

// Сброс пагинации при изменении фильтров
watch([filteredUsers, searchQuery], () => {
  currentPage.value = 1;
});

async function loadUsers() {
  loading.value = true;
  try {
    const response = await fetch('/api/ad/get-users');
    const data = await response.json();
    users.value = data.users;
    groups.value = null; // очищаем группы при загрузке пользователей
    currentPage.value = 1;
    searchQuery.value = '';
    console.log('Загружено пользователей:', data.count);
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
    users.value = null; // очищаем пользователей при загрузке групп
    console.log('Загружено групп:', data.count);
  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    loading.value = false;
  }
}

async function loadAll() {
  loading.value = true;
  try {
    // Загружаем пользователей и групп параллельно
    const [usersRes, groupsRes] = await Promise.all([
      fetch('/api/ad/get-users'),
      fetch('/api/ad/get-groups')
    ]);
    
    const usersData = await usersRes.json();
    const groupsData = await groupsRes.json();
    
    users.value = usersData.users;
    groups.value = groupsData.groups;
    currentPage.value = 1;
    searchQuery.value = '';
    
    console.log('Загружено пользователей:', usersData.count);
    console.log('Загружено групп:', groupsData.count);
  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
/* Дополнительные стили для улучшения внешнего вида */
table {
  font-size: 14px;
}

th {
  user-select: none;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* Анимация загрузки */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>