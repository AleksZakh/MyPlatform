export interface MenuItem {
  title: string;
  url: string;
  icon: string;
}

export const menuItems: MenuItem[] = [
  { title: 'Главная', url: '/', icon: 'line-md:home' },
  { title: 'Профиль', url: '/profile', icon: 'line-md:account' },
  { title: 'Настройки', url: '/settings', icon: 'line-md:cog' },
];
