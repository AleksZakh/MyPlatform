<script setup lang="ts">
import type { ChatMessageDto } from '~~/shared/types/chat';
import { useChatMessageActions } from '~/composables/useChatMessageActions';
const props = defineProps<{ message: ChatMessageDto; canChange: boolean }>();
const emit = defineEmits<{ changed: [message: ChatMessageDto] }>();
const actions = useChatMessageActions(() => props.message, () => props.canChange && !props.message.deletedAt, value => emit('changed', value));
const { menu, editing, deleting, busy, error, text } = actions;
</script>
<template>
 <div class="min-w-0">
  <p v-if="message.deletedAt" class="italic text-sm">Сообщение удалено</p>
  <template v-else>
   <div class="flex items-start gap-2">
    <p v-if="!editing" class="flex-1 min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{{ message.body }}</p>
    <span v-else class="text-sm font-medium">Редактирование сообщения</span>
    <UButton v-if="canChange" size="xs" color="neutral" variant="ghost" aria-label="Действия с сообщением" :aria-expanded="menu" :disabled="busy" @click="menu = !menu">⋯</UButton>
   </div>
   <div v-if="menu && canChange" class="flex flex-wrap gap-2 py-2" @keydown.esc.stop="menu = false">
    <UButton size="xs" variant="outline" color="neutral" @click="actions.edit">Редактировать</UButton>
    <UButton size="xs" variant="outline" color="error" @click="actions.remove">Удалить</UButton>
   </div>
   <form v-if="editing" class="space-y-2 mt-2" @submit.prevent="actions.submit('edit')" @keydown.esc.stop="actions.cancel">
    <textarea v-model="text" aria-label="Изменённый текст сообщения" rows="3" maxlength="4000" :disabled="busy || !canChange" class="block w-full min-w-0 rounded border p-2 bg-transparent" />
    <div class="flex flex-wrap gap-2"><UButton type="submit" size="xs" :loading="busy" :disabled="!canChange || !text.trim()">Сохранить</UButton><UButton type="button" size="xs" color="neutral" variant="outline" :disabled="busy" @click="actions.cancel">Отмена</UButton></div>
   </form>
   <div v-if="deleting" class="border rounded p-2 mt-2 space-y-2" @keydown.esc.stop="actions.cancel">
    <p class="text-sm">Удалить сообщение у всех участников? Вместо текста останется «Сообщение удалено».</p>
    <div class="flex flex-wrap gap-2"><UButton size="xs" color="error" :loading="busy" :disabled="!canChange" @click="actions.submit('delete')">Удалить у всех</UButton><UButton size="xs" variant="outline" color="neutral" :disabled="busy" @click="actions.cancel">Отмена</UButton></div>
   </div>
  </template>
  <p v-if="error" role="alert" class="text-sm text-red-700 mt-2">{{ error }}</p>
 </div>
</template>
