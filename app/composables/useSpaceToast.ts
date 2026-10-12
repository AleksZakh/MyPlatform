import { allowNotification } from '~~/shared/utils/user-preferences';
export function useSpaceToast() {
  const toast = useToast();
  const { preferences } = useUserPreferences();
  const recent = useState<Record<string, { id: string | number; at: number }>>('space-toast-recent', () => ({}));
  function add(options: Parameters<typeof toast.add>[0]) {
    if (!allowNotification(preferences.value.notifications, options.color)) return { ...options, id: 'suppressed', open: false };
    const key = JSON.stringify([options.color, options.title, options.description]);
    const now = Date.now();
    for (const [k, v] of Object.entries(recent.value)) if (now - v.at > 3000) delete recent.value[k];
    const previous = recent.value[key];
    if (previous) return { ...options, id: previous.id, open: true };
    const result = toast.add(options); recent.value[key] = { id: result.id, at: now }; return result;
  }
  return { ...toast, add };
}
