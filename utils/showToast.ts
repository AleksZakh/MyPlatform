import { useToastStore } from '../app/stores/toast.store';
const toastStore = useToastStore();
const toastId = Math.random().toString();

export default function showToast(content: string, typeMsg: string) {
  toastStore.addToast({
    id: toastId,
    title: 'Уведомление!',
    description: content,
    type: typeMsg,
  });
}
