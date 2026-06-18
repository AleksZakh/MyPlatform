import { defineComponent, ref, computed, watch, mergeProps, unref, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderAttr, ssrInterpolate, ssrIncludeBooleanAttr, ssrLooseContain, ssrRenderList, ssrRenderClass, ssrLooseEqual } from 'vue/server-renderer';
import { _ as _export_sfc } from './_plugin-vue_export-helper-1tPrXgE0.mjs';

const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "index",
  __ssrInlineRender: true,
  setup(__props) {
    const loading = ref(true);
    const originalData = ref([]);
    const headers = ref([]);
    const searchQuery = ref("");
    const sortKey = ref("Дата отбора проб");
    const sortDirection = ref("desc");
    const currentPage = ref(1);
    const itemsPerPage = ref(25);
    const showColumnSelector = ref(false);
    const visibleColumns = ref([]);
    const selectAll = ref(false);
    const columnLabels = {
      "ПЛП": "ПЛП",
      "Наименование объект": "Объект",
      "Номер акта отбора проб": "№ Акта",
      "Дата отбора проб": "Дата отбора",
      "Место отбора проб": "Место отбора",
      "Лицо, предоставившее пробу": "Кто предоставил",
      "Дата поступления материала": "Дата поступления",
      "Наименование материала": "Материал",
      "Документ о качестве": "Документ",
      "Предприятие-изготовитель": "Изготовитель",
      "Номер протокола": "№ Протокола",
      "Дата протокола": "Дата протокола",
      "Результат испытаний": "Результат",
      "Примечание": "Примечание"
    };
    function getColumnLabel(header) {
      return columnLabels[header] || header;
    }
    function formatCellValue(value, header) {
      if (!value) return "—";
      if (value.length > 100 && header !== "Примечание") {
        return value.substring(0, 100) + "…";
      }
      return value;
    }
    const filteredData = computed(() => {
      if (!searchQuery.value.trim()) {
        return [...originalData.value];
      }
      const query = searchQuery.value.toLowerCase();
      return originalData.value.filter((row) => {
        return Object.values(row).some(
          (value) => value?.toLowerCase().includes(query)
        );
      });
    });
    const sortedData = computed(() => {
      const data = [...filteredData.value];
      const key = sortKey.value;
      const direction = sortDirection.value;
      data.sort((a, b) => {
        let aVal = a[key] || "";
        let bVal = b[key] || "";
        if (key.includes("Дата") && aVal && bVal) {
          const dateA = new Date(aVal.split(".").reverse().join("-"));
          const dateB = new Date(bVal.split(".").reverse().join("-"));
          if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
            return direction === "asc" ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
          }
        }
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
        if (aVal < bVal) return direction === "asc" ? -1 : 1;
        if (aVal > bVal) return direction === "asc" ? 1 : -1;
        return 0;
      });
      return data;
    });
    const visibleHeaders = computed(() => {
      return headers.value.filter((h) => visibleColumns.value.includes(h));
    });
    const totalPages = computed(() => Math.ceil(sortedData.value.length / itemsPerPage.value));
    const startIndex = computed(() => (currentPage.value - 1) * itemsPerPage.value);
    const endIndex = computed(() => Math.min(startIndex.value + itemsPerPage.value, sortedData.value.length));
    const paginatedData = computed(() => sortedData.value.slice(startIndex.value, endIndex.value));
    watch(visibleColumns, (newVal) => {
      selectAll.value = newVal.length === headers.value.length;
    }, { deep: true });
    watch([searchQuery, sortKey, sortDirection, itemsPerPage], () => {
      currentPage.value = 1;
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "p-6" }, _attrs))} data-v-3015f249><h1 class="text-2xl font-bold mb-2" data-v-3015f249>Лабораторные исследования</h1><p class="text-gray-600 mb-6" data-v-3015f249>Данные из реестра испытаний</p><div class="bg-gray-50 rounded-lg p-4 mb-6" data-v-3015f249><div class="flex flex-wrap gap-4 items-center justify-between" data-v-3015f249><div class="flex-1 min-w-[200px]" data-v-3015f249><input${ssrRenderAttr("value", unref(searchQuery))} type="text" placeholder="Поиск по всем полям..." class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" data-v-3015f249></div><div class="relative" data-v-3015f249><button class="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2" data-v-3015f249><span data-v-3015f249>📋</span> Выбрать столбцы <span data-v-3015f249>${ssrInterpolate(unref(showColumnSelector) ? "▲" : "▼")}</span></button>`);
      if (unref(showColumnSelector)) {
        _push(`<div class="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-96 overflow-y-auto" data-v-3015f249><div class="p-3 border-b bg-gray-50 font-medium" data-v-3015f249>Выберите столбцы для отображения</div><div class="p-2" data-v-3015f249><label class="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer" data-v-3015f249><input type="checkbox"${ssrIncludeBooleanAttr(Array.isArray(unref(selectAll)) ? ssrLooseContain(unref(selectAll), null) : unref(selectAll)) ? " checked" : ""} class="w-4 h-4" data-v-3015f249><span class="font-medium" data-v-3015f249>Выбрать все</span></label><hr class="my-1" data-v-3015f249><!--[-->`);
        ssrRenderList(unref(headers), (header) => {
          _push(`<label class="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer" data-v-3015f249><input type="checkbox"${ssrIncludeBooleanAttr(Array.isArray(unref(visibleColumns)) ? ssrLooseContain(unref(visibleColumns), header) : unref(visibleColumns)) ? " checked" : ""}${ssrRenderAttr("value", header)} class="w-4 h-4" data-v-3015f249><span data-v-3015f249>${ssrInterpolate(getColumnLabel(header))}</span></label>`);
        });
        _push(`<!--]--></div></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div><div class="text-sm text-gray-500" data-v-3015f249> Всего записей: ${ssrInterpolate(unref(filteredData).length)} из ${ssrInterpolate(unref(originalData).length)}</div></div></div>`);
      if (unref(loading)) {
        _push(`<div class="text-center py-12" data-v-3015f249><div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" data-v-3015f249></div><p class="mt-2 text-gray-600" data-v-3015f249>Загрузка данных...</p></div>`);
      } else if (unref(filteredData).length === 0) {
        _push(`<div class="text-center py-12 text-gray-500" data-v-3015f249><p data-v-3015f249>Нет данных, соответствующих критериям поиска</p></div>`);
      } else {
        _push(`<div class="overflow-x-auto shadow-md rounded-lg" data-v-3015f249><table class="min-w-full bg-white border border-gray-200 text-sm" data-v-3015f249><thead class="bg-gray-100 sticky top-0" data-v-3015f249><tr data-v-3015f249><!--[-->`);
        ssrRenderList(unref(visibleHeaders), (header) => {
          _push(`<th class="${ssrRenderClass([{ "bg-blue-50": unref(sortKey) === header }, "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition select-none"])}" data-v-3015f249><div class="flex items-center gap-1" data-v-3015f249>${ssrInterpolate(getColumnLabel(header))} `);
          if (unref(sortKey) === header) {
            _push(`<span class="text-blue-500" data-v-3015f249>${ssrInterpolate(unref(sortDirection) === "asc" ? "↑" : "↓")}</span>`);
          } else {
            _push(`<span class="text-gray-300" data-v-3015f249>↕️</span>`);
          }
          _push(`</div></th>`);
        });
        _push(`<!--]--></tr></thead><tbody class="divide-y divide-gray-200" data-v-3015f249><!--[-->`);
        ssrRenderList(unref(paginatedData), (row, index2) => {
          _push(`<tr class="${ssrRenderClass([{ "bg-red-50": row["Результат испытаний"] === "Не соответствует" }, "hover:bg-gray-50 transition"])}" data-v-3015f249><!--[-->`);
          ssrRenderList(unref(visibleHeaders), (header) => {
            _push(`<td class="${ssrRenderClass([{
              "font-medium text-red-600": header === "Результат испытаний" && row[header] === "Не соответствует",
              "font-medium text-green-600": header === "Результат испытаний" && row[header] === "Соответствует"
            }, "px-4 py-3 text-gray-700 align-top"])}" data-v-3015f249>${ssrInterpolate(formatCellValue(row[header], header))}</td>`);
          });
          _push(`<!--]--></tr>`);
        });
        _push(`<!--]--></tbody></table></div>`);
      }
      if (unref(filteredData).length > 0) {
        _push(`<div class="flex justify-between items-center mt-4" data-v-3015f249><div class="text-sm text-gray-600" data-v-3015f249> Показано ${ssrInterpolate(unref(startIndex) + 1)} - ${ssrInterpolate(unref(endIndex))} из ${ssrInterpolate(unref(filteredData).length)}</div><div class="flex gap-2" data-v-3015f249><button${ssrIncludeBooleanAttr(unref(currentPage) === 1) ? " disabled" : ""} class="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed" data-v-3015f249> ← Назад </button><select class="px-2 py-1 border border-gray-300 rounded" data-v-3015f249><option${ssrRenderAttr("value", 10)} data-v-3015f249${ssrIncludeBooleanAttr(Array.isArray(unref(itemsPerPage)) ? ssrLooseContain(unref(itemsPerPage), 10) : ssrLooseEqual(unref(itemsPerPage), 10)) ? " selected" : ""}>10</option><option${ssrRenderAttr("value", 25)} data-v-3015f249${ssrIncludeBooleanAttr(Array.isArray(unref(itemsPerPage)) ? ssrLooseContain(unref(itemsPerPage), 25) : ssrLooseEqual(unref(itemsPerPage), 25)) ? " selected" : ""}>25</option><option${ssrRenderAttr("value", 50)} data-v-3015f249${ssrIncludeBooleanAttr(Array.isArray(unref(itemsPerPage)) ? ssrLooseContain(unref(itemsPerPage), 50) : ssrLooseEqual(unref(itemsPerPage), 50)) ? " selected" : ""}>50</option><option${ssrRenderAttr("value", 100)} data-v-3015f249${ssrIncludeBooleanAttr(Array.isArray(unref(itemsPerPage)) ? ssrLooseContain(unref(itemsPerPage), 100) : ssrLooseEqual(unref(itemsPerPage), 100)) ? " selected" : ""}>100</option></select><span class="px-3 py-1" data-v-3015f249> Страница ${ssrInterpolate(unref(currentPage))} из ${ssrInterpolate(unref(totalPages))}</span><button${ssrIncludeBooleanAttr(unref(currentPage) === unref(totalPages)) ? " disabled" : ""} class="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed" data-v-3015f249> Вперед → </button></div></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/lab-tests/index.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-3015f249"]]);

export { index as default };
//# sourceMappingURL=index-6DR30KJy.mjs.map
