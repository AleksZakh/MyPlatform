// stores/user.ts
import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null as any | null,
  }),
  getters: {
    isAuthenticated: (state) => !!state.user,
    // Проверка, состоит ли пользователь в конкретной доменной группе безопасности
    isAdmin: (state) => {
      if (!state.user?.groups) return false
      return state.user.groups.some((group: string) => group.includes('CN=Web_Admins'))
    }
  },
  actions: {
    // Метод для первоначальной загрузки данных
    initUser() {
      // Забираем данные из созданного на сервере моста
      const sharedUser = useState('auth_user_bridge')
      
      if (sharedUser.value) {
        this.user = sharedUser.value
      }
    }
  }
})
