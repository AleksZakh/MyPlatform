import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeLabFilters, labFilterDateError, materialFilterValues, hasLabFilterValue } from '../../shared/utils/lab-filter-values'
import { serializeLabFilterState, deserializeLabFilterState } from '../../shared/utils/lab-filter-storage'
import { buildRegistryFilter, describeRegistryFilters } from '../../server/utils/incoming-control-filter'

test('multiple materials retain exact OR matching and old templates retain substring semantics', () => {
  assert.deepEqual(materialFilterValues([' Асфальт ', 'Бетон', 'Асфальт', '', null]), ['Асфальт', 'Бетон'])
  const multi = buildRegistryFilter({ materialName: ['Асфальт', 'Бетон'] })
  assert.deepEqual(multi.AND, [{ deletedAt: null }, { receiptMaterial: { material: { name: { in: ['Асфальт', 'Бетон'], mode: 'insensitive' } } } }])
  assert.match(JSON.stringify(buildRegistryFilter({ materialName: 'Асфальт' })), /contains/)
  assert.deepEqual(describeRegistryFilters({ materialName: [] }), [])
  assert.deepEqual(describeRegistryFilters({ materialName: ['Асфальт', 'Бетон'] }), ['Материал: Асфальт; Бетон'])
})
test('empty selection is inactive; metadata is not a filter value', () => {
  const value=normalizeLabFilters({ materialName: [], exactFields: ['unknown','objName'] })
  assert.equal(value.materialName,null)
  assert.deepEqual(value.exactFields,['objName'])
  assert.equal(hasLabFilterValue([]),false)
  assert.equal(hasLabFilterValue('  '),false)
})
test('date intervals reject invalid days and reverse order without shifting date boundaries', () => {
  assert.equal(labFilterDateError(normalizeLabFilters({ sDateStart: '2026-11-01', sDateEnd: '2026-11-01' })), '')
  assert.match(labFilterDateError(normalizeLabFilters({ sDateStart: '2026-02-30' })), /корректную/)
  assert.match(labFilterDateError(normalizeLabFilters({ qualiDateStart: '2026-11-02', qualiDateEnd: '2026-11-01' })), /позже/)
})
test('legacy and compressed cookies restore filters, including long Cyrillic material lists', () => {
  const state={ filter: normalizeLabFilters({ materialName: Array.from({length:50},(_,i)=>`Асфальтобетонная смесь АБС SP-${i} по ГОСТ Р 58401.1, изготовитель завод ${i}`) }), isLoaded: false }
  const packed=serializeLabFilterState(state)
  assert.ok(encodeURIComponent(packed).length<3800)
  assert.deepEqual(deserializeLabFilterState(packed),state)
  assert.deepEqual(deserializeLabFilterState(JSON.stringify(state)),state)
  assert.deepEqual(deserializeLabFilterState('corrupt'),{})
  assert.deepEqual(deserializeLabFilterState('lz1.corrupt'),{})
  const excessive=serializeLabFilterState({filter:{objName:'a'.repeat(100000)}})
  assert.deepEqual(deserializeLabFilterState(excessive),{})
})
