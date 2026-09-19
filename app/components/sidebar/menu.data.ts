export interface MenuPermission {
  resource:
    string;

  action:
    'VIEW'
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE';
}


export interface MenuItem {
  title:
    string;

  url:
    string;

  icon:
    string;

  tooltip:
    string;

  permission?:
    MenuPermission;
}


export const menuItems: MenuItem[] = [
  {
    title:
      'Главная',

    url:
      '/',

    icon:
      'streamline-freehand-color:home-chimney-2',

    tooltip:
      'Переход на главную страницу',
  },

  {
    title:
      'Профиль',

    url:
      '/profile',

    icon:
      'streamline-freehand-color:face-id-male-1',

    tooltip:
      'Профиль пользователя',
  },

  {
    title:
      'Настройки',

    url:
      '/settings',

    icon:
      'streamline-freehand-color:settings-cog',

    tooltip:
      'Настройки приложения',
  },

  {
    title:
      'Инструменты',

    url:
      '/admin',

    icon:
      'streamline-freehand-color:settings-wrench-double',

    tooltip:
      'Инструменты',

    permission: {
      resource:
        'system.admin-center',

      action:
        'VIEW',
    },
  },
];