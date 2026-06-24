// server/api/departments.get.ts
export default defineEventHandler(() => {
  return [
    {
      id: 'hr',
      name: 'Отдел кадров (HR)',
      slug: '/departments/hr',
      icon: 'i-heroicons-user-group', // Иконка из коллекции Heroicons (встроена в Nuxt UI)
      manager: { name: 'Анна Иванова', avatar: 'https://unsplash.com' },
      employeeCount: 12,
      quickLinks: [
        { label: 'Заказать справку', url: '/departments/hr/documents' },
        { label: 'Вакансии', url: '/departments/hr/vacancies' }
      ]
    },
    {
      id: 'it',
      name: 'IT и Разработка',
      slug: '/departments/it',
      icon: 'i-heroicons-cpu-chip',
      manager: { name: 'Сергей Петров', avatar: 'https://unsplash.com' },
      employeeCount: 45,
      quickLinks: [
        { label: 'Техподдержка', url: '/departments/it/ticket' },
        { label: 'База знаний', url: '/departments/it/wiki' }
      ]
    }
  ]
})
