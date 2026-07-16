// plugins/pinia-auth-sync.ts
export default defineNuxtPlugin(() => {
  const userStore = useUserStore()
  
  // На сервере данные попадут из useState в Pinia.
  // На клиенте Pinia подхватит уже гидрированный (готовый) useState.
  userStore.initUser()
})
