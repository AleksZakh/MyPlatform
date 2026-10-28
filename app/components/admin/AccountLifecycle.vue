<script setup lang="ts">
import { computed, toRef } from 'vue';
import { useAccountLifecycle } from '~/composables/useAccountLifecycle';
const props=defineProps<{userId:number}>();const emit=defineEmits<{updated:[]}>();
const {data,busy,error,notice,forbidden,action,reason,confirmation,reviewed,load,choose,submit}=useAccountLifecycle(toRef(props,'userId'),()=>emit('updated'));
const labels:Record<string,string>={block:'Заблокировать доступ',disable:'Отключить аккаунт',restore:'Восстановить доступ',delete:'Удалить аккаунт'};
const ready=computed(()=>reviewed.value&&reason.value.trim().length>=3&&(action.value!=='delete'||confirmation.value==='УДАЛИТЬ'));
</script>
<template>
 <section v-if="!forbidden" class="account-lifecycle" :aria-busy="busy">
  <header><div><span class="al-eyebrow">УПРАВЛЕНИЕ АККАУНТОМ</span><h3>Доступ внешнего сотрудника</h3></div><Icon name="lucide:shield-user"/></header>
  <p v-if="notice" role="status">{{notice}}</p><p v-if="error" class="al-error" role="alert">{{error}} <button type="button" :disabled="busy" @click="load">Обновить сведения</button></p>
  <p v-if="busy&&!data" role="status">Загрузка сведений…</p>
  <template v-if="data">
   <p v-if="data.user.deletedAt">Аккаунт удалён. Рабочая история сохранена под именем «Удалённый аккаунт». Восстановление невозможно.</p>
   <template v-else>
    <p>Блокировка и отключение обратимы. Удаление необратимо и обезличивает профиль.</p>
    <div class="al-actions">
     <template v-if="data.capabilities.update&&data.user.canRestore">
      <button v-if="data.user.status!=='BLOCKED'" :disabled="busy" @click="choose('block')">Заблокировать</button>
      <button v-if="data.user.status!=='DISABLED'" :disabled="busy" @click="choose('disable')">Отключить</button>
      <button v-if="['BLOCKED','DISABLED'].includes(data.user.status)" :disabled="busy" @click="choose('restore')">Восстановить доступ</button>
     </template>
     <button v-if="data.capabilities.delete" class="al-danger" :disabled="busy" @click="choose('delete')">Удалить аккаунт</button>
    </div>
    <form v-if="action" class="al-confirm" @submit.prevent="submit">
     <h4>{{labels[action]}}: {{data.user.name}}</h4>
     <dl><div><dt>Проекты во владении</dt><dd>{{data.impact.projects.length}}</dd></div><div><dt>Незавершённые задачи: автор или исполнитель</dt><dd>{{data.impact.tasks}}</dd></div><div><dt>Личные файлы проектов</dt><dd>{{data.impact.privateFiles}}</dd></div><div><dt>Сообщения в чате</dt><dd>{{data.impact.messages}}</dd></div></dl>
     <ul v-if="data.impact.projects.length"><li v-for="project in data.impact.projects" :key="project.id">{{project.name}} · #{{project.id}}</li></ul>
     <p v-if="action==='delete'">Имя, почта, аватар, данные входа и права будут удалены. Сообщения и рабочие документы сохранятся с автором «Удалённый аккаунт». Личные файлы не станут общими. Перед удалением передайте ответственность за проекты и задачи; оставленные личные файлы будут недоступны через этот аккаунт.</p>
     <p v-else-if="action==='restore'">Доступ будет восстановлен с сохранёнными правами. Сотруднику потребуется войти заново. Отменённые приглашения не восстанавливаются.</p>
     <p v-else>Доступ прекратится, прежние сессии и неиспользованные ссылки восстановления будут отозваны. Незавершённые приглашения отменяются. Данные и назначения сохраняются.</p>
     <label>Причина<textarea v-model="reason" required minlength="3" maxlength="500" rows="2" :disabled="busy" placeholder="Например: завершение договора"/></label>
     <label v-if="action==='delete'">Для подтверждения введите УДАЛИТЬ<input v-model="confirmation" autocomplete="off" :disabled="busy"/></label>
     <label class="al-check"><input v-model="reviewed" type="checkbox" :disabled="busy"/>Я проверил связанные данные и понимаю последствия действия.</label>
     <div class="al-actions"><button type="submit" :class="{'al-danger':action==='delete'}" :disabled="busy||!ready">{{busy?'Сохранение…':labels[action]}}</button><button type="button" :disabled="busy" @click="action=''">Отмена</button></div>
    </form>
   </template>
  </template>
 </section>
</template>
<style scoped>
.account-lifecycle{margin-bottom:18px;padding:18px;border:1px solid var(--space-line,#dbe4ef);border-radius:10px;background:var(--space-surface,#fff);box-shadow:0 3px 12px #173a6410;color:var(--space-text,#414b5a);font-size:14px}.account-lifecycle header{display:flex;justify-content:space-between;align-items:center;gap:12px}.account-lifecycle h3{font-size:17px;margin:4px 0 8px;font-weight:600}.al-eyebrow{font-size:10px;letter-spacing:.08em;color:var(--space-muted,#717b8b)}.account-lifecycle p{margin:8px 0;line-height:1.65}.al-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.account-lifecycle button{padding:8px 12px;background:var(--space-selection,var(--space-blue-soft, #eff6ff));color:var(--space-accent,var(--space-blue-accent, #2563eb));border:1px solid var(--space-line,#dbe4ef);border-radius:6px;font:inherit;cursor:pointer}.account-lifecycle button:disabled{opacity:.5;cursor:default}.account-lifecycle .al-danger{color:var(--space-danger,#b83232);background:var(--space-danger-bg,#fff0ee)}.al-error{color:var(--space-danger,#b83232)}.al-confirm{border-top:1px solid var(--space-line,#dbe4ef);margin-top:16px;padding-top:16px}.al-confirm h4{font-weight:600}.al-confirm dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:12px 0}.al-confirm dl>div{padding:10px;background:var(--space-panel,#f5f5f9);border-radius:7px}.al-confirm dt{font-size:12px}.al-confirm dd{font-size:20px;margin:0}.al-confirm label{display:flex;flex-direction:column;gap:6px;margin-top:12px}.al-confirm input:not([type=checkbox]),.al-confirm textarea{width:100%;padding:9px;border:1px solid var(--space-line,#ddd);border-radius:6px;background:var(--space-surface,#fff);color:inherit;font:inherit;box-sizing:border-box}.al-confirm .al-check{flex-direction:row;align-items:flex-start}.account-lifecycle :is(button,input,textarea):focus-visible{outline:2px solid var(--space-accent,var(--space-blue-accent, #2563eb));outline-offset:3px}@media(max-width:600px){.al-confirm dl{grid-template-columns:1fr}}
</style>
