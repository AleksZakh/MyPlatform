// auth.store.ts
import { defineStore } from "pinia";

interface IUserData {
  email: string;
  name: string;
  sessionId: string;
  status: boolean;
}

interface IAuthState {
  user: IUserData;
}

const getDefaultState = (): IAuthState => ({
  user: {
    email: "",
    name: "",
    sessionId: "",
    status: false,
  },
});

export const useAuthStore = defineStore("auth", {
  state: (): IAuthState => getDefaultState(),
  
  getters: {
    getUserInfo: (state): IUserData => state.user,
    isAuth: (state): boolean => state.user.status,
    getMyName: (state): string => state.user.name,
    getMyEmail: (state): string => state.user.email,
    getSessionId: (state): string => state.user.sessionId,
  },
  
  actions: {
    clear() {
      this.$patch(getDefaultState());
      // Опционально: очистить localStorage/cookie
      if (process.client) {
        localStorage.removeItem('auth_token');
      }
    },
    
    set(userData: IUserData) {
      this.$patch({ user: userData });
      console.log(this.user);
      console.log(`Информация о пользователе обновлена:`, this.getUserInfo);
      
      // Опционально: сохранить в localStorage
      // if (process.client && userData.status) {
      //   localStorage.setItem('auth_token', userData.sessionId);
      // }
    },
    
    // Полезный метод для проверки валидности сессии
    async validateSession(): Promise<boolean> {
      if (!this.isAuth) return false;
      
      // Здесь можно сделать запрос на бэкенд для проверки sessionId
      // const { data } = await $fetch('/api/auth/validate', {
      //   headers: { 'Authorization': `Bearer ${this.getSessionId}` }
      // });
      // return data.valid;
      
      return this.isAuth;
    }
  },
});

export const useIsLoadingStore = defineStore("isLoading", {
  state: () => ({
    isLoading: false as boolean,
  }),
  
  getters: {
    getIsLoading: (state): boolean => state.isLoading,
  },
  
  actions: {
    set(data: boolean) {
      this.$patch({ isLoading: data });
    },
    
    start() {
      this.set(true);
    },
    
    stop() {
      this.set(false);
    },
  },
});
