<template>
  <div class="access-denied-container">
    <div class="access-denied-card">
      <!-- Иконка замка -->
      <div class="icon-wrapper">
        <svg 
          class="lock-icon" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            stroke-linecap="round" 
            stroke-linejoin="round" 
            stroke-width="2" 
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      </div>

      <!-- Заголовок -->
      <h1 class="title">Доступ запрещён</h1>

      <!-- Сообщение об ошибке -->
      <p class="message">
        У вас недостаточно прав для доступа к этой странице.
      </p>

      <!-- Дополнительная информация -->
      <p class="submessage" v-if="errorDetails">
        {{ errorDetails }}
      </p>

      <!-- Кнопки действий -->
      <div class="actions">
        <button @click="goBack" class="btn btn-secondary">
          ← Вернуться назад
        </button>
        
        <button @click="goHome" class="btn btn-primary">
          На главную
        </button>

        <button @click="requestAccess" class="btn btn-outline" v-if="showRequestAccess">
          Запросить доступ
        </button>
      </div>

      <!-- Код ошибки -->
      <div class="error-code" v-if="errorCode">
        Код ошибки: {{ errorCode }}
      </div>
    </div>
  </div>
</template>

<script setup>
// Определение пропсов с дефолтными значениями для Nuxt
const props = defineProps({
  errorDetails: {
    type: String,
    default: ''
  },
  errorCode: {
    type: String,
    default: '403'
  },
  showRequestAccess: {
    type: Boolean,
    default: true
  }
})

definePageMeta({
    public: true // ✅ Указываем, что страница публичная
});

// Использование Nuxt composables
const router = useRouter()

// Функция возврата на предыдущую страницу
const goBack = () => {
  router.back()
}

// Функция перехода на главную страницу
const goHome = () => {
  navigateTo('/')
}

// Функция запроса доступа с использованием Nuxt $fetch
const requestAccess = async () => {
  try {
    // Пример отправки запроса на API
    await $fetch('/api/request-access', {
      method: 'POST',
      body: {
        path: useRoute().fullPath,
        timestamp: new Date().toISOString()
      }
    })
    
    // Использование Nuxt toast или уведомлений
    const { toast } = useToast() // если используется модуль уведомлений
    toast?.success('Запрос на доступ отправлен администратору')
    
    // Или просто alert для демонстрации
    alert('Запрос на доступ отправлен. Администратор рассмотрит его в ближайшее время.')
  } catch (error) {
    console.error('Ошибка при отправке запроса:', error)
    alert('Произошла ошибка при отправке запроса. Пожалуйста, попробуйте позже.')
  }
}

// SEO метатеги для Nuxt
useHead({
  title: 'Доступ запрещён',
  meta: [
    { name: 'robots', content: 'noindex, nofollow' },
    { name: 'description', content: 'У вас недостаточно прав для доступа к этой странице' }
  ]
})
</script>

<style scoped>
.access-denied-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.access-denied-card {
  max-width: 500px;
  width: 100%;
  background: white;
  border-radius: 20px;
  padding: 40px;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: fadeInUp 0.6s ease-out;
}

.icon-wrapper {
  margin-bottom: 24px;
}

.lock-icon {
  width: 80px;
  height: 80px;
  color: #ef4444;
  animation: shake 0.5s ease-in-out;
}

.title {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 16px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.message {
  font-size: 16px;
  color: #6b7280;
  margin-bottom: 12px;
  line-height: 1.5;
}

.submessage {
  font-size: 14px;
  color: #9ca3af;
  margin-bottom: 32px;
  font-style: italic;
}

.actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 24px;
}

.btn {
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: inherit;
}

.btn-primary {
  background: #4f46e5;
  color: white;
}

.btn-primary:hover {
  background: #4338ca;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
}

.btn-secondary {
  background: #6b7280;
  color: white;
}

.btn-secondary:hover {
  background: #4b5563;
  transform: translateY(-2px);
}

.btn-outline {
  background: transparent;
  color: #4f46e5;
  border: 2px solid #4f46e5;
}

.btn-outline:hover {
  background: #4f46e5;
  color: white;
  transform: translateY(-2px);
}

.btn:active {
  transform: translateY(0);
}

.error-code {
  font-size: 12px;
  color: #d1d5db;
  font-family: monospace;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

/* Анимации */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes shake {
  0%, 100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-5px);
  }
  75% {
    transform: translateX(5px);
  }
}

/* Адаптивность */
@media (max-width: 640px) {
  .access-denied-card {
    padding: 30px 20px;
  }
  
  .title {
    font-size: 24px;
  }
  
  .lock-icon {
    width: 60px;
    height: 60px;
  }
  
  .btn {
    padding: 8px 16px;
    font-size: 13px;
  }
}

/* Поддержка тёмной темы */
@media (prefers-color-scheme: dark) {
  .access-denied-card {
    background: #1f2937;
  }
  
  .title {
    color: #f3f4f6;
  }
  
  .message {
    color: #9ca3af;
  }
  
  .error-code {
    border-top-color: #374151;
  }
}
</style>