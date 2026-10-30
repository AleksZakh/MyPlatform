import ExcelJS from 'exceljs';
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
        'Объекты и договоры',
        'Все объекты и договоры проектов, вошедших в отфильтрованный срез.',
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
      'Объект',
      'Задача',
      'Исполнитель',
      'Статус',
      'Приоритет',
      'Начало',
      'Срок',
      'Просрочено',
      'Препятствие',
    ],
    data.tasks.map((t) => {
      const p = data.projects.find((p) => p.id === t.projectId),
        o = p?.upts.objects.find((o) => o.id === t.uptsObjectId);
      return [
        t.id,
        t.project?.name,
        o?.object.name || 'Общая задача',
        t.title,
        workUserName(t.assignee),
        WORK_STATUSES[t.status as keyof typeof WORK_STATUSES],
        WORK_PRIORITIES[t.priority as keyof typeof WORK_PRIORITIES],
        formatWorkDate(t.startDate),
        formatWorkDate(t.dueDate),
        taskSummary([t], data.today).overdue ? 'Да' : 'Нет',
        t.blockedReason,
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
    'Объекты',
    [
      'Проект',
      'Объект',
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
    'Договоры',
    [
      'Проект',
      'Номер',
      'Наименование',
      'Контрагент',
      'Дата',
      'Срок',
      'Папка относительно хранилища проектов',
    ],
    data.projects.flatMap((p) =>
      p.upts.contracts.map((c) => [
        p.name,
        c.number,
        c.name,
        c.counterparty,
        formatWorkDate(c.signedDate),
        formatWorkDate(c.dueDate),
        `${p.id}/contracts/${c.id}`,
      ]),
    ),
  );
  return workbook.xlsx.writeBuffer();
}
