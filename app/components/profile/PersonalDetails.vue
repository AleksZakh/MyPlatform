<script setup lang="ts">
const { profile, details, loading, saving, uploading, error, notice, load, save, avatar, avatarUrl, selectPhoto } = usePersonalProfile();
</script>
<template>
  <section aria-labelledby="personal-title" class="profile-card profile-personal-card">
    <div class="profile-card-heading">
      <h2 id="personal-title">Личные данные</h2>
      <p>Сведения из учётной записи и ваши контактные данные.</p>
    </div>
    <p v-if="loading" role="status">Загрузка личных данных…</p>
    <p v-if="error" role="alert" class="profile-error">{{ error }} <button v-if="!profile" type="button" class="underline" @click="load">Повторить</button></p>
    <div v-if="profile" class="profile-personal-layout">
      <div class="profile-identity">
        <div class="profile-photo-row">
          <img v-if="avatarUrl" :src="avatarUrl" alt="Ваше фото профиля" width="66" height="66" class="profile-photo">
          <span v-else class="profile-photo profile-placeholder" aria-label="Фото не добавлено">{{ (profile.fullName || profile.login || '?').slice(0, 1) }}</span>
          <div>
            <label class="profile-upload">Добавить / заменить фото
              <input type="file" accept="image/jpeg,image/png,image/webp" :disabled="uploading || saving" @change="selectPhoto">
            </label>
            <p class="profile-hint">JPEG, PNG, WebP до 5 МБ и 16 Мп.</p>
            <button v-if="avatarUrl" type="button" class="underline" :disabled="uploading || saving" @click="avatar(null)">Удалить фото</button>
            <p v-if="uploading" role="status">Сохранение фото…</p>
          </div>
        </div>
        <dl class="profile-grid profile-account">
          <div><dt>ФИО</dt><dd>{{ profile.fullName || 'Не указано' }}</dd></div>
          <div><dt>Адрес учётной записи</dt><dd>{{ profile.accountEmail || 'Не указан' }}</dd></div>
          <div><dt>Организация</dt><dd>{{ profile.organization || 'Не указана' }}</dd></div>
          <div><dt>Должность</dt><dd>{{ profile.position || 'Не указана' }}</dd></div>
        </dl>
        <p class="profile-hint">Эти сведения поступают из системы. Контактная почта не меняет адрес для входа.</p>
      </div>
      <form class="profile-personal-form" @submit.prevent="save">
        <fieldset :disabled="saving || uploading" class="profile-fields">
          <div class="profile-grid profile-contact-fields">
            <label>Псевдоним<input v-model="details.nickname" maxlength="80" autocomplete="nickname"></label>
            <label>Телефон<input v-model="details.phone" type="tel" maxlength="50" autocomplete="tel"></label>
            <label>Контактная электронная почта<input v-model="details.contactEmail" type="email" maxlength="255" autocomplete="email"></label>
            <label>Дополнительная электронная почта<input v-model="details.additionalEmail" type="email" maxlength="255"></label>
            <label>Почтовый адрес<textarea v-model="details.postalAddress" rows="2" maxlength="500" autocomplete="street-address" /></label>
            <label>О себе<textarea v-model="details.about" rows="2" maxlength="1000" /></label>
          </div>
          <div class="profile-form-actions"><UButton type="submit" :loading="saving">Сохранить личные данные</UButton></div>
        </fieldset>
      </form>
    </div>
    <p v-if="notice" role="status" class="profile-feedback">{{ notice }}</p>
  </section>
</template>
