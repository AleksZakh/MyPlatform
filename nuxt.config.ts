// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  experimental: {
    serverAppConfig: false
  },
  app: {
    head: {
      title: 'Первое приложение', // default fallback title
      htmlAttrs: {
        lang: 'ru',
      },
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/logo_logo.svg' },
      ],
    },
  },
  nitro: {
    experimental: {
      websocket: true
    },
    storage: {
      // Создаем собственную область хранения под названием 'adCache'
      adCache: {
        driver: 'redis',
        /* Настройки подключения к вашему серверу Redis */
        url: process.env.REDIS_URL || 'redis://localhost:6379', 
        ttl: 900 // Время жизни кэша по умолчанию в секундах (15 минут)
      }
    }
  },
  vite: {
    optimizeDeps: {
      include: [
        '@vue/devtools-core',
        '@vue/devtools-kit',
        'uuid',
        'sweetalert2',
        'axios',
      ]
    },
    resolve: {
      alias: {
        '.prisma/client/index-browser': './node_modules/.prisma/client/index-browser.js',
      },
    },
  },
  css: ['~/assets/css/main.css'],
  modules: [
    '@nuxt/ui',
    '@pinia/nuxt',
    'pinia-plugin-persistedstate/nuxt',
    '@nuxt/image',
    'nuxt-auth-utils',
  ],
  // Опциональная настройка auth-utils
  auth: {
      // Меняем название куки (опционально)
      cookieName: 'userSession',
      // Время жизни сессии (по умолчанию 60*60*24*7 = 7 дней)
      maxAge: 60 * 60 * 24 * 7,
      // Защита от CSRF
      csrf: {
          enabled: true
      }
  }
})