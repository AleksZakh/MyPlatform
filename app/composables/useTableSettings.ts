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


export function normalizeColumns(
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
  const { preferences, ready, save } = useUserPreferences();
  const toast = useSpaceToast();
  const tableSettings = computed(() => ({
    visibleColumns: normalizeColumns(preferences.value.labTable?.visibleColumns),
    columnOrder: [...new Set([...(preferences.value.labTable?.columnOrder || []), ...ALL_AVAILABLE_COLUMNS])].filter(id => ALL_AVAILABLE_COLUMNS.includes(id)),
  }));
  async function persist(visibleColumns: string[], columnOrder: string[]) {
    try { await save({ labTable: { visibleColumns: normalizeColumns(visibleColumns), columnOrder } }); }
    catch (e) { toast.add({ title: 'Не удалось сохранить настройки таблицы', description: 'Повторите действие после загрузки профиля.', color: 'error' }); throw e; }
  }
  const updateVisibleColumns = (columns: string[]) => persist(columns, tableSettings.value.columnOrder);
  const updateColumnOrder = (columns: string[]) => persist(tableSettings.value.visibleColumns, [...new Set([...columns, ...tableSettings.value.columnOrder])]);
  const resetSettings = () => save({ labTable: null });
  return { tableSettings, ready, ALL_AVAILABLE_COLUMNS, updateVisibleColumns, updateColumnOrder, resetSettings,
    getVisibleColumns: () => [...tableSettings.value.visibleColumns], getAllAvailableColumns: () => [...ALL_AVAILABLE_COLUMNS],
    loadSettings: () => {}, saveSettings: () => persist(tableSettings.value.visibleColumns, tableSettings.value.columnOrder),
  };
}
