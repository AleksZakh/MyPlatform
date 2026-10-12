import { defaultPreferences, normalizePreferences, type UserPreferences } from '~~/shared/utils/user-preferences';
export function useUserPreferences() {
  const { user, loggedIn } = useUserSession();
  const preferences = useState<UserPreferences>('space-preferences', defaultPreferences);
  const ready = useState('space-preferences-ready', () => false);
  const busy = useState('space-preferences-busy', () => false);
  const error = useState('space-preferences-error', () => '');
  const owner = useState<number | null>('space-preferences-owner', () => null);
  const identity = () => loggedIn.value ? user.value?.id || null : null;
  function cache() {
    if (!import.meta.client || !owner.value) return;
    try { localStorage.setItem(`space:preferences:v1:${owner.value}`, JSON.stringify(preferences.value)); } catch { /* Cache is optional. */ }
  }
  async function load() {
    const id = identity(); owner.value = id; ready.value = false; error.value = '';
    preferences.value = defaultPreferences();
    if (!id) return;
    if (import.meta.client) {
      try { preferences.value = normalizePreferences(JSON.parse(localStorage.getItem(`space:preferences:v1:${id}`) || 'null')); } catch { /* Invalid cache. */ }
    }
    try {
      const data = await $fetch<UserPreferences>('/api/profile/preferences');
      if (identity() !== id || owner.value !== id) return;
      preferences.value = normalizePreferences(data); ready.value = true; cache();
    } catch { if (identity() === id) error.value = 'Не удалось загрузить настройки. Повторите попытку.'; }
  }
  async function save(patch: Partial<UserPreferences>) {
    const id = identity();
    if (!id || owner.value !== id || !ready.value) throw new Error('Настройки ещё не загружены.');
    if (busy.value) throw new Error('Дождитесь сохранения предыдущих изменений.');
    busy.value = true; error.value = '';
    try {
      const data = await $fetch<UserPreferences>('/api/profile/preferences', { method: 'PATCH', headers: { 'x-space-preferences': '1' }, body: patch });
      if (identity() !== id || owner.value !== id) return;
      preferences.value = normalizePreferences(data); cache();
    } catch (e) { if (identity() === id) error.value = 'Не удалось сохранить настройки. Попробуйте ещё раз.'; throw e; }
    finally { busy.value = false; }
  }
  return { preferences, ready, busy, error, load, save };
}
