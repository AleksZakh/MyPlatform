import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { build } from 'esbuild'
import { ref, reactive, watch, nextTick, effectScope } from 'vue'

async function loadModule(file) {
  const result = await build({ entryPoints: [file], bundle: true, write: false, format: 'esm',
    alias: { '~~': process.cwd() }, plugins: [{ name: 'vue-test-runtime', setup(b) {
      b.onResolve({ filter: /^vue$/ }, () => ({ path: 'vue', namespace: 'test-runtime' }))
      b.onLoad({ filter: /.*/, namespace: 'test-runtime' }, () => ({ contents: 'export const { ref, watch } = globalThis.labThemeTestVue;' }))
    } }] })
  return import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'))
}

test('opening registry editors refreshes recency without triggering the profile theme watcher', async () => {
  const scope = effectScope()
  const session = { user: ref({ id: 1 }), loggedIn: ref(true) }
  const preferences = ref({ display: { theme: 'light', contrast: 'normal', textSize: 'normal', density: 'compact' }, labRecent: {} })
  const mode = reactive({ preference: 'light' })
  let profileLoads = 0
  Object.assign(globalThis, {
    labThemeTestVue: { ref, watch }, useUserSession: () => session,
    useUserPreferences: () => ({ preferences, load: async () => { profileLoads++ } }),
    useColorMode: () => mode, defineNuxtPlugin: fn => fn,
    onNuxtReady: fn => fn(), watch,
    document: { documentElement: { dataset: {} } },
  })
  try {
    const plugin = await loadModule('app/plugins/preferences.client.ts')
    scope.run(() => plugin.default())
    await nextTick()
    const { useLabRecentOptions } = await loadModule('app/composables/useLabRecentOptions.ts')
    mode.preference = 'dark' // User chooses dark locally after loading their profile.
    const originalDisplay = preferences.value.display
    const loadedAtStart = profileLoads
    globalThis.$fetch = async () => ({ display: { theme: 'light' }, labRecent: { plp: ['ПЛП 5'], object: ['СТР Обход Адлера'] } })
    // Both direct edit and view -> edit mount this same form. Reopening must also be safe.
    for (let opening = 0; opening < 3; opening++) {
      const history = scope.run(() => useLabRecentOptions())
      const pending = history.load()
      assert.equal(mode.preference, 'dark')
      await pending
      await nextTick()
      assert.equal(mode.preference, 'dark')
      assert.equal(preferences.value.display, originalDisplay)
      assert.deepEqual(history.recent.value.plp, ['ПЛП 5'])
      assert.deepEqual(history.recent.value.object, ['СТР Обход Адлера'])
    }
    assert.equal(profileLoads, loadedAtStart)
    // Light mode also remains light even if the saved profile reports dark.
    mode.preference = 'light'
    globalThis.$fetch = async () => ({ display: { theme: 'dark' }, labRecent: { plp: ['ПЛП 2'] } })
    const history = scope.run(() => useLabRecentOptions())
    await history.load(); await nextTick()
    assert.equal(mode.preference, 'light')
    mode.preference = 'dark'
    globalThis.$fetch = async () => { throw new Error('offline') }
    await history.load(); await nextTick()
    assert.equal(mode.preference, 'dark')
    assert.deepEqual(history.recent.value.plp, ['ПЛП 2'])
    assert.ok(history.error.value)
    // The regression guard includes the editor's wiring, not just the helper.
    const source = await readFile('app/components/lab/createModal.vue', 'utf8')
    assert.match(source, /loadReferenceData\(\), loadRecentOptions\(\)/)
    assert.doesNotMatch(source, /loadPreferences|useUserPreferences\(/)
  } finally { scope.stop() }
})

test('late history responses cannot cross accounts or overwrite a newer refresh', async () => {
  const scope = effectScope()
  const session = { user: ref({ id: 1 }), loggedIn: ref(true) }
  Object.assign(globalThis, { labThemeTestVue: { ref, watch }, useUserSession: () => session })
  const { useLabRecentOptions } = await loadModule('app/composables/useLabRecentOptions.ts')
  const pending = []
  globalThis.$fetch = () => new Promise(resolve => pending.push(resolve))
  try {
    const history = scope.run(() => useLabRecentOptions())
    const first = history.load()
    session.user.value = { id: 2 }
    const second = history.load()
    pending[0]({ labRecent: { plp: ['Чужой ПЛП'] } }); await first
    assert.deepEqual(history.recent.value, {})
    pending[1]({ labRecent: { plp: ['ПЛП 2'] } }); await second
    assert.deepEqual(history.recent.value.plp, ['ПЛП 2'])
    const older = history.load(), newer = history.load()
    pending[3]({ labRecent: { plp: ['ПЛП 3'] } }); await newer
    pending[2]({ labRecent: { plp: ['ПЛП 1'] } }); await older
    assert.deepEqual(history.recent.value.plp, ['ПЛП 3'])
    const loggedOut = history.load()
    session.loggedIn.value = false
    pending[4]({ labRecent: { plp: ['ПЛП 4'] } }); await loggedOut
    assert.deepEqual(history.recent.value, {})
  } finally { scope.stop() }
})
