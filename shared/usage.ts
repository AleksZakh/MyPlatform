export const USAGE_KINDS = { ACCESS_DENIED: 'Отказ в доступе', PAGE: 'Открытие раздела', CLICK: 'Нажатие кнопки', LOGIN: 'Вход', LOGOUT: 'Выход', DOCUMENT: 'Открытие документа', VIDEO: 'Открытие видео', VIDEO_PLAY: 'Запуск видео', MESSAGE: 'Сообщение отправлено', MAIL: 'Письмо принято почтовым сервером' } as const;
export const USAGE_CLICKS = { 'chat.open': 'Открыть сообщения', 'work.task.create': 'Создать задачу', 'work.project.create': 'Создать проект', 'work.project.files': 'Файлы проекта', 'work.project.members': 'Участники проекта', 'work.refresh': 'Обновить задачи' } as const;
export function usagePage(path: string): string | null {
  // Query strings and arbitrary DOM text must never enter the event store.
  const p = path.split(/[?#]/)[0]!.replace(/\/$/, '') || '/';
  if (p.startsWith('/') && Object.hasOwn(USAGE_PAGES,p)) return p;
  if (['/', '/profile', '/settings', '/online', '/projects', '/library', '/library/video-settings'].includes(p)) return p;
  if (/^\/admin(?:\/[a-z-]+)?$/.test(p)) return p;
  if (/^\/admin\/(users|registration-requests)\/\d+$/.test(p)) return p.replace(/\/\d+$/, '/:id');
  if (/^\/library\/videos\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(p)) return '/library/videos/:id';
  if (/^\/departments\/[a-z0-9-]+(?:\/[a-z-]+)?$/.test(p)) return p.replace(/^(\/departments)\/[a-z0-9-]+/, '$1/:department');
  return null;
}

export const USAGE_PAGES:Record<string,string> = {
 'lab-document':'Документ лабораторного контроля','protected-page':'Защищённая страница',
 '/':'Главная','/profile':'Профиль','/settings':'Настройки','/online':'Пользователи онлайн','/projects':'Задачи и проекты',
 '/library':'Библиотека','/library/videos/:id':'Видеоурок','/library/video-settings':'Настройки видео',
 '/admin':'Центр администрирования','/admin/statistics':'Статистика','/admin/audit-log':'Журнал событий','/admin/access':'Права доступа','/admin/users':'Пользователи','/admin/files':'Файлы','/admin/structure':'Структура организации',
 '/departments/lab':'Лабораторный контроль','/departments/lab/sampling':'Акты отбора','/departments/lab/testprotocol':'Протоколы испытаний',
 '/departments/it':'ИТ','/departments/it/wiki':'База знаний ИТ','/departments/it/ticket':'Заявки ИТ','/departments/hr':'Кадры','/departments/hr/documents':'Кадровые документы','/departments/hr/vacancies':'Вакансии',
 '/departments/diagnostic':'Диагностика','/departments/diagnostic/aisisso':'АИС ИССО','/departments/diagnostic/gis':'ГИС','/departments/:department/projects':'Проекты подразделения','/ad/browser':'Справочник AD',
 'domain-password':'Доменная учётная запись · пароль','kerberos':'Доменная учётная запись · Kerberos','external-password':'Внешняя учётная запись','logout':'Выход из Space','chat-invitation':'Приглашение в чат'
};
export function usageTargetLabel(target:string):string {
 if(Object.hasOwn(USAGE_CLICKS,target)) return USAGE_CLICKS[target as keyof typeof USAGE_CLICKS];
 if(Object.hasOwn(USAGE_PAGES,target)) return USAGE_PAGES[target]!;
 if(/^conversation:\d+$/.test(target))return `Диалог №${target.split(':')[1]}`;
 if(/^project:\d+$/.test(target))return `Приглашение в проект №${target.split(':')[1]}`;
 if(/^\/api\/work\/projects\/\d+\/files\//.test(target))return `Файл проекта №${target.split('/')[4]} · ${target.split('/').at(-1)}`;
 return target;
}
