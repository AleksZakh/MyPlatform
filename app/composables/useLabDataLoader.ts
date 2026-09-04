// composables/useLabDataLoader.ts
export const useLabDataLoader = () => {

  const loading = ref(false);
  const originalData = ref<Record<string, string>[]>([]);
  const headers = ref<string[]>([]);
  const totalCount = ref(0);
  const loadingToastId = ref<string | number | null>(null);
  const {showTost, removeToast} = useAppToasts();
  
  // 👇 ПАРАМЕТРЫ ПАГИНАЦИИ
  const currentPage = ref(1);
  const pageSize = ref(25);
  const totalPages = ref(0);

  const loadData = async (page: number = currentPage.value, size: number = pageSize.value) => {
    // console.log(`📥 Загрузка данных: страница ${page}, размер ${size}`);    
    const toastId = showTost(`📥 Загрузка данных...`, 'Пожалуйста, подождите', 'info', 'heroicons:arrow-path-rounded-square-solid', 1000);    

    loading.value = true;
    loadingToastId.value = toastId.id;

    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(size),
      });

      const response = await fetch(`/api/incoming-control/?${params}`);
      const result = await response.json();
      console.log('result ======> ', result);
      

      if (result.success) {
        removeToast(loadingToastId.value);
        originalData.value = result.data;

        if (originalData.value.length > 0 && originalData.value[0]) {
          headers.value = Object.keys(originalData.value[0]);
        } else {
          headers.value = [];
        }

        if (result.pagination) {
          totalCount.value = result.pagination.totalCount;
          totalPages.value = result.pagination.totalPages || Math.ceil(totalCount.value / pageSize.value);
          currentPage.value = page;
          pageSize.value = size;
        }

        return {
          success: true,
          data: originalData.value,
          headers: headers.value,
          totalCount: totalCount.value,
          totalPages: totalPages.value,
          currentPage: currentPage.value,
        };
      } else {
        console.error('❌ Ошибка загрузки:', result.error);
        removeToast(loadingToastId.value);

        showTost( '❌ Ошибка загрузки', `${result.error || 'Не удалось загрузить данные'}`, 'error', 'i-heroicons-exclamation-triangle', 5000);

        return {
          success: false,
          error: result.error || 'Не удалось загрузить данные',
        };
      }
    } catch (error) {
      console.error('❌ Ошибка:', error);

      showTost('❌ Ошибка', `${error instanceof Error ? error.message : 'Неизвестная ошибка'}`, 'error','i-heroicons-exclamation-triangle',5000);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
      };
    } finally {
      loading.value = false;
    }
  };

  // 👇 МЕТОД ДЛЯ СМЕНЫ СТРАНИЦЫ
  const changePage = async (page: number) => {
    if (page < 1 || page > totalPages.value) return;
    return await loadData(page, pageSize.value);
  };

  // 👇 МЕТОД ДЛЯ СМЕНЫ РАЗМЕРА СТРАНИЦЫ
  const changePageSize = async (size: number) => {
    if (size < 1) return;
    return await loadData(1, size);
  };

  // 👇 МЕТОД ДЛЯ ПЕРЕЗАГРУЗКИ ТЕКУЩЕЙ СТРАНИЦЫ
  const reloadCurrentPage = async () => {
    return await loadData(currentPage.value, pageSize.value);
  };

  return {
    // Состояния
    loading,
    originalData,
    headers,
    totalCount,
    totalPages,
    currentPage,
    pageSize,
    loadingToastId,

    // Методы
    loadData,
    changePage,
    changePageSize,
    reloadCurrentPage,
  };
};