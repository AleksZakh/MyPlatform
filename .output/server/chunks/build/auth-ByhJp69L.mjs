import { y as defineNuxtRouteMiddleware, w as useFetch, A as navigateTo } from './server.mjs';
import 'vue';
import '../nitro/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:crypto';
import 'stream';
import 'events';
import 'http';
import 'crypto';
import 'buffer';
import 'zlib';
import 'https';
import 'net';
import 'tls';
import 'url';
import 'node:events';
import 'node:buffer';
import 'ioredis';
import 'node:fs';
import 'node:path';
import 'activedirectory2';
import 'node:url';
import '@iconify/utils';
import 'consola';
import 'ipx';
import 'pinia';
import 'vue-router';
import 'perfect-debounce';
import '@vue/shared';
import '@iconify/vue';
import 'tailwindcss/colors';
import 'vue/server-renderer';
import '@vueuse/core';
import '@vueuse/shared';
import 'tailwind-variants';
import '@iconify/utils/lib/css/icon';
import '../routes/renderer.mjs';
import 'vue-bundle-renderer/runtime';
import 'unhead/server';
import 'devalue';
import 'unhead/plugins';
import 'unhead/utils';

const auth = defineNuxtRouteMiddleware((to, from) => {
  const { data, error } = useFetch(
    "/api/auth/me",
    "$o_1eWOeux6"
    /* nuxt-injected */
  );
  if (data.value) {
    console.log("Данные пользователя на сервере:", data.value);
  }
  if (error.value) {
    console.error("Ошибка на сервере:", error.value.statusMessage);
    return navigateTo("/login");
  }
});

export { auth as default };
//# sourceMappingURL=auth-ByhJp69L.mjs.map
