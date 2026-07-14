export interface MenuItem {
  title: string;
  url: string;
  icon: string;
  tooltip: string;
}

export const menuItems: MenuItem[] = [
  {
    title: 'Главная',
    url: '/',
    icon: 'streamline-freehand-color:home-chimney-2',
    tooltip: 'Переход на главную страницу',
  },
  {
    title: 'Профиль',
    url: '/profile',
    icon: 'streamline-freehand-color:composition-man',
    tooltip: 'Профиль пользователя',
  },
  {
    title: 'Настройки',
    url: '/settings',
    icon: 'streamline-freehand-color:settings-cog',
    tooltip: 'Настройки приложения',
  },
];
