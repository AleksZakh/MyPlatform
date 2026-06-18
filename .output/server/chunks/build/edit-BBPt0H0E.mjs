import { defineComponent, computed, ref, mergeProps, unref, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderAttr, ssrInterpolate } from 'vue/server-renderer';
import { u as useUserStore } from './user-DvbfwhvH.mjs';
import 'pinia';

const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "edit",
  __ssrInlineRender: true,
  setup(__props) {
    const userStore = useUserStore();
    const name = computed(() => userStore.name);
    const email = computed(() => userStore.email);
    const newName = ref(name.value);
    const newEmail = ref(email.value);
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "mx-auto w-1/2 p-4" }, _attrs))}><div class="bg-white w-full p-4 border border-gray-200 rounded-lg mb-4"><div class=""><input${ssrRenderAttr("value", unref(newName))} type="text" placeholder="name" class="border border-gray-200 p-4 mb-2 rounded-lg w-full"></div><div class="mb-4"><textarea placeholder="email" class="border border-gray-200 rounded-lg w-full p-4">${ssrInterpolate(unref(newEmail))}</textarea></div><div class=""><a href="#" class="inline-block text-xs text-white px-3 py-2 bg-emerald-600 border border-emerald-700 rounded-sm">Сохранить</a></div></div></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/edit.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=edit-BBPt0H0E.mjs.map
