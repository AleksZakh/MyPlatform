export const searchUserInAD = async (searcParam: any) =>{
    
    const foundUser = ref(null)
    const searchPerformed = ref(false)
    const pending = ref(false)
    const error = ref(null)

    // 1. Описываем структуру объекта пользователя из Active Directory
interface ADUser {
  dn: string
  cn: string
  displayName?: string
  mail?: string
  title?: string
  department?: string
  telephoneNumber?: string
  [key: string]: any // Для любых других динамических свойств
}

// 2. Описываем структуру ответа вашего API-эндпоинта
interface ADSearchResponse {
  success: boolean
  count: number
  results: {
    users: ADUser[]
  }
}

    pending.value = true
    error.value = null
    foundUser.value = null
    searchPerformed.value = true


    // Формируем стандартный LDAP-фильтр для Active Directory
    // Экранируем введенный email для безопасности и приводим к нижнему регистру
    const cleanEmail = searcParam.authorEmail.trim().toLowerCase();
    const adFilter = `(&(objectClass=user)(mail=${cleanEmail}))`;
    console.log('searchParam ======> ', adFilter);

    try {
        // Делаем запрос к вашему созданному эндпоинту
        const response = await $fetch<ADSearchResponse>('/api/ad/search', {
        method: 'GET',
        query: {
            filter: adFilter,
            limit: 1 // Нам нужен только один конкретный пользователь
        }
        })
        if (response.success && response.count > 0) {
            // Забираем первого пользователя из массива результатов ad.find
            
            return response.results.users[0]
        }
        
    } catch (error) {
        
    }

}