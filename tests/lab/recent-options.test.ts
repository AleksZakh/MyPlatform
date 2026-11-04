import test from 'node:test'
import assert from 'node:assert/strict'
import { rememberLabOptions, sortLabOptions } from '../../shared/utils/lab-recent-options'
import { defaultPreferences, normalizePreferences, preferencesPatchSchema } from '../../shared/utils/user-preferences'

test('recent options follow save order, deduplicate and do not reintroduce deleted catalog entries', () => {
  let recent = rememberLabOptions({}, { object: 'СТР Обход Адлера', location: 'ОП14', manufacturer: 'Завод 1' })
  recent = rememberLabOptions(recent, { object: 'Мост', location: 'ОП13' })
  recent = rememberLabOptions(recent, { object: 'СТР Обход Адлера', manufacturer: '' })
  assert.deepEqual(recent.object, ['СТР Обход Адлера', 'Мост'])
  assert.deepEqual(recent.location, ['ОП13', 'ОП14'])
  assert.deepEqual(recent.manufacturer, ['Завод 1'])
  const catalog = ['А', 'СТР Обход Адлера', 'Б', 'Мост', 'А']
  assert.deepEqual(sortLabOptions(catalog, recent.object), ['СТР Обход Адлера', 'Мост', 'А', 'Б'])
  assert.deepEqual(sortLabOptions(['ОП14'], recent.location), ['ОП14'])
  assert.equal(catalog.length, 5)
})

test('history is bounded and existing profile settings remain compatible', () => {
  let recent = {}
  for (let i = 0; i < 75; i++) recent = rememberLabOptions(recent, { plp: `ПЛП ${i}` })
  const original = defaultPreferences()
  original.display.theme = 'dark'
  original.notifications.success = false
  original.labRecent = recent
  const normalized = normalizePreferences(original)
  assert.equal(normalized.labRecent.plp?.length, 50)
  assert.equal(normalized.labRecent.plp?.[0], 'ПЛП 74')
  assert.equal(normalized.display.theme, 'dark')
  assert.equal(normalized.notifications.success, false)
  const { labRecent: _, ...legacy } = original
  assert.deepEqual(normalizePreferences(legacy).labRecent, {})
  assert.equal(normalizePreferences(legacy).display.theme, 'dark')
  // History is server-owned; profile PATCH cannot submit someone else's history.
  assert.equal(preferencesPatchSchema.safeParse({ labRecent: recent }).success, false)
})
