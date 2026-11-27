<script setup lang="ts">
import type { StructureDetail } from '~~/shared/types/diagnostic-structures-api';
import { structureRequestError } from '~/composables/diagnostic/useStructures';
const props = defineProps<{ record: StructureDetail | null; roads: string[] }>();
const emit = defineEmits<{ close: []; saved: [id: number] }>();
const r = props.record;
const form = reactive({
  code: r?.issoCode || '',
  roadName: r?.roadName || '',
  location: r?.location || '',
  structureName: r?.structureName || '',
  additionalId: r?.additionalId || '',
  note: r?.note || '',
});
const busy = ref(false),
  error = ref('');
async function save() {
  if (busy.value) return;
  busy.value = true;
  error.value = '';
  try {
    const row = await $fetch<{ id: number }>('/api/diagnostic/structures', {
      method: 'POST',
      headers: { 'x-space-diagnostic': '1' },
      body: { ...form, id: r ? Number(r.id) : undefined, version: r?.version },
      retry: 0,
    });
    emit('saved', row.id);
  } catch (e) {
    error.value = structureRequestError(e);
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <UModal
    :open="true"
    :title="record ? 'Редактирование сооружения' : 'Новое сооружение'"
    description="Справочник сооружений ОДИС"
    :dismissible="!busy"
    @update:open="
      (v) => {
        if (!v && !busy) emit('close');
      }
    "
  >
    <template #body
      ><form id="odis-structure-editor" class="editor" @submit.prevent="save">
        <label
          >Автодорога<input v-model.trim="form.roadName" list="structure-roads" required /><datalist
            id="structure-roads"
          >
            <option v-for="v in roads" :key="v" :value="v" /></datalist
        ></label>
        <label>Место, км<input v-model.trim="form.location" placeholder="100+350" required /></label
        ><label>Сооружение<input v-model.trim="form.structureName" required /></label>
        <label>Доп. информация<input v-model.trim="form.additionalId" /></label
        ><label
          >Код ИССО<input
            v-model.trim="form.code"
            :readonly="!!record?.issoCode"
            maxlength="200"
            placeholder="Если присвоен"
        /></label>
        <label>Примечание<textarea v-model="form.note" rows="4" maxlength="16000" /></label>
        <p v-if="error" role="alert">{{ error }}</p>
      </form></template
    ><template #footer
      ><UButton variant="outline" :disabled="busy" @click="emit('close')">Отмена</UButton
      ><UButton type="submit" form="odis-structure-editor" :disabled="busy">Сохранить</UButton></template
    ></UModal
  >
</template>
<style scoped>
.editor,
.editor label {
  display: grid;
  gap: 0.3rem;
}
.editor {
  gap: 0.65rem;
}
.editor input,
.editor textarea {
  border: 1px solid var(--ui-border);
  border-radius: 4px;
  background: var(--ui-bg);
  padding: 0.4rem;
}
.editor [role='alert'] {
  color: var(--ui-error);
}
</style>
