import { onMounted, onBeforeUnmount } from 'vue';

const key = 'space:odis:assignment-updated';
export function publishWorkChange(structureIds?:number[]) {
  window.dispatchEvent(new CustomEvent(key,{detail:structureIds}));
  try {
    localStorage.setItem(key, JSON.stringify({change:crypto.randomUUID(),structureIds}));
  } catch {
    /* Current window was notified. */
  }
}
export function onWorkChange(refresh: (structureIds?:number[]) => void) {
  const fromWindow = (event:Event) => refresh((event as CustomEvent<number[]>).detail);
  const fromTab = (event: StorageEvent) => {
    if (event.key !== key) return;
    let ids:number[]|undefined;
    if (event.newValue?.startsWith('{')) {
      try {
        const value=JSON.parse(event.newValue).structureIds;
        if (Array.isArray(value)) ids=value;
      } catch { /* Older tabs send only the change identifier. */ }
    }
    refresh(ids);
  };
  onMounted(() => {
    window.addEventListener(key, fromWindow);
    window.addEventListener('storage', fromTab);
  });
  onBeforeUnmount(() => {
    window.removeEventListener(key, fromWindow);
    window.removeEventListener('storage', fromTab);
  });
}
