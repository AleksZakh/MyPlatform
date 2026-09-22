<script setup lang="ts">
import { useDomainGroupImport } from '~/composables/useDomainGroupImport'
import type { AccessSubjectOption } from '~~/shared/types/access-management'
const emit = defineEmits<{ imported: [item: AccessSubjectOption] }>()
const { query, items, busy, error, hasMore, search, add } = useDomainGroupImport(item => emit('imported', item))
</script>
<template>
  <details class="group-import">
    <summary>Добавить группу из AD</summary>
    <form @submit.prevent="search">
      <label>Название группы<input v-model="query" type="search" minlength="2" maxlength="120" required placeholder="Не менее 2 символов" /></label>
      <button :disabled="busy" type="submit">{{ busy ? 'Проверка AD…' : 'Найти в AD' }}</button>
    </form>
    <p v-if="error" role="alert">{{ error }}</p>
    <ul><li v-for="item in items" :key="item.directoryObjectId">
      <button type="button" :disabled="busy" @click="add(item)"><strong>{{ item.name }}</strong><small>{{ item.distinguishedName }}</small><small>{{ item.directoryObjectId }}</small><span>Добавить и назначить права →</span></button>
    </li></ul>
    <p v-if="hasMore">Показаны первые 50 групп. Уточните поиск.</p>
    <small>Доступно системному администратору. Поддерживаются вложенные группы безопасности. Членство через основную группу AD (например, Domain Users) не учитывается.</small>
  </details>
</template>
<style scoped>
.group-import { border: 1px solid #dce4ed; border-radius: 8px; padding: 9px; font-size: 12px; }
summary { cursor: pointer; color: #315f96; } form { margin-top: 10px; } label, small, strong, span { display: block; }
input { width: 100%; box-sizing: border-box; margin: 5px 0; padding: 6px; border: 1px solid #becada; border-radius: 5px; }
button { cursor: pointer; color: #25486d; background: white; border: 1px solid #becada; border-radius: 6px; padding: 6px; text-align: left; }
button:disabled { opacity: .55; cursor: default; } ul { list-style: none; padding: 0; max-height: 220px; overflow: auto; }
li { margin-top: 6px; } li button { width: 100%; } small { color: #63758b; line-height: 1.5; overflow-wrap: anywhere; margin-top: 5px; }
[role=alert] { color: #962c25; }
</style>
