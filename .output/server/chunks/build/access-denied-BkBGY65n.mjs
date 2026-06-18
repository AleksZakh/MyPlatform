import { mergeProps, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrInterpolate } from 'vue/server-renderer';
import { b as useRouter, u as useHead } from './server.mjs';
import { _ as _export_sfc } from './_plugin-vue_export-helper-1tPrXgE0.mjs';
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

const _sfc_main = {
  __name: "access-denied",
  __ssrInlineRender: true,
  props: {
    errorDetails: {
      type: String,
      default: ""
    },
    errorCode: {
      type: String,
      default: "403"
    },
    showRequestAccess: {
      type: Boolean,
      default: true
    }
  },
  setup(__props) {
    useRouter();
    useHead({
      title: "Доступ запрещён",
      meta: [
        { name: "robots", content: "noindex, nofollow" },
        { name: "description", content: "У вас недостаточно прав для доступа к этой странице" }
      ]
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "access-denied-container" }, _attrs))} data-v-fb96f32d><div class="access-denied-card" data-v-fb96f32d><div class="icon-wrapper" data-v-fb96f32d><svg class="lock-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" data-v-fb96f32d><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" data-v-fb96f32d></path></svg></div><h1 class="title" data-v-fb96f32d>Доступ запрещён</h1><p class="message" data-v-fb96f32d> У вас недостаточно прав для доступа к этой странице. </p>`);
      if (__props.errorDetails) {
        _push(`<p class="submessage" data-v-fb96f32d>${ssrInterpolate(__props.errorDetails)}</p>`);
      } else {
        _push(`<!---->`);
      }
      _push(`<div class="actions" data-v-fb96f32d><button class="btn btn-secondary" data-v-fb96f32d> ← Вернуться назад </button><button class="btn btn-primary" data-v-fb96f32d> На главную </button>`);
      if (__props.showRequestAccess) {
        _push(`<button class="btn btn-outline" data-v-fb96f32d> Запросить доступ </button>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div>`);
      if (__props.errorCode) {
        _push(`<div class="error-code" data-v-fb96f32d> Код ошибки: ${ssrInterpolate(__props.errorCode)}</div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div></div>`);
    };
  }
};
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/access-denied.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const accessDenied = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-fb96f32d"]]);

export { accessDenied as default };
//# sourceMappingURL=access-denied-BkBGY65n.mjs.map
