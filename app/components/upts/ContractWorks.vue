<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import Modal from "../work/Modal.vue";
import type { UptsContractDTO } from "~~/shared/types/upts";
import {
  UPTS_CONTRACT_TYPES,
  type UptsLibrary,
} from "~~/shared/types/upts-library";
const props = defineProps<{ contract: UptsContractDTO }>();
const emit = defineEmits<{ close: []; saved: [] }>();
const { send, saving, error } = useWorkApi();
const lib = ref<UptsLibrary | null>(null),
  templateId = ref<number | null>(null),
  manual = ref(""),
  loading = ref(true),
  loadError = ref("");
const templates = computed(
  () =>
    lib.value?.templates.filter(
      (t) =>
        t.active &&
        t.contractType === props.contract.contractType &&
        t.items.every((i) => i.work.active),
    ) || [],
);
const chosen = computed(() =>
  templates.value.find((t) => t.id === templateId.value),
);
let attempt: { source: string; key: string } | null = null;
async function load() {
  loading.value = true;
  loadError.value = "";
  try {
    lib.value = await $fetch<UptsLibrary>("/api/upts/library");
    templateId.value = templates.value[0]?.id ?? null;
  } catch {
    loadError.value = "Не удалось загрузить шаблоны.";
  } finally {
    loading.value = false;
  }
}
onMounted(load);
async function apply() {
  const body = {
    contractVersion: props.contract.version,
    templateId: templateId.value,
    templateVersion: chosen.value?.version ?? null,
    manualWorks: templateId.value
      ? []
      : manual.value
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
  };
  const source = JSON.stringify(body);
  if (!attempt || attempt.source !== source)
    attempt = { source, key: crypto.randomUUID() };
  if (
    await send(`/api/upts/contracts/${props.contract.id}/works`, "POST", {
      ...body,
      clientKey: attempt.key,
    })
  )
    emit("saved");
}
</script>
<template>
  <Modal title="Добавить работы в договор" @close="emit('close')"
    ><form class="work-form" @submit.prevent="apply">
      <strong>{{ contract.number }} · {{ contract.name }}</strong>
      <p>
        {{
          contract.contractType
            ? UPTS_CONTRACT_TYPES[contract.contractType]
            : "Сначала укажите тип договора в карточке."
        }}
      </p>
      <p v-if="error || loadError" role="alert" class="work-error">
        {{ error || loadError }}
        <button v-if="loadError" type="button" @click="load">Повторить</button>
      </p>
      <fieldset :disabled="saving || loading">
        <label
          >Шаблон<select v-model="templateId">
            <option :value="null">
              {{
                contract.contractType === "OTHER"
                  ? "Ручной ввод"
                  : "Выберите шаблон"
              }}
            </option>
            <option v-for="t in templates" :key="t.id" :value="t.id">
              {{ t.name }}
            </option>
          </select></label
        >
        <ol v-if="chosen">
          <li v-for="i in chosen.items" :key="i.workId">{{ i.work.name }}</li>
        </ol>
        <label v-if="contract.contractType === 'OTHER' && !templateId"
          >Работы — одна строка на задачу<textarea
            v-model="manual"
            rows="6"
            maxlength="12550"
          />
        </label>
        <p class="work-muted">
          Будут добавлены новые задачи без исполнителей и сроков. Существующие
          задачи сохранятся. Повторное применение из нового окна добавит ещё
          один набор.
        </p>
      </fieldset>
      <div class="work-actions">
        <button
          class="work-primary"
          :disabled="
            saving || loading || !!loadError || (!chosen && !manual.trim())
          "
        >
          Добавить работы</button
        ><button type="button" @click="emit('close')">Отмена</button>
      </div>
    </form></Modal
  >
</template>
