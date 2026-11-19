import { defaultPreferences } from '~~/shared/utils/user-preferences';
export function useProfileSettings() {
const { user } = useUserSession();
const { preferences, ready, busy, error, load, save } = useUserPreferences();
const draft = ref(defaultPreferences());
const notice = ref('');
watch([ready, preferences], () => { if (ready.value) draft.value = structuredClone(toRaw(preferences.value)); }, { immediate: true });
async function apply() {
  notice.value = '';
  try { await save({ display: draft.value.display, notifications: draft.value.notifications }); notice.value = 'Настройки применены и сохранены в вашем профиле.'; } catch { /* Persistent error below. */ }
}
function defaults() { const values = defaultPreferences(); draft.value.display = values.display; draft.value.notifications = values.notifications; notice.value = 'Выбраны настройки по умолчанию. Нажмите «Применить».'; }
const notificationFields = [
  { key: 'information' as const, label: 'Информационные подсказки' },
  { key: 'success' as const, label: 'Подтверждения успешных действий' },
  { key: 'chatPopup' as const, label: 'Всплывающие уведомления о новых сообщениях' },
  { key: 'chatSound' as const, label: 'Звук нового сообщения' },
];

return { user, preferences, ready, busy, error, load, draft, notice, apply, defaults, notificationFields };
}
