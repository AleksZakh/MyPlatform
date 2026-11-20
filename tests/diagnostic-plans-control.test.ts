import test from 'node:test'
import assert from 'node:assert/strict'
import { komovControls, recordControl } from '../shared/utils/diagnostic-plans-control.ts'
test('Два независимых контрольных срока, учёт дублей и фильтра периода', () => {
  const checks = komovControls('Комов Сергей Николаевич')
  assert.equal(checks.length, 2)
  assert.equal(komovControls('Комов Иван Николаевич').length, 0)
  const row = {contractNumber:'ДСиР-2025-478',name:'АИС ИССО-Н. Внесение данных',planHours:'2.00',planStart:'2026-11-16',planFinish:'2026-11-20'}
  recordControl(checks,row,'assigned')
  recordControl(checks,row,'searched')
  recordControl(checks,{...row,planHours:'4'},'accepted')
  assert.deepEqual(checks.map(c=>[c.assigned,c.searched,c.accepted]),[[1,1,0],[0,0,0]])
  for(let i=0;i<2;i++)recordControl(checks,{...row,planStart:'2026-11-23',planFinish:'2026-11-27'},'accepted')
  assert.equal(checks[1]!.accepted,2)
})
