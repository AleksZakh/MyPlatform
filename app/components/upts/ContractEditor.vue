<script setup lang="ts">
import { reactive, ref, computed, onMounted, watch } from "vue";
import Modal from "../work/Modal.vue";
import type { UptsContractDTO, UptsProjectDTO } from "~~/shared/types/upts";
import {
  UPTS_CONTRACT_TYPES,
  type UptsLibrary,
  type UptsContractType,
} from "~~/shared/types/upts-library";
import { dateKey } from "~~/shared/utils/work-board";
const props = defineProps<{
  projectId?: number | null;
  projects: UptsProjectDTO[];
  contract: UptsContractDTO | null;
}>();
const emit = defineEmits<{ close: []; saved: [contract: UptsContractDTO] }>();
const { send, error, saving } = useWorkApi();
const c = props.contract;
const library = ref<UptsLibrary | null>(null),
  loading = ref(false),
  libraryError = ref("");
const form = reactive({
  clientKey: crypto.randomUUID(),
  version: c?.version,
  number: c?.number || "",
  name: c?.name || "",
  counterparty: c?.counterparty || "",
  signedDate: dateKey(c?.signedDate) || "",
  dueDate: dateKey(c?.dueDate) || "",
  contractType: (c?.contractType || (c ? "" : "LAND")) as UptsContractType | "",
  projectId: c?.projectId ?? null,
});
const templateId = ref<number | null>(null),
  manual = ref("");
const templates = computed(
  () =>
    library.value?.templates.filter(
      (t) =>
        t.contractType === form.contractType &&
        t.active &&
        t.items.every((i) => i.work.active),
    ) || [],
);
const template = computed(() =>
  templates.value.find((t) => t.id === templateId.value),
);
watch(
  () => form.contractType,
  () => {
    templateId.value = templates.value[0]?.id ?? null;
    manual.value = "";
  },
);
async function load() {
  loading.value = true;
  libraryError.value = "";
  try {
    library.value = await $fetch<UptsLibrary>("/api/upts/library");
    templateId.value = templates.value[0]?.id ?? null;
  } catch {
    libraryError.value = "Не удалось загрузить библиотеку работ.";
  } finally {
    loading.value = false;
  }
}
onMounted(() => {
  if (!c) load();
});
async function save() {
  const fields = {
    clientKey: form.clientKey,
    version: form.version,
    number: form.number,
    name: form.name,
    counterparty: form.counterparty,
    contractType: form.contractType,
    signedDate: form.signedDate || null,
    dueDate: form.dueDate || null,
  };
  const result = await send<UptsContractDTO>(
    c
      ? `/api/upts/projects/${c.projectId}/contracts/${c.id}`
      : "/api/upts/contracts",
    c ? "PUT" : "POST",
    c
      ? fields
      : {
          ...fields,
          projectId: form.projectId,
          templateId: templateId.value,
          templateVersion: template.value?.version ?? null,
          manualWorks: templateId.value
            ? []
            : manual.value
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean),
        },
  );
  if (result) emit("saved", result);
}
</script>
<template>
  <Modal
    :title="c ? 'Договор ' + c.number : 'Новый договор'"
    @close="emit('close')"
    ><form class="work-form" @submit.prevent="save">
      <p v-if="error" class="work-error" role="alert">{{ error }}</p>
      <fieldset :disabled="saving">
        <label
          >Номер<input v-model="form.number" required maxlength="100"
        /></label>
        <label
          >Наименование<input v-model="form.name" required maxlength="250"
        /></label>
        <label
          >Тип договора<select v-model="form.contractType" required>
            <option disabled value="">Выберите тип договора</option>
            <option
              v-for="(name, key) in UPTS_CONTRACT_TYPES"
              :key="key"
              :value="key"
            >
              {{ name }}
            </option>
          </select></label
        >
        <label
          >Контрагент<input v-model="form.counterparty" maxlength="250"
        /></label>
        <div class="work-two">
          <label
            >Дата договора<input v-model="form.signedDate" type="date" /></label
          ><label>Срок<input v-model="form.dueDate" type="date" /></label>
        </div>
        <template v-if="!c">
          <label
            >Рабочая область<select v-model="form.projectId">
              <option :value="null">Создать отдельную область договора</option>
              <option
                v-for="p in projects.filter(
                  (p) => p.canManage && !p.archivedAt,
                )"
                :key="p.id"
                :value="p.id"
              >
                {{ p.name }}
              </option>
            </select></label
          >
          <p class="work-muted">
            Новая область сначала доступна только вам. Добавьте сотрудников и
            настройте доступ через «Команда» и «Настройки доступа». При выборе
            существующей области используются её права. Папка договора создаётся
            автоматически.
          </p>
          <p v-if="loading" role="status">Загружаем библиотеку…</p>
          <p v-if="libraryError" role="alert">
            {{ libraryError }}
            <button type="button" @click="load">Повторить</button>
          </p>
          <label
            >Шаблон работ<select v-model="templateId">
              <option :value="null">
                {{
                  form.contractType === "OTHER"
                    ? "Заполнить вручную"
                    : "Без начального набора"
                }}
              </option>
              <option v-for="t in templates" :key="t.id" :value="t.id">
                {{ t.name }}
              </option>
            </select></label
          >
          <ol v-if="template">
            <li v-for="i in template.items" :key="i.workId">
              {{ i.work.name }}
            </li>
          </ol>
          <label v-if="form.contractType === 'OTHER' && !templateId"
            >Работы — одна строка на работу<textarea
              v-model="manual"
              rows="5"
              maxlength="12550"
            />
          </label>
          <p class="work-muted">
            Работы появятся как задачи договора без исполнителей и сроков. Их
            можно назначить после создания.
          </p>
        </template>
        <p v-else class="work-muted">
          Изменение типа договора не заменяет существующие задачи. Примените
          подходящий набор отдельно после сохранения.
        </p>
      </fieldset>
      <div class="work-actions">
        <button
          class="work-primary"
          :disabled="saving || loading || (!c && !!libraryError)"
        >
          Сохранить</button
        ><button type="button" @click="emit('close')">Отмена</button>
      </div>
    </form></Modal
  >
</template>
