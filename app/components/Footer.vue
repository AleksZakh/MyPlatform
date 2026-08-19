<template>
  <UFooter class="bg-sky-100">
    <template #left>
      <div>
        <UColorModeButton class="mr-5" />
      </div>
      <div class="flex items-center gap-0.5 text-sm">
        <p>Copyright</p>
        <Icon name="streamline-freehand-color:form-validation-check-square-1" />
        <p>{{ new Date().getFullYear() }}</p>
      </div>
      <div class="ml-8 flex items-center gap-1 hover:underline ">
        <Icon name="streamline-freehand-color:settings-wrench-double"/>
        <a class="hover:decoration-solid" href="mailto:a.zakharov@avtodor-eng.ru">Техническая поддержка</a>
      </div>
    </template>

    <template #default>
      <!-- <UColorModeSelect /> -->
    </template>

    <!-- <UNavigationMenu :items="items" variant="link" /> -->

    <template #right>
      <UButton
        icon="i-simple-icons-discord"
        color="neutral"
        variant="ghost"
        to="https://go.nuxt.com/discord"
        target="_blank"
        aria-label="Discord"
      />
      <UButton
        icon="i-simple-icons-x"
        color="neutral"
        variant="ghost"
        to="https://go.nuxt.com/x"
        target="_blank"
        aria-label="X"
      />
      <UButton
        icon="i-simple-icons-github"
        color="neutral"
        variant="ghost"
        to="https://github.com/nuxt/nuxt"
        target="_blank"
        aria-label="GitHub"
      />
    </template>
  </UFooter>
</template>
<script setup lang="ts"></script>

<style scoped></style>
