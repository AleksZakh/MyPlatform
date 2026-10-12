export default defineNuxtPlugin(() => {
  const colorMode = useColorMode();
  const { user, loggedIn } = useUserSession();
  const { preferences, load } = useUserPreferences();
  watch(() => loggedIn.value ? user.value?.id : null, () => { void load(); }, { immediate: true });
  watch(() => preferences.value.display, value => {
    colorMode.preference = value.contrast === 'high' ? 'light' : value.theme;
    document.documentElement.dataset.spaceContrast = value.contrast;
    document.documentElement.dataset.spaceText = value.textSize;
    document.documentElement.dataset.spaceDensity = value.density;
  }, { immediate: true, deep: true });
});
