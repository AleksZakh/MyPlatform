<script setup lang="ts">
import { reactive } from 'vue';
import Modal from '../work/Modal.vue';
import type { UptsContractDTO } from '~~/shared/types/upts';
import { dateKey } from '~~/shared/utils/work-board';
const props = defineProps<{
  projectId: number;
  contract: UptsContractDTO | null;
}>();
const emit = defineEmits<{ close: []; saved: [] }>();
const { send, error, saving } = useWorkApi();
const c = props.contract;
const form = reactive({
  clientKey: crypto.randomUUID(),
  version: c?.version,
  number: c?.number || '',
  name: c?.name || '',
  counterparty: c?.counterparty || '',
  signedDate: dateKey(c?.signedDate) || '',
  dueDate: dateKey(c?.dueDate) || '',
});
async function save() {
  const base = `/api/upts/projects/${props.projectId}/contracts`;
  if (
    await send(c ? `${base}/${c.id}` : base, c ? 'PUT' : 'POST', {
      ...form,
      signedDate: form.signedDate || null,
      dueDate: form.dueDate || null,
    })
  )
    emit('saved');
}
</script>
<template>
  <Modal
    :title="c ? 'Договор ' + c.number : 'Новый договор'"
    @close="emit('close')"
    ><form class="work-form" @submit.prevent="save">
      <p v-if="error" role="alert" class="work-error">{{ error }}</p>
      <fieldset :disabled="saving">
        <label
          >Номер<input v-model="form.number" required maxlength="100" /></label
        ><label
          >Наименование<input
            v-model="form.name"
            required
            maxlength="250" /></label
        ><label
          >Контрагент<input v-model="form.counterparty" maxlength="250"
        /></label>
        <div class="work-two">
          <label
            >Дата договора<input v-model="form.signedDate" type="date" /></label
          ><label>Срок<input v-model="form.dueDate" type="date" /></label>
        </div>
        <p class="work-muted">
          При сохранении создаётся отдельная папка договора внутри хранилища
          проекта.
        </p>
      </fieldset>
      <div class="work-actions">
        <button class="work-primary" :disabled="saving">Сохранить</button
        ><button type="button" @click="emit('close')">Отмена</button>
      </div>
    </form></Modal
  >
</template>
