import { ref, readonly } from 'vue';
import { requestDeletionReason, deletionErrorMessage } from './useDeletionReason';
import { useDeletePermission } from './useDeletePermission';

export interface DeleteOptions {
  id: number;
  recordName?: string;
  additionalInfo?: string;
  onSuccess?: () => void | Promise<void>;
  onError?: (error: string) => void;
}
export const useRecordDelete = () => {
  const toast = useToast();
  const loading = ref(false);
  const { canDelete, refreshDeletePermission } = useDeletePermission('lab.sampling-tests');
  const deleteRecord = async (options: DeleteOptions): Promise<boolean> => {
    if (loading.value) return false;
    loading.value = true;
    try {
      if (!await refreshDeletePermission()) throw new Error('Право удаления отсутствует или не удалось проверить доступ.');
      const reason = requestDeletionReason(options.recordName || `Запись №${options.id}`);
      if (reason === null) return false;
      const result = await $fetch<{ success: boolean; message?: string }>(`/api/incoming-control/${options.id}`, {
        method: 'DELETE', body: { reason },
      });
      if (!result.success) throw new Error(result.message || 'Удаление не выполнено.');
      toast.add({ title: 'Запись удалена', description: result.message, color: 'success' });
    } catch (error) {
      const message = deletionErrorMessage(error);
      toast.add({ title: 'Удаление не выполнено', description: message, color: 'error' });
      options.onError?.(message);
      return false;
    } finally { loading.value = false; }
    // Ошибка перезагрузки таблицы не означает ошибку уже выполненного удаления.
    try { await options.onSuccess?.(); }
    catch { toast.add({ title: 'Запись удалена', description: 'Не удалось обновить список. Обновите страницу.', color: 'warning' }); }
    return true;
  };
  const deleteRecordWithRefresh = (id: number, recordName?: string, refreshCallback?: () => Promise<void>) =>
    deleteRecord({ id, recordName, onSuccess: refreshCallback });
  return { loading: readonly(loading), canDelete, refreshDeletePermission, deleteRecord, deleteRecordWithRefresh };
};
