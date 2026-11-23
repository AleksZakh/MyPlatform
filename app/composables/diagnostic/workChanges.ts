import { onMounted, onBeforeUnmount } from 'vue';

const key = 'space:odis:assignment-updated';
export function publishWorkChange() {
  window.dispatchEvent(new Event(key));
  try {
    localStorage.setItem(key, crypto.randomUUID());
  } catch {
    /* Current window was notified. */
  }
}
export function onWorkChange(refresh: () => void) {
  const fromTab = (event: StorageEvent) => {
    if (event.key === key) refresh();
  };
  onMounted(() => {
    window.addEventListener(key, refresh);
    window.addEventListener('storage', fromTab);
  });
  onBeforeUnmount(() => {
    window.removeEventListener(key, refresh);
    window.removeEventListener('storage', fromTab);
  });
}
