<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <!-- Основная карточка -->
    <div class="max-w-7xl mx-auto bg-white rounded-xl shadow-lg p-6">
      <h1 class="text-3xl font-bold text-gray-800 mb-6">Управление сотрудниками</h1>

      <!-- Форма добавления/редактирования -->
      <form @submit.prevent="saveEmployee" class="bg-gray-50 rounded-lg p-6 mb-8">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Имя сотрудника</label>
            <input
              v-model="currentEmployee.name"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Должность</label>
            <input
              v-model="currentEmployee.position"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              v-model="currentEmployee.email"
              type="email"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Отдел</label>
            <select
              v-model="currentEmployee.department"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="" disabled>Выберите отдел</option>
              <option v-for="dept in departments" :key="dept" :value="dept">
                {{ dept }}
              </option>
            </select>
          </div>
        </div>

        <div class="mt-4 flex gap-3">
          <button
            type="submit"
            :class="[
              'px-6 py-2 rounded-md text-white font-medium transition-colors',
              isEditing
                ? 'bg-yellow-500 hover:bg-yellow-600'
                : 'bg-green-500 hover:bg-green-600'
            ]"
          >
            {{ isEditing ? 'Обновить' : 'Добавить' }}
          </button>
          <button
            v-if="isEditing"
            @click="cancelEdit"
            type="button"
            class="px-6 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-md font-medium transition-colors"
          >
            Отмена
          </button>
        </div>
      </form>

      <!-- Поиск и таблица -->
      <div>
        <div class="mb-4">
          <div class="relative">
            <input
              v-model="search"
              type="text"
              placeholder="Поиск сотрудников"
              class="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <svg
              class="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <!-- Таблица -->
        <div class="overflow-x-auto shadow-md rounded-lg border border-gray-200">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th
                  v-for="header in headers"
                  :key="header.key"
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  @click="sortBy(header.key)"
                >
                  <span class="flex items-center gap-1">
                    {{ header.title }}
                    <span v-if="sortKey === header.key" class="text-xs">
                      {{ sortOrder === 'asc' ? '↑' : '↓' }}
                    </span>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-if="filteredEmployees.length === 0">
                <td colspan="5" class="px-6 py-4 text-center text-gray-500">
                  Сотрудники не найдены
                </td>
              </tr>
              <tr v-for="employee in paginatedEmployees" :key="employee.id">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ employee.name }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ employee.position }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ employee.email }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                    {{ employee.department }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    @click="editEmployee(employee)"
                    class="text-blue-600 hover:text-blue-900 mr-3 transition-colors"
                  >
                    <svg class="w-5 h-5 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    @click="deleteEmployee(employee.id)"
                    class="text-red-600 hover:text-red-900 transition-colors"
                  >
                    <svg class="w-5 h-5 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Пагинация -->
        <div class="mt-4 flex items-center justify-between">
          <div class="text-sm text-gray-700">
            Показано с {{ (currentPage - 1) * pageSize + 1 }} по
            {{ Math.min(currentPage * pageSize, filteredEmployees.length) }}
            из {{ filteredEmployees.length }} записей
          </div>
          <div class="flex gap-2">
            <button
              @click="previousPage"
              :disabled="currentPage === 1"
              :class="[
                'px-4 py-2 rounded-md transition-colors',
                currentPage === 1
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              ]"
            >
              Назад
            </button>
            <button
              @click="nextPage"
              :disabled="currentPage >= totalPages"
              :class="[
                'px-4 py-2 rounded-md transition-colors',
                currentPage >= totalPages
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              ]"
            >
              Вперед
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'

// Состояние
const search = ref('')
const isEditing = ref(false)
const nextId = ref(5)

const departments = ['IT', 'HR', 'Финансы', 'Маркетинг', 'Продажи']

const headers = [
  { key: 'name', title: 'Имя' },
  { key: 'position', title: 'Должность' },
  { key: 'email', title: 'Email' },
  { key: 'department', title: 'Отдел' },
  { key: 'actions', title: 'Действия' }
]

// Сортировка
const sortKey = ref('name')
const sortOrder = ref('asc')

// Пагинация
const currentPage = ref(1)
const pageSize = ref(5)

// Данные
const employees = ref([
  { id: 1, name: 'Иван Петров', position: 'Разработчик', email: 'ivan@company.com', department: 'IT' },
  { id: 2, name: 'Мария Иванова', position: 'Менеджер по персоналу', email: 'maria@company.com', department: 'HR' },
  { id: 3, name: 'Алексей Смирнов', position: 'Финансовый аналитик', email: 'alexey@company.com', department: 'Финансы' },
  { id: 4, name: 'Елена Козлова', position: 'Маркетолог', email: 'elena@company.com', department: 'Маркетинг' }
])

const currentEmployee = reactive({
  id: null,
  name: '',
  position: '',
  email: '',
  department: null
})

// Вычисляемые свойства
const filteredEmployees = computed(() => {
  let items = employees.value.filter(emp =>
    Object.values(emp).some(val =>
      String(val).toLowerCase().includes(search.value.toLowerCase())
    )
  )

  // Сортировка
  const key = sortKey.value
  const order = sortOrder.value
  items.sort((a, b) => {
    const aVal = a[key] || ''
    const bVal = b[key] || ''
    if (aVal < bVal) return order === 'asc' ? -1 : 1
    if (aVal > bVal) return order === 'asc' ? 1 : -1
    return 0
  })

  return items
})

const totalPages = computed(() => {
  return Math.ceil(filteredEmployees.value.length / pageSize.value)
})

const paginatedEmployees = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredEmployees.value.slice(start, end)
})

// Методы
const sortBy = (key) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortOrder.value = 'asc'
  }
}

const previousPage = () => {
  if (currentPage.value > 1) currentPage.value--
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++
}

const saveEmployee = () => {
  if (isEditing.value) {
    const index = employees.value.findIndex(e => e.id === currentEmployee.id)
    employees.value[index] = { ...currentEmployee }
  } else {
    employees.value.push({
      ...currentEmployee,
      id: nextId.value++
    })
  }
  resetForm()
}

const editEmployee = (employee) => {
  Object.assign(currentEmployee, employee)
  isEditing.value = true
}

const deleteEmployee = (id) => {
  if (confirm('Вы уверены, что хотите удалить этого сотрудника?')) {
    employees.value = employees.value.filter(e => e.id !== id)
  }
}

const resetForm = () => {
  Object.assign(currentEmployee, {
    id: null,
    name: '',
    position: '',
    email: '',
    department: null
  })
  isEditing.value = false
}

const cancelEdit = resetForm
</script>