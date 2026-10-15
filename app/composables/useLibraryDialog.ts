/** Keep keyboard focus inside the active library dialog and restore it on close. */
export function useLibraryDialog(close: () => void) {
  let previous: HTMLElement | null = null;
  let dialog: HTMLElement | null = null;
  const focusable = () =>
    Array.from(
      dialog?.querySelectorAll<HTMLElement>(
        'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
      ) || [],
    ).filter((el) => el.getClientRects().length);
  const key = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
    if (event.key !== "Tab") return;
    const controls = focusable();
    const first = controls[0];
    const last = controls.at(-1);
    if (!first) {
      event.preventDefault();
      return;
    }
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  onMounted(() => {
    previous = document.activeElement as HTMLElement;
    dialog =
      Array.from(document.querySelectorAll<HTMLElement>(".library-dialog")).at(
        -1,
      ) || null;
    focusable()[0]?.focus();
    document.addEventListener("keydown", key);
  });
  onBeforeUnmount(() => {
    document.removeEventListener("keydown", key);
    previous?.focus();
  });
}
