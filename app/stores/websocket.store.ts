import { defineStore } from 'pinia';
export interface OnlineUser { id: string; login: string; name: string; status: 'online' | 'away' }
// Transport lives in the client plugin; Pinia contains only serializable UI state.
export const useWebSocketStore = defineStore('websocket', () => {
  const connectionStatus = ref<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const chatRevision = ref(0);
  const users = ref<OnlineUser[]>([]);
  const isConnected = computed(() => connectionStatus.value === 'connected');
  return { connectionStatus, users, isConnected, chatRevision };
});
