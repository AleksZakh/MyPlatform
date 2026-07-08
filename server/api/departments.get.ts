// server/api/departments.get.ts
export default defineEventHandler(() => {
  return [
    {
      id: 'hr',
      name: 'Отдел кадров (HR)',
      slug: '/departments/hr',
      icon: 'streamline-freehand-color:job-choose-candidate', // Иконка из коллекции Heroicons (встроена в Nuxt UI)
      manager: { name: 'Татьяна Колозина', avatar: '' },
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
      icon: 'streamline-freehand-color:desktop-computer-pc',
      manager: { name: 'Михаил Руденко', avatar: '' },
      employeeCount: 45,
      quickLinks: [
        { label: 'Техподдержка', url: '/departments/it/ticket' },
        { label: 'База знаний', url: '/departments/it/wiki' }
      ]
    },
    {
      id: 'diagnostic',
      name: 'Диагностика',
      slug: '/departments/diagnostic',
      icon: 'streamline-freehand-color:analytics-graph-bar-horizontal',
      manager: { name: 'Леонид Шамраев', avatar: '' },
      employeeCount: 50,
      quickLinks: [
        { label: 'ГИС', url: '/departments/diagnostic/gis' },
        { label: 'АИС ИССО', url: '/departments/diagnostic/aisisso' }
      ]
    },
    {
      id: 'labcontrol',
      name: 'Лабораторный контроль',
      slug: '/departments/lab',
      icon: 'streamline-freehand-color:amusement-park-strength-meter',
      manager: { name: 'Кирилл Голюбин', avatar: '' },
      employeeCount: 20,
      quickLinks: [
        { label: 'Реестр вх.контроля', url: '/departments/lab/' },
        { label: 'Протокол испытаний', url: '/departments/lab/testprotocol' },
        { label: 'Отбор проб', url: '/departments/lab/sampling' }
      ]
    },
    //streamline-freehand-color:amusement-park-strength-meter
  ]
})
