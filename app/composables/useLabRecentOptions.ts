import { ref, watch } from 'vue'
import { normalizePreferences, type UserPreferences } from '~~/shared/utils/user-preferences'
import type { LabRecentOptions } from '~~/shared/utils/lab-recent-options'

/** A registry form refreshes its choices without reapplying global display settings. */
export function useLabRecentOptions() {
  const { user, loggedIn } = useUserSession()
  const recent = ref<LabRecentOptions>({})
  const error = ref('')
  const identity = () => loggedIn.value ? user.value?.id ?? null : null
  let request = 0

  watch(identity, () => {
    request++
    recent.value = {}
    error.value = ''
  }, { flush: 'sync' })

  async function load() {
    const id = identity()
    const current = ++request
    error.value = ''
    if (id === null) return
    try {
      const data = await $fetch<UserPreferences>('/api/profile/preferences')
      if (current !== request || identity() !== id) return
      recent.value = normalizePreferences(data).labRecent
    } catch {
      if (current === request && identity() === id) {
        error.value = 'Не удалось обновить порядок списков. Доступен поиск по справочникам.'
      }
    }
  }

  return { recent, error, load }
}
