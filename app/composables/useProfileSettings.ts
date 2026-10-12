import { defaultPreferences } from '~~/shared/utils/user-preferences';
import { normalizeColumns } from './useTableSettings';
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
const confirmReset = ref(false);
const legacyAvailable = ref(false);
onMounted(() => { try { legacyAvailable.value = !!localStorage.getItem('tableSettings'); } catch {} });
async function importLegacy() {
  try {
    const value = JSON.parse(localStorage.getItem('tableSettings') || 'null');
    if (!Array.isArray(value?.visibleColumns)) { notice.value = 'В браузере нет сохранённых колонок.'; return; }
    const columns = normalizeColumns(value.visibleColumns);
    await save({ labTable: { visibleColumns: columns, columnOrder: columns } });
    notice.value = 'Настройки колонок этого браузера перенесены в профиль.';
  } catch { notice.value = 'Не удалось перенести настройки. Попробуйте ещё раз.'; }
}
async function resetTable() { try { await save({ labTable: null }); confirmReset.value = false; notice.value = 'Настройки реестра восстановлены.'; } catch {} }
const notificationFields = [
  { key: 'information' as const, label: 'Информационные подсказки' },
  { key: 'success' as const, label: 'Подтверждения успешных действий' },
  { key: 'chatPopup' as const, label: 'Всплывающие уведомления о новых сообщениях' },
  { key: 'chatSound' as const, label: 'Звук нового сообщения' },
];

return { user, preferences, ready, busy, error, load, draft, notice, apply, defaults, confirmReset, resetTable, notificationFields, legacyAvailable, importLegacy };
}
