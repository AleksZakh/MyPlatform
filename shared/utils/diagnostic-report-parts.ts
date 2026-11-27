// The report groups observations by these roles. Several library works can satisfy the same role.
export const reportParts = [
  { key: 'visit', group: 'Полевые работы', label: 'Выезд' },
  { key: 'survey', group: 'Полевые работы', label: 'Геодезия' },
  { key: 'strengthMeasurement', group: 'Полевые работы', label: 'Измерение прочности бетона' },
  { key: 'defects', group: 'Полевые работы', label: 'Дефекты' },
  { key: 'lift', group: 'АИС Конструктив', label: 'Стройподъём' },
  { key: 'strengthEntry', group: 'АИС Конструктив', label: 'Внесение прочности бетона в АИС' },
  { key: 'construction', group: 'АИС Конструктив', label: 'Конструктив' },
] as const;

export function reportGroup(key?: string) {
  return reportParts.find(part => part.key === key)?.group;
}

export interface ReportMembership {
  id: number;
  version: number;
  fieldWork: boolean;
  reportPart: string;
}
