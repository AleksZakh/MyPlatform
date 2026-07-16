// stores/user.ts
import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    // Стейт пустой по умолчанию
  }),
  getters: {
    // Пользуемся глобальным хелпером useUserSession, который дает модуль
    user: () => {
      const { user } = useUserSession()
      return user.value // Вернет объект: { username, name, department... } или null
    },
    isAuthenticated() {
      return !!this.user
    }
  }
})
