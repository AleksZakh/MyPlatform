// composables/useRecordUpdate.ts

export interface UpdateOptions {
  id: number;
  data: Record<string, any>;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export const useRecordUpdate = () => {
  const toast = useToast();
  const loading = ref(false);

  const updateRecord = async (options: UpdateOptions): Promise<boolean> => {
    loading.value = true;

    try {
      const response = await fetch(`/api/incoming-control/${options.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options.data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        toast.add({
          title: '✅ Успешно обновлено',
          description: result.message || `Запись успешно обновлена`,
          color: 'success',
          icon: 'i-heroicons-check-circle',
          duration: 3000,
        });

        if (options.onSuccess) {
          options.onSuccess();
        }

        return true;
      } else {
        throw new Error(result.error || 'Ошибка при обновлении');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Неизвестная ошибка';

      toast.add({
        title: '❌ Ошибка при обновлении',
        description: errorMessage,
        color: 'error',
        icon: 'i-heroicons-exclamation-triangle',
        duration: 5000,
      });

      if (options.onError) {
        options.onError(errorMessage);
      }

      return false;
    } finally {
      loading.value = false;
    }
  };

  return {
    loading: readonly(loading),
    updateRecord,
  };
};
