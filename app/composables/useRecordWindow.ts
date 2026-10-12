export function useRecordWindow() {
  const { preferences } = useUserPreferences();
  const expanded = ref(preferences.value.display.expandedForms);
  watch(() => preferences.value.display.expandedForms, value => { expanded.value = value; });
  return { expanded };
}
