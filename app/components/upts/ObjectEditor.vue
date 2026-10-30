<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import Modal from '../work/Modal.vue';
import {
  UPTS_AXES,
  UPTS_READINESS,
  type UptsObjectLink,
} from '~~/shared/types/upts';
const props = defineProps<{ projectId: number; link: UptsObjectLink | null }>();
const emit = defineEmits<{ close: []; saved: [] }>();
const { send, error, saving } = useWorkApi();
const l = props.link;
const form = reactive({
  clientKey: crypto.randomUUID(),
  objectId: null as number | null,
  name: '',
  cadastralNumber: '',
  address: '',
  goal: l?.goal || '',
});
const progress = reactive({
  version: l?.version || 1,
  goal: l?.goal || '',
  note: l?.note || '',
  cadastral: l?.cadastral || 'TODO',
  rights: l?.rights || 'TODO',
  restrictions: l?.restrictions || 'TODO',
  documents: l?.documents || 'TODO',
  handover: l?.handover || 'TODO',
});
const catalog = ref<
    {
      id: number;
      name: string;
      cadastralNumber: string | null;
      address: string;
    }[]
  >([]),
  search = ref(''),
  catalogError = ref(''),
  catalogBusy = ref(false);
let sequence = 0;
async function load() {
  const serial = ++sequence;
  catalogBusy.value = true;
  try {
    const r = await $fetch<typeof catalog.value>('/api/upts/objects', {
      query: { q: search.value },
    });
    if (serial === sequence) {
      catalog.value = r;
      catalogError.value = '';
    }
  } catch {
    if (serial === sequence)
      catalogError.value = 'Не удалось загрузить реестр объектов.';
  } finally {
    if (serial === sequence) catalogBusy.value = false;
  }
}
function select() {
  const o = catalog.value.find((o) => o.id === form.objectId);
  if (o) {
    form.name = o.name;
    form.cadastralNumber = o.cadastralNumber || '';
    form.address = o.address;
  } else {
    form.name = '';
    form.cadastralNumber = '';
    form.address = '';
  }
}
async function save() {
  const base = `/api/upts/projects/${props.projectId}/objects`;
  const result = await send(
    l ? `${base}/${l.id}` : base,
    l ? 'PUT' : 'POST',
    l ? progress : { ...form, cadastralNumber: form.cadastralNumber || null },
  );
  if (result) emit('saved');
}
onMounted(() => {
  if (!l) load();
});
</script>
<template>
  <Modal
    :title="l ? l.object.name : 'Добавить объект в проект'"
    @close="emit('close')"
    ><form class="work-form" @submit.prevent="save">
      <p v-if="error || catalogError" class="work-error" role="alert">
        {{ error || catalogError }}
      </p>
      <fieldset :disabled="saving">
        <template v-if="!l"
          ><div class="work-two">
            <label
              >Найти существующий объект<input
                v-model="search"
                placeholder="Название / кадастровый номер"
                @keydown.enter.prevent="load" /></label
            ><button type="button" :disabled="catalogBusy" @click="load">
              Найти
            </button>
          </div>
          <label
            >Объект из доступного реестра<select
              v-model="form.objectId"
              @change="select"
            >
              <option :value="null">Создать новую карточку</option>
              <option v-for="o in catalog" :key="o.id" :value="o.id">
                {{ o.name }} · {{ o.cadastralNumber || 'номер не задан' }}
              </option>
            </select></label
          >
          <p class="work-muted">
            Показано до 100 доступных объектов. Используйте поиск. Общая
            карточка может участвовать в нескольких проектах.
          </p>
          <label
            >Название<input
              v-model="form.name"
              required
              maxlength="250"
              :disabled="!!form.objectId" /></label
          ><label
            >Кадастровый номер (при наличии)<input
              v-model="form.cadastralNumber"
              maxlength="100"
              :disabled="!!form.objectId" /></label
          ><label
            >Адрес / расположение<textarea
              v-model="form.address"
              maxlength="1000"
              :disabled="!!form.objectId"
            /></label
          ><label
            >Цель работ в этом проекте<textarea
              v-model="form.goal"
              maxlength="1000"
            /></label
        ></template>
        <template v-else
          ><p class="work-muted">
            {{ l.object.cadastralNumber || 'Без кадастрового номера' }} ·
            {{ l.object.address }}
          </p>
          <label
            >Цель работ<textarea
              v-model="progress.goal"
              maxlength="1000"
            /></label
          ><label v-for="(label, key) in UPTS_AXES" :key="key"
            >{{ label
            }}<select v-model="progress[key]">
              <option
                v-for="(text, state) in UPTS_READINESS"
                :key="state"
                :value="state"
              >
                {{ text }}
              </option>
            </select></label
          ><label
            >Препятствия / сведения о передаче<textarea
              v-model="progress.note"
              rows="3"
              maxlength="2000"
              placeholder="Что требуется уточнить; кому, когда и какие материалы переданы"
            /></label
        ></template>
      </fieldset>
      <div class="work-actions">
        <button class="work-primary" :disabled="saving">Сохранить</button
        ><button type="button" @click="emit('close')">Отмена</button>
      </div>
    </form></Modal
  >
</template>
