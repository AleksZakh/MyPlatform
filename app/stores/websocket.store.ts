// store/websocket.store.ts
import { defineStore } from 'pinia';

interface WebSocketMessage {
  type: string;
  data?: any;
}

export const useWebSocketStore = defineStore('websocket', {
  state: () => ({
    ws: null as WebSocket | null,
    isConnected: false,
    lastMessage: null as any,
    error: null as string | null,
    connectionStatus: 'disconnected' as
      'connected' | 'connecting' | 'disconnected' | 'error',
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
  }),

  actions: {
    // Инициализация WebSocket соединения
    connect(sessionId: string) {
      // Закрываем существующее соединение
      this.disconnect();

      // Сбрасываем состояние
      this.setConnecting();
      this.error = null;

      try {
        const wsUrl = `ws://localhost:5050?sessionId=${encodeURIComponent(sessionId)}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = (event: Event) => {
          console.log('✅ WebSocket connected successfully');
          this.setConnected(true);
          this.reconnectAttempts = 0; // Сбрасываем счетчик переподключений
        };

        this.ws.onmessage = (event: MessageEvent) => {
          console.log('📨 Received:', event.data);
          this.setLastMessage(event.data);
          // Здесь можно добавить дополнительную обработку сообщений
        };

        this.ws.onerror = (event: Event) => {
          console.error('❌ WebSocket error:', event);
          this.setError('Connection error');
        };

        this.ws.onclose = (event: CloseEvent) => {
          console.log('🔌 WebSocket disconnected');
          this.setConnected(false);

          // Автоматическое переподключение при неожиданном закрытии
          if (
            !event.wasClean &&
            this.reconnectAttempts < this.maxReconnectAttempts
          ) {
            this.handleReconnection(sessionId);
          }
        };
      } catch (err) {
        console.error('❌ Failed to create WebSocket connection:', err);
        this.setError('Failed to create connection');
      }
    },

    // Отправка сообщения через WebSocket
    send(message: WebSocketMessage | string) {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        console.error('WebSocket is not connected');
        return false;
      }

      try {
        const dataToSend =
          typeof message === 'string' ? message : JSON.stringify(message);
        this.ws.send(dataToSend);
        return true;
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        this.setError('Failed to send message');
        return false;
      }
    },

    // Закрытие соединения
    disconnect() {
      if (this.ws) {
        // Убираем обработчики чтобы предотвратить автоматическое переподключение
        this.ws.onclose = null;
        this.ws.close();
        this.ws = null;
      }
      this.setConnected(false);
      this.reconnectAttempts = 0;
      console.log('WebSocket connection closed');
    },

    // Обработка переподключения
    handleReconnection(sessionId: string) {
      this.reconnectAttempts++;
      console.log(
        `Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
      );

      setTimeout(() => {
        if (this.reconnectAttempts <= this.maxReconnectAttempts) {
          this.connect(sessionId);
        }
      }, 3000 * this.reconnectAttempts); // Экспоненциальная задержка
    },

    // Старые методы для совместимости
    setConnected(status: boolean) {
      this.isConnected = status;
      this.connectionStatus = status ? 'connected' : 'disconnected';
    },

    setConnecting() {
      this.connectionStatus = 'connecting';
    },

    setError(error: string) {
      this.error = error;
      this.connectionStatus = 'error';
    },

    setLastMessage(message: any) {
      this.lastMessage = message;
    },
  },

  getters: {
    // Основные геттеры
    isConnecting: (state) => state.connectionStatus === 'connecting',
    hasError: (state) => state.connectionStatus === 'error',

    // Геттер для проверки состояния WebSocket
    readyState: (state) => {
      if (!state.ws) return WebSocket.CLOSED;
      return state.ws.readyState;
    },

    // Геттер для удобной проверки возможности отправки сообщений
    canSend: (state) => {
      return state.ws && state.ws.readyState === WebSocket.OPEN;
    },
  },
});
