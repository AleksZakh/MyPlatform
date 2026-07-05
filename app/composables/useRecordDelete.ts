// composables/useRecordDelete.ts
import { ref, readonly } from 'vue'
import ConfirmDialog from '~/components/ConfirmDialog.vue'

export interface DeleteOptions {
  id: number
  recordName?: string
  additionalInfo?: string
  onSuccess?: () => void
  onError?: (error: string) => void
}

export const useRecordDelete = () => {
    const toast = useToast()
    const overlay = useOverlay() // Используем стандартный хук
    const loading = ref(false)

    // ======= ФУНКЦИЯ ПОДТВЕРЖДЕНИЯ =======
    const confirmDelete = (options: DeleteOptions): Promise<boolean> => {
        console.log(`⚠️ Подтверждение удаления записи с ID: ${options.id}`, options)
        return new Promise((resolve) => {
            // Создаем экземпляр оверлея
            const modalInstance = overlay.create(ConfirmDialog, {
                // В Nuxt UI v3 все аргументы и коллбеки событий идут строго в секцию props!
                props: {
                    title: '🗑️ Подтверждение удаления',
                    description: `Вы уверены, что хотите удалить запись ${options.recordName ? `"${options.recordName}"` : ''}?`,
                    content: options.additionalInfo || 'Это действие нельзя будет отменить.',
                    confirmText: 'Удалить',
                    cancelText: 'Отмена',
                    
                    // Эмиты дочернего компонента автоматически превращаются в on[EventName]
                    onConfirm: () => {
                        resolve(true)
                        modalInstance.close() // Закрываем окно
                    },
                    onCancel: () => {
                        resolve(false)
                        modalInstance.close()
                    },
                    onClose: () => {
                        resolve(false)
                        modalInstance.close()
                    }
                }
            })

            // Физически открываем созданное окно
            modalInstance.open()
        })
    }

    // ======= ОСНОВНАЯ ФУНКЦИЯ УДАЛЕНИЯ =======
    const deleteRecord = async (options: DeleteOptions): Promise<boolean> => {
        const confirmed = await confirmDelete(options)
        if (!confirmed) return false

        loading.value = true
        try {
            console.log(`🗑️ Удаление записи с ID: ${typeof options.id }`, options)
            const response = await fetch(`/api/incoming-control/${options.id}`, {
                method: 'DELETE'
            })
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
            
            const result = await response.json()

            if (result.success) {
                toast.add({
                    title: '✅ Успешно удалено',
                    description: result.message || `Запись успешно удалена`,
                    color: 'success'
                })
                if (options.onSuccess) options.onSuccess()
                return true
            } else {
                throw new Error(result.error || 'Ошибка при удалении')
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка'
            toast.add({
                title: '❌ Ошибка при удалении',
                description: errorMessage,
                color: 'error'
            })
            if (options.onError) options.onError(errorMessage)
            return false
        } finally {
            loading.value = false
        }
    }

    const deleteRecordWithRefresh = async (
        id: number, 
        recordName?: string,
        refreshCallback?: () => Promise<void>
    ): Promise<boolean> => {
        return await deleteRecord({
            id,
            recordName,
            onSuccess: async () => {
                if (refreshCallback) await refreshCallback()
            }
        })
    }

    return {
        loading: readonly(loading),
        deleteRecordWithRefresh
    }
}
