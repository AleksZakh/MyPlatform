<!-- Контент для третьей вкладки -->
<template>
  <UTabs
    :items="items"
    orientation="vertical"
    class="vertical-tabs"
    color="info"
    variant="link"
    :ui="{
      trigger: 'flex items-center px-4 py-8 max-w-20 flex-col',
      content: 'relative p-2 bg-white rounded-xl shadow-sm min-h-150',
      indicator: 'absolute transition-all duration-300',
      leadingIcon: 'w-5 h-5 size-10',                  // иконка внутри триггера
    }"
  >
    <!-- Слот для вкладки "Аккаунт" -->
    <template #account>
      <div class="p-4 bg-blue-50 rounded">
        <h3 class="text-lg font-bold">Личная информация</h3>
        <p>Email: user@example.com</p>
        <p>Имя: Иван Иванов</p>
        <UButton>Редактировать</UButton>
      </div>
    </template>

    <!-- Слот для вкладки "Настройки" -->
    <template #settings>
      <div class="p-4 bg-green-50 rounded">
        <h3 class="text-lg font-bold">Настройки приложения</h3>
        <div class="space-y-2">
        </div>
      </div>
    </template>

    <!-- Слот для вкладки "Уведомления" -->
    <template #notifications>
      <div class="p-4 bg-yellow-50 rounded">
        <h3 class="text-lg font-bold">Последние уведомления</h3>
        <ul>
          <li>🔔 Новое сообщение</li>
          <li>⭐ Обновление системы</li>
        </ul>
      </div>
    </template>
  </UTabs>
</template>

<script setup lang="ts">
const items = [
  {
    label: 'ПЛП',
    icon: 'streamline:shipping-transfer-truck-time-truck-shipping-delivery-time-waiting-delay',
    slot: 'account'  // ← имя слота
  },
  {
    label: 'Материалы',
    icon: 'game-icons:concrete-bag',
    slot: 'settings'  // ← имя слота
  },
  {
    label: 'Объекты',
    icon: 'streamline-freehand-color:worldwide-web-location-pin',
    slot: 'notifications'  // ← имя слота
  }
];
</script>

<style scoped>
/* Для табов только в этом компоненте */
.vertical-tabs .tab-trigger {
    writing-mode: vertical-rl;
    transform: rotate(180deg);
}
</style>

