<script setup lang="ts">
import { ref, watch } from 'vue';
import Modal from '../work/Modal.vue';
import {
  UPTS_TYPES,
  UPTS_TEMPLATES,
  type UptsProjectDTO,
} from '~~/shared/types/upts';
const props = defineProps<{ project: UptsProjectDTO }>();
const emit = defineEmits<{ close: []; saved: [] }>();
const type = ref<keyof typeof UPTS_TYPES>(props.project.upts.projectType),
  objectId = ref<number | null>(null),
  text = ref(UPTS_TEMPLATES[type.value].join('\n'));
const { send, error, saving } = useWorkApi();
let attempt: {
  source: string;
  items: { clientKey: string; title: string }[];
} | null = null;
watch(type, (v) => {
  text.value = UPTS_TEMPLATES[v].join('\n');
});
async function apply() {
  const titles = text.value
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!titles.length || titles.length > 50) {
    error.value = 'Укажите от 1 до 50 работ, каждую с новой строки.';
    return;
  }
  const source = JSON.stringify([objectId.value, titles]);
  if (!attempt || attempt.source !== source)
    attempt = {
      source,
      items: titles.map((title) => ({ clientKey: crypto.randomUUID(), title })),
    };
  if (
    await send(`/api/upts/projects/${props.project.id}/template`, 'POST', {
      objectId: objectId.value,
      items: attempt.items,
    })
  )
    emit('saved');
}
</script>
<template>
  <Modal title="Добавить набор работ" @close="emit('close')"
    ><form class="work-form" @submit.prevent="apply">
      <p v-if="error" class="work-error" role="alert">{{ error }}</p>
      <fieldset :disabled="saving">
        <p class="work-muted">
          Это предварительные примеры. Измените состав перед применением. Новые
          задачи появятся без исполнителей и сроков — назначьте их после
          проверки.
        </p>
        <label
          >Тип набора<select v-model="type">
            <option v-for="(label, key) in UPTS_TYPES" :key="key" :value="key">
              {{ label }}
            </option>
          </select></label
        ><label
          >Для чего создать работы<select v-model="objectId">
            <option :value="null">Общие задачи проекта</option>
            <option v-for="o in project.upts.objects" :key="o.id" :value="o.id">
              {{ o.object.name }}
            </option>
          </select></label
        ><label
          >Работы · одна строка — одна задача<textarea
            v-model="text"
            rows="10"
            required
          />
        </label>
        <p class="work-muted">
          Применение добавляет задачи. Существующие задачи не изменяются.
          Повторное применение нового набора создаст ещё один набор.
        </p>
      </fieldset>
      <div class="work-actions">
        <button class="work-primary" :disabled="saving">Добавить работы</button
        ><button type="button" @click="emit('close')">Отмена</button>
      </div>
    </form></Modal
  >
</template>
