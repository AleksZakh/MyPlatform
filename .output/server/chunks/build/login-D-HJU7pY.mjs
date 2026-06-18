import { defineComponent, ref, withAsyncContext, watch, mergeProps, unref, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderAttr, ssrInterpolate } from 'vue/server-renderer';
import { u as useToastStore } from './toast.store-CQzze3R7.mjs';
import { q as useSeoMeta, r as useIsLoadingStore, s as useAuthStore, v as useUserSession, b as useRouter, w as useFetch } from './server.mjs';
import axios, { isAxiosError } from 'axios';
import { _ as _export_sfc } from './_plugin-vue_export-helper-1tPrXgE0.mjs';
import 'pinia';
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
import 'vue-router';
import 'perfect-debounce';
import '@vue/shared';
import '@iconify/vue';
import 'tailwindcss/colors';
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

const useAuth = () => {
  const isLoading = ref(false);
  const error = ref(null);
  const login2 = async (credentials) => {
    isLoading.value = true;
    error.value = null;
    try {
      console.log("Попытка входа с данными:", credentials.login);
      const response = await axios.post("/api/auth/login", credentials);
      console.log("response: ", response);
      return { success: true, data: response.data };
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 404) {
        return { success: false, error: "USER_NOT_FOUND" };
      }
      error.value = "Ошибка при входе";
      return { success: false, error: "LOGIN_ERROR" };
    } finally {
      isLoading.value = false;
    }
  };
  const register = async (userData) => {
    isLoading.value = true;
    error.value = null;
    console.log("Попытка регистрации с данными:", userData.login);
    try {
      const response = await axios.post("/api/auth/register", userData);
      return { success: true, data: response.data };
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        error.value = "Пользователь с таким email или логином уже существует";
      } else {
        error.value = "Ошибка при регистрации";
      }
      return { success: false, error: error.value };
    } finally {
      isLoading.value = false;
    }
  };
  return { isLoading, error, login: login2, register };
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "login",
  __ssrInlineRender: true,
  async setup(__props) {
    let __temp, __restore;
    ref("");
    const userLogin = ref("");
    const userEmail = ref("");
    const adUserLogin = ref("");
    useSeoMeta({
      title: "Авторизация",
      description: "Страница авторизации для доступа к системе."
    });
    useIsLoadingStore();
    useAuthStore();
    useUserSession();
    useToastStore();
    Math.random().toString();
    useRouter();
    const passwordRef = ref("");
    ref("");
    ref([]);
    useAuth();
    const { data: user, error } = ([__temp, __restore] = withAsyncContext(() => useFetch(
      "/api/auth/me",
      "$bjrs2CNcV8"
      /* nuxt-injected */
    )), __temp = await __temp, __restore(), __temp);
    adUserLogin.value = user.value?.username;
    watch([userLogin, userEmail, passwordRef], () => {
      if (userLogin.value && passwordRef.value) {
        console.log("Пользователь готов к авторизации");
      }
    });
    return (_ctx, _push, _parent, _attrs) => {
      if (!adUserLogin.value) {
        _push(`<div${ssrRenderAttrs(mergeProps({ class: "mx-auto w-1/2 p-4" }, _attrs))} data-v-e7360a82><div class="flex flex-col gap-2 bg-white w-full p-4 border border-gray-200 rounded-lg mb-4" data-v-e7360a82><div class="" data-v-e7360a82><input${ssrRenderAttr("value", userLogin.value)} type="text" placeholder="login" class="border border-gray-200 p-4 rounded-lg w-full" data-v-e7360a82></div><div class="mb-4" data-v-e7360a82><input${ssrRenderAttr("value", passwordRef.value)} type="password" placeholder="password" class="border border-gray-200 p-4 rounded-lg w-full" data-v-e7360a82></div><div class="flex justify-between" data-v-e7360a82><a href="#" class="inline-block text-sm text-white px-3 py-2 bg-emerald-400 border border-emerald-700 rounded-sm hover:shadow-lg active:shadow-sm" data-v-e7360a82>Войти</a><a href="#" class="isDisabled inline-block text-sm text-gray-200 px-3 py-2 bg-sky-500 border border-emerald-700 rounded-sm" data-v-e7360a82>Зарегистрироваться</a></div>`);
        if (unref(user)) {
          _push(`<h1 data-v-e7360a82>Привет, ${ssrInterpolate(adUserLogin.value)}!</h1>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</div></div>`);
      } else {
        _push(`<!---->`);
      }
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/login.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const login = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-e7360a82"]]);

export { login as default };
//# sourceMappingURL=login-D-HJU7pY.mjs.map
