export interface MenuItem {
  title: string;
  url: string;
  icon: string;
}

export const menuItems: MenuItem[] = [
  { title: 'Главная', url: '/', icon: 'streamline-freehand-color:home-chimney-2' },
  { title: 'Профиль', url: '/profile', icon: 'streamline-freehand-color:composition-man' },
  { title: 'Настройки', url: '/settings', icon: 'streamline-freehand-color:settings-cog' },
];
