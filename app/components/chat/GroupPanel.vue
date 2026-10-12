<script setup lang="ts">
import { useChatGroupEditor } from '~/composables/useChatGroupEditor';
const props = defineProps<{ groupId?: number }>();
const emit = defineEmits<{ changed: [id: number] }>();
const editor = useChatGroupEditor(() => props.groupId, id => emit('changed', id));
const { open, group, name, search, candidates, selected, more, loading, busy, error, confirmation, attempt, myId, owner, manager } = editor;
const roleName = (role: string) => (({ OWNER: 'Владелец', ADMIN: 'Администратор', MEMBER: 'Участник' } as Record<string, string>)[role] || role);
</script>
<template>
 <UModal v-model:open="open" :dismissible="!busy" :title="groupId ? 'Участники и настройки группы' : 'Создать группу'" description="Все участники группы видят полную историю переписки" :ui="{ content: 'sm:max-w-2xl', body: 'max-h-[75dvh] overflow-y-auto' }">
  <UButton size="xs" variant="soft" :icon="groupId ? 'i-lucide-users' : 'i-lucide-users-round'">{{ groupId ? 'Участники' : 'Создать группу' }}</UButton>
  <template #body>
   <div class="space-y-4">
    <p v-if="error" role="alert" class="text-red-600">{{ error }}</p>
    <p class="text-sm text-gray-500">Новые участники получают доступ ко всей истории. До 100 участников.</p>
    <template v-if="!groupId || group">
     <label class="block text-sm">Название группы
      <input v-model="name" maxlength="120" :disabled="busy || !!attempt || (!!groupId && (!manager || group?.archived))" class="block mt-1 w-full rounded border p-2 bg-transparent" />
     </label>
     <UButton v-if="groupId && manager && !group?.archived" size="sm" :disabled="busy || !name.trim() || name.trim() === group?.name" @click="editor.change({action:'rename',name:name.trim()})">Сохранить название</UButton>
     <p v-if="group?.archived" class="text-amber-700">Группа в архиве. История доступна, отправка сообщений отключена.</p>
     <div v-if="group" class="space-y-2">
      <h4 class="font-semibold">Участники: {{ group.members.length }}</h4>
      <div v-for="member in group.members" :key="member.id" class="border-b py-2 flex flex-wrap items-center justify-between gap-2">
       <div><span>{{ member.fullName || member.login }}</span><span class="block text-xs text-gray-500">{{ roleName(member.role) }}{{ member.status !== 'ACTIVE' ? ' · Учётная запись неактивна' : '' }}</span></div>
       <div v-if="member.id !== myId" class="flex flex-wrap gap-1">
        <UButton v-if="owner && !group.archived && member.status === 'ACTIVE'" size="xs" variant="ghost" :disabled="busy" @click="editor.confirm('Изменить роль этого участника?', {action:'role',userId:member.id,role:member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN'})">{{ member.role === 'ADMIN' ? 'Снять администратора' : 'Назначить администратором' }}</UButton>
        <UButton v-if="owner && member.status === 'ACTIVE'" size="xs" variant="ghost" :disabled="busy" @click="editor.confirm('Передать владение группой этому участнику? Вы станете администратором.', {action:'transfer',userId:member.id})">Передать владение</UButton>
        <UButton v-if="!group.archived && (owner || (manager && member.role === 'MEMBER'))" size="xs" color="error" variant="ghost" :disabled="busy" @click="editor.confirm('Исключить участника? Он потеряет доступ к группе; его сообщения сохранятся.', {action:'remove',userId:member.id})">Исключить</UButton>
       </div>
      </div>
     </div>
     <div v-if="!groupId || (manager && !group?.archived)" class="space-y-2">
      <h4 class="font-semibold">{{ groupId ? 'Добавить участников' : 'Выбрать участников' }}</h4>
      <UInput v-model="search" placeholder="Имя или логин" aria-label="Поиск участников группы" class="w-full" :disabled="busy || !!attempt" />
      <p class="text-xs text-gray-500">Здесь показаны активированные пользователи. Остальных сначала пригласите в Space через поиск контактов.</p>
      <div class="max-h-48 overflow-y-auto space-y-1">
       <label v-for="person in candidates" :key="person.id" class="flex items-center gap-2 p-2">
        <input type="checkbox" :checked="selected.includes(person.id)" :disabled="busy || !!attempt" @change="editor.toggle(person.id)" />
        <span>{{ person.fullName || person.login }}<span v-if="person.department" class="block text-xs text-gray-500">{{ person.department }}</span></span>
       </label>
       <p v-if="!candidates.length && !loading" class="text-sm text-gray-500">Подходящие пользователи не найдены.</p>
       <p v-if="loading" role="status">Загрузка…</p>
       <UButton v-if="more" size="xs" variant="ghost" :loading="loading" @click="editor.loadCandidates(true)">Показать ещё</UButton>
      </div>
      <p class="text-sm">Выбрано: {{ selected.length }}</p>
      <UButton v-if="!groupId" :loading="busy" :disabled="!name.trim() || !selected.length || selected.length > 99" @click="editor.create">{{ attempt ? 'Повторить создание' : 'Создать группу' }}</UButton>
      <UButton v-else :loading="busy" :disabled="!selected.length || selected.length + (group?.members.length || 0) > 100" @click="editor.change({action:'add',userIds:selected})">Добавить выбранных</UButton>
     </div>
     <div v-if="group" class="flex flex-wrap gap-2 pt-3 border-t">
      <UButton v-if="owner" variant="soft" :disabled="busy" @click="editor.confirm(group.archived ? 'Восстановить группу?' : 'Поместить группу в архив? Переписка сохранится, отправка сообщений будет отключена.', {action:'archive',archived:!group.archived})">{{ group.archived ? 'Восстановить группу' : 'В архив' }}</UButton>
      <UButton v-if="!owner" color="error" variant="soft" :disabled="busy" @click="editor.confirm('Выйти из группы? Доступ к истории закроется до повторного добавления.', {action:'leave'})">Выйти из группы</UButton>
      <p v-else class="text-xs text-gray-500">Для выхода сначала передайте владение другому активному участнику.</p>
     </div>
    </template>
    <p v-else role="status">Загрузка группы…</p>
    <div v-if="confirmation" class="sticky bottom-0 rounded border p-3 bg-white dark:bg-gray-900 space-y-2" role="alert">
     <p>{{ confirmation.text }}</p>
     <div class="flex gap-2"><UButton :loading="busy" @click="editor.change(confirmation.body)">Подтвердить</UButton><UButton variant="ghost" :disabled="busy" @click="confirmation = null">Отмена</UButton></div>
    </div>
   </div>
  </template>
 </UModal>
</template>
