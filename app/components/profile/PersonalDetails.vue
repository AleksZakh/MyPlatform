<script setup lang="ts">
const { profile, details, loading, saving, uploading, error, notice, load, save, avatar, avatarUrl, selectPhoto } = usePersonalProfile();
</script>
<template>
 <section aria-labelledby="personal-title" class="profile-card">
  <h2 id="personal-title">Личные данные</h2>
  <p v-if="loading" role="status">Загрузка личных данных…</p>
  <p v-if="error" role="alert" class="profile-error">{{ error }} <button v-if="!profile" type="button" class="underline" @click="load">Повторить</button></p>
  <template v-if="profile">
   <div class="profile-photo-row">
    <img v-if="avatarUrl" :src="avatarUrl" alt="Ваше фото профиля" width="80" height="80" class="profile-photo">
    <span v-else class="profile-photo profile-placeholder" aria-label="Фото не добавлено">{{ (profile.fullName || profile.login || '?').slice(0, 1) }}</span>
    <div><label class="profile-upload">Добавить / заменить фото<input type="file" accept="image/jpeg,image/png,image/webp" :disabled="uploading || saving" @change="selectPhoto"></label><p class="profile-hint">JPEG, PNG, WebP до 5 МБ и 16 Мп. Фото сохраняется сразу.</p><button v-if="avatarUrl" type="button" class="underline" :disabled="uploading || saving" @click="avatar(null)">Удалить фото</button><p v-if="uploading" role="status">Сохранение фото…</p></div>
   </div>
   <dl class="profile-grid profile-account"><div><dt>ФИО</dt><dd>{{ profile.fullName || 'Не указано' }}</dd></div><div><dt>Адрес учётной записи</dt><dd>{{ profile.accountEmail || 'Не указан' }}</dd></div><div><dt>Организация</dt><dd>{{ profile.organization || 'Не указана' }}</dd></div><div><dt>Должность</dt><dd>{{ profile.position || 'Не указана' }}</dd></div></dl>
   <p class="profile-hint">Данные учётной записи поступают из системы. Контактная почта ниже не меняет адрес для входа или восстановления доступа.</p>
   <form @submit.prevent="save"><fieldset :disabled="saving || uploading" class="profile-fields">
    <div class="profile-grid">
     <label>Псевдоним<input v-model="details.nickname" maxlength="80" autocomplete="nickname"></label>
     <label>Телефон<input v-model="details.phone" type="tel" maxlength="50" autocomplete="tel"></label>
     <label>Контактная электронная почта<input v-model="details.contactEmail" type="email" maxlength="255" autocomplete="email"></label>
     <label>Дополнительная электронная почта<input v-model="details.additionalEmail" type="email" maxlength="255"></label>
    </div>
    <label>Почтовый адрес<textarea v-model="details.postalAddress" rows="2" maxlength="500" autocomplete="street-address" /></label>
    <label>О себе<textarea v-model="details.about" rows="2" maxlength="1000" /></label>
    <UButton type="submit" :loading="saving">Сохранить личные данные</UButton>
   </fieldset></form>
  </template>
  <p v-if="notice" role="status">{{ notice }}</p>
 </section>
</template>
