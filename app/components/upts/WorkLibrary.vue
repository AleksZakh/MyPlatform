<script setup lang="ts">
import WorkName from './WorkName.vue';
import { ref, reactive, computed, watch, onMounted } from "vue";
import { workKindsFor, workKindName, UPTS_WORK_ROLES } from '~~/shared/utils/upts-work-kinds';
import WorkSetPreview from './WorkSetPreview.vue';
import Modal from "../work/Modal.vue";
import {
  UPTS_CONTRACT_TYPES,
  type UptsContractType,
  type UptsLibrary,
  type UptsWorkDefinition,
  type UptsWorkTemplate,
} from "~~/shared/types/upts-library";
const lib = ref<UptsLibrary | null>(null),
  loading = ref(true),
  loadError = ref(""),
  tab = ref<"works" | "templates">("works"),
  type = ref<UptsContractType>("LAND"),
  showArchived = ref(false),
  search = ref(""),
  notice = ref("");
const workKindKey=ref<string|null>(null);
const kinds=computed(()=>workKindsFor(type.value));
watch(type,()=>{workKindKey.value=null;});
const { send, saving, error } = useWorkApi();
const works = computed(
  () =>
    lib.value?.works.filter(
      (w) =>
        w.contractType === type.value &&
        (!workKindKey.value || lib.value?.templates.some(t=>t.active && t.workKindKey===workKindKey.value && t.items.some(i=>i.workId===w.id))) &&
        (showArchived.value || w.active) &&
        w.name
          .toLocaleLowerCase("ru")
          .includes(search.value.toLocaleLowerCase("ru")),
    ) || [],
);
const templates = computed(
  () =>
    lib.value?.templates.filter(
      (t) =>
        t.contractType === type.value &&
        (!workKindKey.value || t.workKindKey===workKindKey.value) &&
        (showArchived.value || t.active) &&
        t.name
          .toLocaleLowerCase("ru")
          .includes(search.value.toLocaleLowerCase("ru")),
    ) || [],
);
const editing = ref<"work" | "template" | null>(null),
  editingId = ref<number | null>(null);
const form = reactive({
  clientKey: "",
  version: undefined as number | undefined,
  name: "",
  contractType: "LAND" as UptsContractType,
  active: true,
  workIds: [] as number[],
  workKindKey:null as string|null,
  responsibleRole:null as "CURATOR"|"ENGINEER"|null,
  expectedResult:"",
});
const choices = computed(
  () =>
    lib.value?.works.filter(
      (w) =>
        w.contractType === form.contractType &&
        (w.active || form.workIds.includes(w.id)),
    ) || [],
);
watch(
  () => form.contractType,
  () => {
    form.workIds = [];
    form.workKindKey=null;
  },
  { flush: "sync" },
);
async function load() {
  loading.value = true;
  loadError.value = "";
  try {
    lib.value = await $fetch<UptsLibrary>("/api/upts/library");
  } catch {
    loadError.value = "Не удалось загрузить библиотеку работ.";
  } finally {
    loading.value = false;
  }
}
onMounted(load);
function edit(
  kind: "work" | "template",
  item?: UptsWorkDefinition | UptsWorkTemplate,
  copy = false,
) {
  error.value = "";
  form.contractType = item?.contractType || type.value;
  editing.value = kind;
  editingId.value = copy ? null : (item?.id ?? null);
  Object.assign(form, {
    clientKey: crypto.randomUUID(),
    version: copy ? undefined : item?.version,
    name: item ? (copy ? item.name + " — копия" : item.name) : "",
    active: copy ? true : (item?.active ?? true),
    workIds: item && "items" in item ? item.items.map((i) => i.workId) : [],
    workKindKey:item && "items" in item ? item.workKindKey ?? null : workKindKey.value,
    responsibleRole:item && !('items' in item) ? item.responsibleRole ?? null : null,
    expectedResult:item && !('items' in item) ? item.expectedResult ?? '' : '',

  });
}
function shift(index: number, delta: number) {
  const next = index + delta;
  if (next < 0 || next >= form.workIds.length) return;
  const list = [...form.workIds];
  [list[index], list[next]] = [list[next]!, list[index]!];
  form.workIds = list;
}
async function save() {
  const base =
    "/api/upts/library/" + (editing.value === "work" ? "works" : "templates");
  const { workIds,workKindKey,responsibleRole,expectedResult, ...fields } = form;
  const result = await send(
    editingId.value ? `${base}/${editingId.value}` : base,
    editingId.value ? "PUT" : "POST",
    editing.value === "template" ? { ...fields, workIds,workKindKey } : {...fields,responsibleRole,expectedResult},
  );
  if (result) {
    editing.value = null;
    notice.value = "Изменения сохранены и записаны в журнал событий.";
    await load();
  }
}
</script>
<template>
  <section class="upts-panel upts-library">
    <div class="upts-section-head">
      <h2>Библиотека работ</h2>
      <button :disabled="loading" @click="load">Обновить</button>
    </div>
    <div class="work-view-switch" aria-label="Библиотека">
      <button :aria-pressed="tab === 'works'" @click="tab = 'works'">
        Список работ</button
      ><button :aria-pressed="tab === 'templates'" @click="tab = 'templates'">
        Шаблоны работ
      </button>
    </div>
    <div class="upts-library-filters">
      <label
        >Тип объекта<select v-model="type">
          <option
            v-for="(name, key) in UPTS_CONTRACT_TYPES"
            :key="key"
            :value="key"
          >
            {{ name }}
          </option>
        </select></label
      ><label>Вид работ<select v-model="workKindKey"><option :value="null">Все виды работ</option><option v-for="k in kinds" :key="k.key" :value="k.key">{{ k.name }}</option></select></label><label
        >Поиск<input v-model="search" type="search" maxlength="200" /></label
      ><label class="work-check"
        ><input v-model="showArchived" type="checkbox" />Включая архив</label
      >
    </div>
    <p v-if="loading" role="status">Загрузка…</p>
    <p v-if="loadError" class="work-error" role="alert">{{ loadError }}</p>
    <p v-if="notice" role="status">{{ notice }}</p>
    <template v-if="lib && !loading && !loadError"
      ><div class="upts-section-head">
        <p class="work-muted">
          {{
            tab === "works"
              ? "Тип объекта определяет доступные виды работ. Каждый вид объединяет отдельные работы в шаблон. Архивные записи сохраняются в истории."
              : "Порядок и состав работ можно настроить. Изменение шаблона не меняет уже созданные задачи."
          }}
        </p>
        <button
          v-if="lib.canManage"
          class="work-primary"
          @click="edit(tab === 'works' ? 'work' : 'template')"
        >
          {{ tab === "works" ? "+ Работа" : "+ Шаблон" }}
        </button>
      </div>
      <p v-if="!lib.canManage" class="work-muted">
        Режим просмотра. Библиотеку изменяют администраторы и сотрудники с
        правом изменения раздела «Задачи и проекты».
      </p>
      <div v-if="tab === 'works'" class="work-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Работа</th>
              <th>Ответственная роль</th><th>Ожидаемый результат</th><th>Состояние</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="w in works" :key="w.id">
              <td><WorkName :meta="{workKindKeys:lib?.templates.filter(t=>t.active&&t.items.some(i=>i.workId===w.id)).map(t=>t.workKindKey).filter((k):k is string=>!!k)}" emphasize>{{ w.name }}</WorkName></td>
              <td>{{ w.responsibleRole ? UPTS_WORK_ROLES[w.responsibleRole] : "Не указана" }}</td><td>{{ w.expectedResult || "Не указан" }}</td>
              <td>{{ w.active ? "Действует" : "Архив" }}</td>
              <td>
                <button v-if="lib.canManage" @click="edit('work', w)">
                  Изменить
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="!works.length" class="work-empty">
          Работ пока нет. Для типа «Иное» можно вводить работы вручную в
          объекте.
        </p>
      </div>
      <div v-else class="upts-template-list">
        <article v-for="t in templates" :key="t.id">
          <div class="upts-section-head">
            <strong
              ><WorkName :meta="{workKindKey:t.workKindKey}" emphasize>{{ t.name }}</WorkName> <small v-if="!t.active">· Архив</small></strong
            >
            <div v-if="lib.canManage" class="work-actions">
              <button @click="edit('template', t)">Изменить</button
              ><button @click="edit('template', t, true)">Копировать</button>
            </div>
          </div>
          <p class="work-muted">Вид работ: {{ workKindName(t.workKindKey) || 'Не задан (прежний или пользовательский шаблон)' }}</p>
          <WorkSetPreview :works="t.items.map(i=>i.work)" :work-kind-key="t.workKindKey" />
          <p v-if="t.items.some(i=>!i.work.active)" class="upts-danger">В шаблоне есть архивные работы; применение недоступно.</p>
        </article>
        <p v-if="!templates.length" class="work-empty">Шаблонов пока нет.</p>
      </div>
    </template>
    <Modal
      v-if="editing"
      :title="
        (editingId ? 'Изменить' : 'Создать') +
        (editing === 'work' ? ' работу' : ' шаблон')
      "
      @close="editing = null"
      ><form class="work-form" @submit.prevent="save">
        <p v-if="error" role="alert" class="work-error">{{ error }}</p>
        <fieldset :disabled="saving">
          <label
            >Название<input
              v-model="form.name"
              required
              maxlength="250" /></label
          ><label
            >Тип объекта<select
              v-model="form.contractType"
              :disabled="!!editingId"
            >
              <option
                v-for="(name, key) in UPTS_CONTRACT_TYPES"
                :key="key"
                :value="key"
              >
                {{ name }}
              </option>
            </select></label
          ><label class="work-check"
            ><input v-model="form.active" type="checkbox" />Действует (снимите
            отметку для архива)</label
          >
          <template v-if="editing === 'work'"><label>Ответственная роль<select v-model="form.responsibleRole"><option :value="null">Не указана</option><option v-for="(label,key) in UPTS_WORK_ROLES" :key="key" :value="key">{{ label }}</option></select></label><label>Ожидаемый результат<textarea v-model="form.expectedResult" rows="3" maxlength="2000" /></label></template>
          <label v-if="editing === 'template'">Вид работ<select v-model="form.workKindKey"><option :value="null">Не задан</option><option v-for="k in workKindsFor(form.contractType)" :key="k.key" :value="k.key">{{ k.name }}</option></select></label>
          <template v-if="editing === 'template'"
            ><p>Выберите работы, затем задайте их порядок.</p>
            <label v-for="w in choices" :key="w.id" class="work-check"
              ><input v-model="form.workIds" type="checkbox" :value="w.id" />{{
                w.name
              }}{{ w.active ? "" : " · архив" }}</label
            >
            <ol>
              <li
                v-for="(id, index) in form.workIds"
                :key="id"
                class="upts-template-order"
              >
                <span>{{ lib?.works.find((w) => w.id === id)?.name }}</span
                ><button
                  type="button"
                  :disabled="index === 0"
                  aria-label="Переместить вверх"
                  @click="shift(index, -1)"
                >
                  ↑</button
                ><button
                  type="button"
                  :disabled="index === form.workIds.length - 1"
                  aria-label="Переместить вниз"
                  @click="shift(index, 1)"
                >
                  ↓
                </button>
              </li>
            </ol></template
          >
        </fieldset>
        <div class="work-actions">
          <button
            class="work-primary"
            :disabled="
              saving || (editing === 'template' && !form.workIds.length)
            "
          >
            Сохранить</button
          ><button type="button" @click="editing = null">Отмена</button>
        </div>
      </form></Modal
    >
  </section>
</template>
<style scoped>
.upts-library {
  min-width: 0;
}
.upts-library-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 16px 0;
  align-items: end;
}
.upts-library-filters label {
  min-width: 0;
  flex: 1;
}
.upts-library-filters select {
  width: 100%;
  max-width: 100%;
}
.upts-template-list article {
  border: 1px solid var(--work-line);
  border-radius: 10px;
  padding: 14px;
  margin-top: 12px;
}
.upts-template-list li {
  margin: 7px 0;
}
.upts-template-order {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 6px 0;
}
.upts-template-order span {
  flex: 1;
}
@media (max-width: 650px) {
  .upts-library-filters {
    display: grid;
    grid-template-columns: 1fr;
  }
}
</style>
