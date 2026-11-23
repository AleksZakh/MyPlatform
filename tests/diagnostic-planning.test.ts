import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  dateIssue,
  freeWork,
  itemKey,
  isTravel,
  libraryRow,
  type PlanLibrary,
  type PlanStructure,
} from '../shared/utils/diagnostic-planning';

test('План можно разместить на обеих границах договора, в том числе одним днём', () => {
  const bounds = { start: '2026-11-23', finish: '2026-11-27' };
  for (const [start, end] of [
    [bounds.start, bounds.finish],
    [bounds.start, bounds.start],
    [bounds.finish, bounds.finish],
  ] as const)
    assert.equal(dateIssue(bounds, start, end), '');
  for (const [start, end] of [
    ['2026-11-22', bounds.finish],
    [bounds.start, '2026-11-28'],
    [bounds.finish, bounds.start],
    ['2026-02-30', bounds.start],
  ] as const)
    assert.ok(dateIssue(bounds, start, end));
  assert.equal(dateIssue({ start: null, finish: null }, bounds.start, bounds.finish), '');
});
test('Назначать можно только свободную работу без исполнителя и факта', () => {
  const free = {
    status: 'unplanned',
    planExecutor: '',
    factExecutor: '',
    factStart: null,
    factFinish: null,
    factHours: null,
  };
  assert.ok(freeWork(free));
  for (const patch of [
    { status: 'scheduled' },
    { status: 'planned' },
    { status: 'in_progress' },
    { status: 'completed' },
    { status: 'overdue' },
    { planExecutor: 'Иванов И.И.' },
    { factExecutor: 'Иванов И.И.' },
    { factHours: 0 },
    { factStart: '2026-11-23' },
    { factFinish: '2026-11-23' },
  ])
    assert.equal(freeWork({ ...free, ...patch }), false);
});
test('Одна запись библиотеки может быть выбрана отдельно для двух сооружений', () => {
  const work: PlanLibrary = {
    id: 4,
    name: 'Осмотр',
    code: '310',
    category: 'structure',
    group: 'ОТС',
    note: '',
    hours: '2.25',
  };
  const s: PlanStructure = {
    id: 10,
    linkId: 21,
    code: 'Т-1',
    roadName: 'М-4',
    location: '150+000',
    locationMetres: 150000,
    structureName: 'Мост',
    additionalId: '',
    region: '',
  };
  const row = libraryRow(work, s);
  assert.equal(row.hours, '2.25');
  assert.equal(row.isso, 'Т-1');
  assert.notEqual(itemKey(row), itemKey(libraryRow(work, { ...s, linkId: 22 })));
  assert.notEqual(itemKey(row), itemKey({ ...row, origin: 'existing' }));
  for (const code of ['301', '302']) assert.ok(isTravel({ ...row, code }));
  assert.equal(isTravel({ ...row, code: '301', category: 'contract' }), false);
});
