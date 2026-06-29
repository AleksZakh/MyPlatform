export const useIncomingControl = () => {
  const items = ref([])
  const loading = ref(false)
  
  const fetchItems = async () => {
    loading.value = true
    try {
      const data = await $fetch('/api/incoming-control')
    //   items.value = data
    } finally {
      loading.value = false
    }
  }
  
  const createItem = async () => {
    await $fetch('/api/incoming-control', {
      method: 'POST',
    //   body: formData
    })
    await fetchItems() // обновляем таблицу
  }
  
  // updateItem, deleteItem...
  
  return { items, loading, fetchItems, createItem }
}