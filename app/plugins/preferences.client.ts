export default defineNuxtPlugin(() => {
  const colorMode = useColorMode();
  const { user, loggedIn } = useUserSession();
  const { preferences, load } = useUserPreferences();

  // Начинаем менять состояние после завершения гидратации.
  onNuxtReady(() => {
    watch(
      () => loggedIn.value ? user.value?.id : null,
      () => {
        void load();
      },
      { immediate: true },
    );

    watch(
      () => preferences.value.display,
      (value) => {
        colorMode.preference =
          value.contrast === 'high' ? 'light' : value.theme;

        const root = document.documentElement;

        root.dataset.spaceContrast = value.contrast;
        root.dataset.spaceText = value.textSize;
        root.dataset.spaceDensity = value.density;
      },
      { immediate: true, deep: true },
    );
  });
});