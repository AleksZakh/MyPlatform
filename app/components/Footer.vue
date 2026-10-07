<template>
  <UFooter class="bg-sky-100">
    <template #left>
      <div>
        <UColorModeButton class="mr-5" />
      </div>
      <div class="flex items-center gap-0.5 text-sm">
        <p>Copyright</p>
        <Icon name="streamline-freehand-color:form-validation-check-square-1" />
        <p>{{ new Date().getFullYear() }}</p>
      </div>
      <div class="ml-8 flex items-center gap-1 hover:underline ">
        <Icon name="streamline-freehand-color:help-headphones-customer-support-human" size="22"/>
        <a class="hover:decoration-solid" href="mailto:hd@avtodor-eng.ru">Техническая поддержка</a>
      </div>
    </template>

    <!-- <template #default>
      <a
        :href="maxMessengerUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="max-messenger-fixed"
        :class="{ 'max-pulse': isPulsing, 'max-scroll-down': isScrollingDown }"
        title="Написать в MAX"
        aria-label="Написать в MAX"
        @click="pausePulse"
      >
        <span class="max-icon">
          <img :src="maxIconSrc" alt="" width="35" height="35" />
        </span>
      </a>
    </template> -->

    <!-- <UNavigationMenu :items="items" variant="link" /> -->

    <!-- <template #right>

      <button class="p-2 rounded-full hover:bg-gray-200">
        <img src="/Max_logo_black.svg" alt="MAX" class="h-5 w-5" />
      </button>

      <UButton
        color="neutral"
        variant="ghost"
        to="https://go.nuxt.com/discord"
        target="_blank"
        aria-label="Discord"
      />
      
      <UButton
        icon="i-simple-icons-x"
        color="neutral"
        variant="ghost"
        to="https://go.nuxt.com/x"
        target="_blank"
        aria-label="X"
      />
      <UButton
        icon="i-simple-icons-github"
        color="neutral"
        variant="ghost"
        to="https://github.com/nuxt/nuxt"
        target="_blank"
        aria-label="GitHub"
      />
    </template> -->
    <template #right>
      <ChatLauncher />
    </template>
  </UFooter>
</template>
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

// Укажите реальную ссылку на MAX и путь к изображению из public/.
const maxMessengerUrl = '/ссылка на MAX'
const maxIconSrc = '/путь к иконки'

const isPulsing = ref(true)
const isScrollingDown = ref(false)
let pulseTimer: ReturnType<typeof setTimeout> | undefined
let lastScrollTop = 0

function pausePulse() {
  isPulsing.value = false
  if (pulseTimer !== undefined) clearTimeout(pulseTimer)
  pulseTimer = setTimeout(() => {
    isPulsing.value = true
    pulseTimer = undefined
  }, 30_000)
}

function handleScroll() {
  const scrollTop = Math.max(0, window.scrollY)
  isScrollingDown.value = scrollTop > lastScrollTop && scrollTop > 100
  lastScrollTop = scrollTop
}

onMounted(() => {
  lastScrollTop = Math.max(0, window.scrollY)
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onBeforeUnmount(() => {
  if (pulseTimer !== undefined) clearTimeout(pulseTimer)
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
.max-messenger-fixed {
  position: fixed;
  bottom: calc(20px + env(safe-area-inset-bottom, 0px));
  right: calc(20px + env(safe-area-inset-right, 0px));
  z-index: 1000;
  width: 60px;
  height: 60px;
  border-radius: 30%;
  background: linear-gradient(to bottom right, #305ffc, #7936e3, #3dc1fd, #9b57dc);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 15px rgba(255, 45, 85, 0.3);
  cursor: pointer;
  transition: transform 0.3s ease, opacity 0.3s ease, box-shadow 0.3s ease;
  text-decoration: none;
}

.max-scroll-down {
  opacity: 0.7;
  transform: scale(0.9);
}

.max-messenger-fixed:hover {
  opacity: 1;
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(255, 45, 85, 0.4);
}

.max-messenger-fixed:active {
  transform: scale(0.95);
}

.max-messenger-fixed:focus-visible {
  outline: 3px solid #305ffc;
  outline-offset: 4px;
}

.max-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.max-icon img {
  display: block;
  object-fit: contain;
}

.max-pulse {
  animation: max-pulse 2s infinite;
}

@keyframes max-pulse {
  0%, 100% { box-shadow: 0 6px 20px rgb(86 134 242); }
  70% { box-shadow: 0 6px 20px #6c56e9; }
}

@media (max-width: 768px) {
  .max-messenger-fixed {
    width: 56px;
    height: 56px;
    bottom: calc(15px + env(safe-area-inset-bottom, 0px));
    right: calc(15px + env(safe-area-inset-right, 0px));
  }
}

@media (prefers-reduced-motion: reduce) {
  .max-messenger-fixed { transition: none; }
  .max-pulse { animation: none; }
}
</style>
