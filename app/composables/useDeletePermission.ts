import { ref, onMounted } from 'vue';

/** Подсказка интерфейса. Сервер DELETE проверяет актуальные права независимо от неё. */
export function useDeletePermission(resource: string) {
  const canDelete = ref(false);
  const refreshDeletePermission = async (): Promise<boolean> => {
    try {
      const result = await $fetch<{ allowed: boolean }>('/api/access/check', {
        query: { resource, action: 'DELETE' },
      });
      canDelete.value = result.allowed === true;
    } catch {
      canDelete.value = false;
    }
    return canDelete.value;
  };
  onMounted(() => { void refreshDeletePermission(); });
  return { canDelete, refreshDeletePermission };
}
