// app/composables/useTableSettings.ts

export interface LabTableColumnDefinition {
  id: string
  label: string
  size: number
  defaultVisible: boolean
  kind?: 'text' | 'date' | 'document'
}


/**
 * ID колонок повторяют реальные пути данных,
 * возвращаемых /api/incoming-control.
 *
 * Русский текст существует только как UI label.
 */
export const LAB_TABLE_COLUMNS:
  readonly LabTableColumnDefinition[] = [
    {
      id: 'plp.name',
      label: 'ПЛП',
      size: 80,
      defaultVisible: true,
    },
    {
      id: 'testLocation.testObject.name',
      label: 'Объект',
      size: 250,
      defaultVisible: true,
    },
    {
      id: 'samplingActNumber',
      label: '№ Акта',
      size: 130,
      defaultVisible: true,
    },
    {
      id: 'samplingDate',
      label: 'Дата отбора',
      size: 130,
      defaultVisible: false,
      kind: 'date',
    },
    {
      id: 'testLocation.name',
      label: 'Место отбора',
      size: 200,
      defaultVisible: false,
    },
    {
      id: 'inspector.name',
      label: 'Кто предоставил',
      size: 180,
      defaultVisible: false,
    },
    {
      id: 'receiptMaterial.receiptDate',
      label: 'Дата поступления',
      size: 150,
      defaultVisible: true,
      kind: 'date',
    },
    {
      id: 'receiptMaterial.qualityDocumentDate',
      label: 'Дата документа о качестве',
      size: 180,
      defaultVisible: true,
      kind: 'date',
    },
    {
      id: 'receiptMaterial.material.name',
      label: 'Материал',
      size: 220,
      defaultVisible: true,
    },
    {
      id: 'receiptMaterial.qualityDocumentPath',
      label: 'Документ о качестве',
      size: 170,
      defaultVisible: false,
      kind: 'document',
    },
    {
      id: 'receiptMaterial.manufacturer.name',
      label: 'Изготовитель',
      size: 220,
      defaultVisible: false,
    },
    {
      id: 'testProtocol.protocolNumber',
      label: '№ Протокола',
      size: 150,
      defaultVisible: true,
    },
    {
      id: 'testProtocol.protocolDate',
      label: 'Дата протокола',
      size: 140,
      defaultVisible: false,
      kind: 'date',
    },
    {
      id: 'testProtocol.testResult',
      label: 'Результат',
      size: 160,
      defaultVisible: true,
    },
    {
      id: 'note',
      label: 'Примечание',
      size: 220,
      defaultVisible: true,
    },
  ] as const


const LEGACY_COLUMN_MAP:
  Record<string, string> = {
    'ПЛП': 'plp.name',
    'Наименование объекта':
      'testLocation.testObject.name',
    'Наименование объект':
      'testLocation.testObject.name',
    'Номер акта отбора проб':
      'samplingActNumber',
    'Дата отбора проб':
      'samplingDate',
    'Место отбора проб':
      'testLocation.name',
    'Лицо, предоставившее пробу':
      'inspector.name',
    'Дата поступления материала':
      'receiptMaterial.receiptDate',
    'Дата документа о качестве':
      'receiptMaterial.qualityDocumentDate',
    'Наименование материала':
      'receiptMaterial.material.name',
    'Документ о качестве':
      'receiptMaterial.qualityDocumentPath',
    'Предприятие-изготовитель':
      'receiptMaterial.manufacturer.name',
    'Номер протокола':
      'testProtocol.protocolNumber',
    'Дата протокола':
      'testProtocol.protocolDate',
    'Результат испытаний':
      'testProtocol.testResult',
    'Примечание (акт)':
      'note',
    'Примечание':
      'note',
  }


const ALL_AVAILABLE_COLUMNS =
  LAB_TABLE_COLUMNS.map(
    column => column.id,
  )


const DEFAULT_VISIBLE_COLUMNS =
  LAB_TABLE_COLUMNS
    .filter(column => column.defaultVisible)
    .map(column => column.id)


function normalizeColumns(
  columns: unknown,
): string[] {
  if (!Array.isArray(columns)) {
    return [...DEFAULT_VISIBLE_COLUMNS]
  }

  const available =
    new Set(ALL_AVAILABLE_COLUMNS)

  const normalized =
    columns
      .map(column => {
        if (typeof column !== 'string') {
          return null
        }

        return (
          LEGACY_COLUMN_MAP[column] ??
          column
        )
      })
      .filter(
        (column): column is string =>
          !!column &&
          available.has(column),
      )

  return normalized.length > 0
    ? [...new Set(normalized)]
    : [...DEFAULT_VISIBLE_COLUMNS]
}


export const useTableSettings = () => {
  const nuxtApp = useNuxtApp()
  const toast = useToast()

  const tableSettings = ref({
    visibleColumns:
      [...DEFAULT_VISIBLE_COLUMNS],
  })


  const loadSettings = () => {
    if (nuxtApp.ssrContext) {
      return
    }

    try {
      const saved =
        localStorage.getItem(
          'tableSettings',
        )

      if (!saved) {
        return
      }

      const parsed =
        JSON.parse(saved)

      tableSettings.value = {
        ...tableSettings.value,
        ...parsed,
        visibleColumns:
          normalizeColumns(
            parsed?.visibleColumns,
          ),
      }

      // Один раз переписываем старые русские ID
      // в новые стабильные ID.
      localStorage.setItem(
        'tableSettings',
        JSON.stringify(
          tableSettings.value,
        ),
      )
    } catch (error) {
      console.error(
        'Ошибка загрузки настроек таблицы:',
        error,
      )
    }
  }


  const saveSettings = () => {
    if (!import.meta.client) {
      return
    }

    try {
      localStorage.setItem(
        'tableSettings',
        JSON.stringify(
          tableSettings.value,
        ),
      )

      toast.add({
        title: '✅ Настройки сохранены',
        description:
          'Настройки таблицы успешно обновлены',
        color: 'success',
        icon:
          'i-heroicons-check-circle',
        duration: 3000,
      })
    } catch (error) {
      console.error(
        'Ошибка сохранения настроек:',
        error,
      )

      toast.add({
        title: '❌ Ошибка сохранения',
        description:
          'Не удалось сохранить настройки',
        color: 'error',
        icon:
          'i-heroicons-exclamation-triangle',
        duration: 3000,
      })
    }
  }


  const updateVisibleColumns = (
    columns: string[],
  ) => {
    tableSettings.value.visibleColumns =
      normalizeColumns(columns)

    saveSettings()
  }


  const getVisibleColumns = () => {
    return [
      ...tableSettings.value.visibleColumns,
    ]
  }


  const getAllAvailableColumns = () => {
    return [...ALL_AVAILABLE_COLUMNS]
  }


  const resetSettings = () => {
    tableSettings.value = {
      visibleColumns:
        [...DEFAULT_VISIBLE_COLUMNS],
    }

    saveSettings()
  }


  loadSettings()


  return {
    tableSettings,
    ALL_AVAILABLE_COLUMNS,

    loadSettings,
    saveSettings,
    updateVisibleColumns,
    getVisibleColumns,
    getAllAvailableColumns,
    resetSettings,
  }
}
