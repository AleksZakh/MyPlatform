import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeLabFilters, filterSelectionValues } from '../../shared/utils/lab-filter-values'
import { serializeLabFilterState, deserializeLabFilterState } from '../../shared/utils/lab-filter-storage'
import { buildRegistryFilter, describeRegistryFilters } from '../../server/utils/incoming-control-filter'

test('place selections survive normalization, templates and persisted state without sharing arrays', () => {
  const template = { sPlace: [' ОП 1 ', 'ОП 2', 'ОП 1', ''], materialName: ['Бетон'], exactFields: ['objName'] }
  const filter = normalizeLabFilters(template)
  assert.deepEqual(filter.sPlace, ['ОП 1', 'ОП 2'])
  assert.deepEqual(filter.materialName, ['Бетон'])
  assert.notEqual(filter.sPlace, template.sPlace)
  const state = { filter, isLoaded: false }
  assert.deepEqual(deserializeLabFilterState(serializeLabFilterState(state)), state)
  assert.deepEqual(deserializeLabFilterState(JSON.stringify(state)), state)
  assert.deepEqual(filterSelectionValues([]), [])
  assert.equal(normalizeLabFilters({ sPlace: [] }).sPlace, null)
})

test('old substring and exact place filters retain their meaning', () => {
  const old = normalizeLabFilters({ sPlace: 'ОП 1' })
  const exact = normalizeLabFilters({ sPlace: 'ОП 1', exactFields: ['sPlace'] })
  assert.equal(old.sPlace, 'ОП 1')
  assert.deepEqual(buildRegistryFilter(old as any).AND, [{ deletedAt: null }, { testLocation: { name: { contains: 'ОП 1', mode: 'insensitive' } } }])
  assert.deepEqual(buildRegistryFilter(exact as any).AND, [{ deletedAt: null }, { testLocation: { name: { equals: 'ОП 1', mode: 'insensitive' } } }])
})

test('multiple places are exact alternatives, combined with materials by AND and described separately', () => {
  const filters = { sPlace: ['ОП 1', 'ОП 2'], materialName: ['Бетон', 'Песок'] }
  assert.deepEqual(buildRegistryFilter(filters).AND, [
    { deletedAt: null },
    { testLocation: { name: { in: ['ОП 1', 'ОП 2'], mode: 'insensitive' } } },
    { receiptMaterial: { material: { name: { in: ['Бетон', 'Песок'], mode: 'insensitive' } } } },
  ])
  assert.deepEqual(describeRegistryFilters(filters), ['Место отбора: ОП 1; ОП 2', 'Материал: Бетон; Песок'])
  assert.deepEqual(describeRegistryFilters({ sPlace: [] }), [])
})
