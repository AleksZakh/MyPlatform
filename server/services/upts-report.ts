import { workKindName, UPTS_WORK_ROLES } from '../../shared/utils/upts-work-kinds';
import ExcelJS from 'exceljs';
import { UPTS_CONTRACT_TYPES } from '../../shared/types/upts-library';
import {
  UPTS_STATUSES,
  UPTS_TYPES,
  UPTS_AXES,
  UPTS_READINESS,
  type UptsSnapshot,
} from '../../shared/types/upts';
import {
  WORK_STATUSES,
  WORK_PRIORITIES,
  workUserName,
} from '../../shared/types/work';
import { taskSummary } from '../../shared/utils/upts';
import { formatWorkDate } from '../../shared/utils/work-board';
export async function uptsWorkbook(
  data: UptsSnapshot,
  filters: {
    projectId?: unknown;
    contractId?: unknown;
    employeeId?: unknown;
    q?: unknown;
    archived?: unknown;
  } = {},
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Space · УПТС';
  workbook.created = new Date();
  function sheet(name: string, headers: string[], rows: unknown[][]) {
    const ws = workbook.addWorksheet(name, {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    ws.columns = headers.map((h) => ({
      header: h,
      width: h.length > 25 ? 42 : 24,
    }));
    for (const row of rows) ws.addRow(row); // Values are strings/numbers, never Excel formula objects.
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2563EB' },
    };
    ws.getRow(1).height = 30;
    ws.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: Math.max(1, ws.rowCount), column: headers.length },
    };
    ws.eachRow((row) => {
      row.alignment = { vertical: 'top', wrapText: true };
    });
    return ws;
  }
  sheet(
    'Параметры',
    ['Параметр', 'Значение'],
    [
      ['Дата среза (Москва)', data.today],
      ['Объект', String(filters.contractId || 'Все доступные')],
      ['Проект', String(filters.projectId || 'Все доступные')],
      ['Исполнитель', String(filters.employeeId || 'Все')],
      ['Поиск', String(filters.q || '')],
      ['Архив', filters.archived === '1' ? 'Да' : 'Нет'],
      [
        'Область отчёта',
        'Только проекты и задачи, доступные текущему пользователю. Фильтр сотрудника — основной исполнитель задачи.',
      ],
      [
        'Готовность',
        'Процент означает долю выполненных задач; готовность объекта учитывается отдельно по пяти направлениям.',
      ],
      [
        'Область объектов и недвижимости',
        'Объекты — по выбранному объекту, поиску и исполнителю. Участки и сооружения — на уровне проекта; без распределения по карточкам учёта.',
      ],
    ],
  );
  sheet(
    'Проекты',
    [
      'ID',
      'Проект',
      'Тип',
      'Состояние',
      'Владелец проекта',
      'Начало',
      'Срок',
      'Задач в срезе',
      'Выполнено',
      'Просрочено',
      'С препятствием',
      'Выполнено задач, %',
      'Демо',
    ],
    data.projects.map((p) => {
      const s = taskSummary(
        data.tasks.filter((t) => t.projectId === p.id),
        data.today,
      );
      return [
        p.id,
        p.name,
        UPTS_TYPES[p.upts.projectType],
        UPTS_STATUSES[p.upts.status],
        workUserName(p.owner),
        formatWorkDate(p.startDate),
        formatWorkDate(p.dueDate),
        s.total,
        s.done,
        s.overdue,
        s.blocked,
        s.percent,
        p.upts.isDemo ? 'Да' : 'Нет',
      ];
    }),
  );
  sheet(
    'Задачи',
    [
      'ID',
      'Проект',
      'Связанный участок',
      'Объект',
      'Задача',
      'Исполнитель',
      'Статус',
      'Приоритет',
      'Начало',
      'Срок',
      'Просрочено',
      'Препятствие',
      'Вид работ',
      'Ответственная роль',
      'Ожидаемый результат',
    ],
    data.tasks.map((t) => {
      const p = data.projects.find((p) => p.id === t.projectId),
        o = p?.upts.objects.find((o) => o.id === t.uptsObjectId);
      return [
        t.id,
        t.project?.name,
        o?.object.name || 'Общая задача',
        p?.upts.contracts.find(c=>c.id===t.uptsContractId)?.number || 'Без привязки',
        t.title,
        workUserName(t.assignee),
        WORK_STATUSES[t.status as keyof typeof WORK_STATUSES],
        WORK_PRIORITIES[t.priority as keyof typeof WORK_PRIORITIES],
        formatWorkDate(t.startDate),
        formatWorkDate(t.dueDate),
        taskSummary([t], data.today).overdue ? 'Да' : 'Нет',
        t.blockedReason,
        workKindName(t.uptsWorkMeta?.workKindKey),
        t.uptsWorkMeta?.responsibleRole ? UPTS_WORK_ROLES[t.uptsWorkMeta.responsibleRole] : "",
        t.uptsWorkMeta?.expectedResult || "",
      ];
    }),
  );
  const employees = new Map<number | null, typeof data.tasks>();
  for (const t of data.tasks)
    employees.set(t.assigneeId, [...(employees.get(t.assigneeId) || []), t]);
  sheet(
    'Сотрудники',
    [
      'Исполнитель',
      'Проектов',
      'Задач',
      'Открыто',
      'Выполнено',
      'Просрочено',
      'С препятствием',
    ],
    [...employees.values()].map((tasks) => {
      const s = taskSummary(tasks, data.today);
      return [
        workUserName(tasks[0]!.assignee),
        new Set(tasks.map((t) => t.projectId)).size,
        s.total,
        s.active,
        s.done,
        s.overdue,
        s.blocked,
      ];
    }),
  );
  sheet(
    'Участки и сооружения',
    [
      'Проект',
      'Участок',
      'Кадастровый номер',
      'Адрес',
      'Цель',
      ...Object.values(UPTS_AXES),
      'Примечание',
    ],
    data.projects.flatMap((p) =>
      p.upts.objects.map((o) => [
        p.name,
        o.object.name,
        o.object.cadastralNumber || '',
        o.object.address,
        o.goal,
        ...(Object.keys(UPTS_AXES) as (keyof typeof UPTS_AXES)[]).map(
          (k) => UPTS_READINESS[o[k]],
        ),
        o.note,
      ]),
    ),
  );
  sheet(
    'Объекты',
    [
      'Проект',
      'Тип объекта',
      'Номер',
      'Наименование',
      'Контрагент',
      'Дата',
      'Срок',
      'Папка относительно хранилища проектов',
      'Дорога', 'Этап', 'Вид работ', 'Правообладатели', 'Область', 'Тип сделки', 'Кадастровый номер исходного ЗУ', 'Площадь исходного ЗУ, кв. м', 'Вид права', 'ВРИ исходного ЗУ', 'Тип учёта', 'КУВД', 'Куратор (ID)', 'Кадастровый инженер (ID)', 'Описание деятельности',
    ],
    data.projects.flatMap((p) =>
      p.upts.contracts.map((c) => [
        p.name,
        c.contractType ? UPTS_CONTRACT_TYPES[c.contractType] : 'Не указан',
        c.number,
        c.name,
        c.counterparty,
        formatWorkDate(c.signedDate),
        formatWorkDate(c.dueDate),
        `${p.id}/contracts/${c.id}`,
        c.objectDetails?.road || '', c.objectDetails?.stage || '', workKindName(c.objectDetails?.workKindKey), c.objectDetails?.rightHolders?.join('; ') || '', c.objectDetails?.region || '', c.objectDetails?.dealType || '', c.objectDetails?.sourceCadastralNumber || '', c.objectDetails?.sourceArea || '', c.objectDetails?.rightKind || '', c.objectDetails?.permittedUses?.join('; ') || '', c.objectDetails?.accountingType || '', c.objectDetails?.kuvdEntries?.map(e=>e.number+' '+formatWorkDate(e.date)).join('; ') || '', c.objectDetails?.curatorId || '', c.objectDetails?.engineerId || '', c.objectDetails?.otherDescription || '', 
      ]),
    ),
  );
  return workbook.xlsx.writeBuffer();
}
