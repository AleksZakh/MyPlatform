// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  experimental: {
    serverAppConfig: false
  },
  colorMode: {
    preference: 'light', // Всегда устанавливает светлую тему по умолчанию
    fallback: 'light',   // Если произойдет сбой, вернет светлую тем
    globalName: '__NUXT_COLOR_MODE__',
    componentName: 'ColorScheme',
    classPrefix: '',     // Префикс класса для тега <html> (например, 'light-mode')
    classSuffix: '-mode',
    storage: 'localStorage' // Оставляем стандартный тип, ошибки TS больше нет
  },
  runtimeConfig: {
    // Серверные переменные (доступны только на сервере)
    ad: {
      url: process.env.AD_URL || 'ldap://localhost:389',
      baseDN: process.env.AD_DOMAIN_USERS || 'DC=local,DC=com',
      username: process.env.AD_USERNAME || '',
      password: process.env.AD_PASSWORD || '',
      timeout: parseInt(process.env.AD_TIMEOUT || '5000'),
      databaseUrl: process.env.DATABASE_URL 
    },
    public: {
      cryptoKey: '',
    }
    
  },
  app: {
    head: {
      title: 'NewPlatform', // default fallback title
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
      websocket: true,
      tasks: true // Включает подсистему Nitro Tasks
    },
    storage: {
      // Создаем собственную область хранения под названием 'adCache'
      adCache: {
        driver: 'redis',
        /* Настройки подключения к вашему серверу Redis */
        url: process.env.REDIS_URL || 'redis://localhost:6379', 
        ttl: 900 // Время жизни кэша по умолчанию в секундах (15 минут)
      }
    },
    scheduledTasks: {
      // Обновление кэша каждый час
      '*/60 * * * *': ['ad:refresh-ad-cache']
    }
  },
  vite: {
    optimizeDeps: {
      include: [
        '@internationalized/date',
        '@vue/devtools-core',
        '@vue/devtools-kit',
        '@vueuse/core',
        'axios',
        'crypto-js', // CJS
        'sweetalert2',
        'uuid',
        'zod',
      ]
    },
    resolve: {
      alias: {
        '.prisma/client/index-browser': './node_modules/.prisma/client/index-browser.js',
      },
    },
  },
  css: [
    '~/assets/css/main.css',
    '~/assets/css/scrollbar.css'],
  modules: [
    '@nuxt/ui',
    '@pinia/nuxt',
    'pinia-plugin-persistedstate/nuxt',
    '@nuxt/image',
    'nuxt-auth-utils',
    '@nuxtjs/color-mode'
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