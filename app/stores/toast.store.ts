import { allowNotification } from '~~/shared/utils/user-preferences';
import { defineStore } from 'pinia'; // Или используемый вами менеджер состояний

interface Toast {
  id: number | string;
  title: string;
  description: string;
  type: string;
}

export const useToastStore = defineStore('toast', {
  state: () => ({
    toasts: [] as Toast[],
  }),
  actions: {
    addToast(toast: Toast) {
      const { preferences } = useUserPreferences();
      if (!allowNotification(preferences.value.notifications, toast.type)) return;
      if (this.toasts.some(t => t.type === toast.type && t.title === toast.title && t.description === toast.description)) return;
      if (!toast.id) toast.id = Math.random().toString(); // Генерируем уникальный ID
      this.toasts.unshift(toast); // Добавляем сверху списка
    },
    removeToast(id: number | string) {
      this.toasts = this.toasts.filter((t) => t.id !== id);
    },
  },
});
