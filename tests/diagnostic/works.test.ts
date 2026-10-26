import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { workCode, parseWork, positiveId, hoursValue } from '../../shared/utils/diagnostic-works.ts';
test('99 whole codes then dot suffix, without collisions across nine groups', () => {
  const codes = new Set<string>();
  for (let group = 1; group <= 9; group++) for (let sequence = 0; sequence <= 10000; sequence++) {
    const code = workCode(group, sequence);
    assert(!codes.has(code)); codes.add(code);
    assert.equal(code[0], String(group));
  }
  assert.equal(workCode(3, 99), '399');
  assert.equal(workCode(3, 100), '300.1');
  assert.equal(workCode(3, 101), '300.2');
  assert.equal(workCode(3, 109), '300.10');
  assert.notEqual(workCode(3, 100), workCode(3, 109));
});
test('strict IDs and counters', () => {
  for (const v of [null, undefined, '', '0', 0, -1, 1.5, true, '1x', '1e3', '01', 2147483648]) assert.throws(() => positiveId(v));
  for (const g of [0, 10, 1.5, NaN]) assert.throws(() => workCode(g, 1));
  assert.equal(workCode(3, 0), '300');
  assert.throws(() => workCode(3, -1));
});
test('decimal hours are validated without float conversion', () => {
  assert.equal(hoursValue('1,2500'), '1.2500');
  assert.equal(hoursValue('0'), '0');
  assert.equal(hoursValue('99999999.9999'), '99999999.9999');
  for (const v of ['', null, -1, Infinity, '1e3', '1.12345', '100000000', '1,2,3']) assert.throws(() => hoursValue(v));
});
test('all content fields except note are mandatory; unexpected input is discarded', () => {
  const valid = { groupId: 3, categoryId: 1, name: 'Работа', hours: '0.5', criteria: 'Выполнена', code: '999', createdById: 1 };
  assert.equal(parseWork(valid).note, '');
  assert(!('code' in parseWork(valid))); assert(!('createdById' in parseWork(valid)));
  for (const key of ['groupId', 'categoryId', 'name', 'hours', 'criteria']) assert.throws(() => parseWork({ ...valid, [key]: '' }));
  assert.throws(() => parseWork({ ...valid, groupId: 10 }));
});
test('149 valid legacy works, four agreed corrections, no ID 151', () => {
  const rows = JSON.parse(readFileSync(new URL('../../data/diagnostic-legacy-works.json', import.meta.url), 'utf8'));
  assert.equal(rows.length, 149);
  assert.equal(new Set(rows.map((w: any) => w.code)).size, 149);
  assert(!rows.some((w: any) => w.legacyId === 151));
  for (const row of rows) {
    parseWork({ ...row, categoryId: 1 });
    assert.equal(workCode(row.groupId, Number(row.code) % 100), row.code);
  }
  assert.equal(rows.find((w: any) => w.code === '321').category, 'Работы по сооружению');
  assert.equal(rows.find((w: any) => w.code === '146').category, 'Работы с договором');
  assert.equal(rows.find((w: any) => w.code === '323').criteria, 'Программа испытаний разработана');
  assert.equal(rows.find((w: any) => w.code === '909').criteria, 'Подготовлены и согласованы документы и организационные условия для командировки');
});

