// composables/useTableSettings.ts
export const useTableSettings = () => {
    const nuxtApp = useNuxtApp();
    const toast = useToast();
  
  // Статический список ВСЕХ возможных столбцов из БД
  const ALL_AVAILABLE_COLUMNS = [
    'ПЛП',
    'Наименование объект',
    'Номер акта отбора проб',
    'Дата отбора проб',
    'Место отбора проб',
    'Лицо, предоставившее пробу',
    'Дата поступления материала',
    'Дата документа о качестве',
    'Наименование материала',
    'Документ о качестве',
    'Предприятие-изготовитель',
    'Номер протокола',
    'Дата протокола',
    'Результат испытаний',
    'Примечание'
  ] as const;

  // Состояние настроек таблицы
  const tableSettings = ref({
    visibleColumns: [
      'ПЛП',
      'Наименование объект',
      'Номер акта отбора проб',
      'Дата поступления материала',
      'Дата документа о качестве',
      'Наименование материала',
      'Номер протокола',
      'Результат испытаний',
      'Примечание'
    ],
    // Здесь будут добавляться другие настройки
    // Например: сортировка, фильтры и т.д.
  });

  // Загрузка настроек из localStorage (или из API)
  const loadSettings = () => {
    // ✅ ПРОВЕРЯЕМ ЧЕРЕЗ nuxtApp
    if (nuxtApp.ssrContext) {
      // На сервере - используем настройки по умолчанию
      return;
    }
    try {
      const saved = localStorage.getItem('tableSettings');
      if (saved) {
        const parsed = JSON.parse(saved);
        tableSettings.value = { ...tableSettings.value, ...parsed };
      }
    } catch (error) {
      console.error('Ошибка загрузки настроек:', error);
    }
  };

  // Сохранение настроек в localStorage (или в API)
  const saveSettings = () => {
    try {
      localStorage.setItem('tableSettings', JSON.stringify(tableSettings.value));
      toast.add({
        title: '✅ Настройки сохранены',
        description: 'Настройки таблицы успешно обновлены',
        color: 'success',
        icon: 'i-heroicons-check-circle',
        duration: 3000,
      });
    } catch (error) {
      console.error('Ошибка сохранения настроек:', error);
      toast.add({
        title: '❌ Ошибка сохранения',
        description: 'Не удалось сохранить настройки',
        color: 'error',
        icon: 'i-heroicons-exclamation-triangle',
        duration: 3000,
      });
    }
  };

  // Обновление видимых колонок
  const updateVisibleColumns = (columns: string[]) => {
    tableSettings.value.visibleColumns = columns;
    saveSettings();
  };

  // Получение видимых колонок
  const getVisibleColumns = () => {
    return tableSettings.value.visibleColumns;
  };

  // Получение ВСЕХ доступных колонок (статический список)
  const getAllAvailableColumns = () => {
    return [...ALL_AVAILABLE_COLUMNS];
  };

  // Сброс настроек по умолчанию
  const resetSettings = () => {
    tableSettings.value = {
      visibleColumns: [
        'ПЛП',
        'Наименование объект',
        'Номер акта отбора проб',
        'Дата поступления материала',
        'Дата документа о качестве',
        'Наименование материала',
        'Номер протокола',
        'Результат испытаний',
        'Примечание'
      ],
    };
    saveSettings();
  };

  // Инициализация
  loadSettings();

  return {
    // Состояния
    tableSettings,
    
    // Константы
    ALL_AVAILABLE_COLUMNS,
    
    // Методы
    loadSettings,
    saveSettings,
    updateVisibleColumns,
    getVisibleColumns,
    getAllAvailableColumns,
    resetSettings,
  };
};