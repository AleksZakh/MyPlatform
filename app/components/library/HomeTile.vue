<script setup lang="ts">
import type { LibraryCategory } from "../../../shared/types/library";
const { data } = await useFetch<{ categories: LibraryCategory[] }>(
  "/api/library/catalog",
  { key: "library-home-catalog" },
);
const links = computed(
  () => data.value?.categories.filter((c) => !c.parentId).slice(0, 6) || [],
);
</script>
<template>
  <section class="mt-8">
    <h2 class="text-xl font-semibold mb-4">Общие сервисы</h2>
    <UCard class="max-w-xl"
      ><NuxtLink to="/library" class="text-lg font-semibold"
        ><Icon name="lucide:library" /> Библиотека</NuxtLink
      >
      <p class="text-sm my-3">
        Книги, журналы и нормативные документы для всех сотрудников.
      </p>
      <div class="flex flex-wrap gap-3">
        <NuxtLink
          v-for="c in links"
          :key="c.id"
          :to="{ path: '/library', query: { category: c.id } }"
          class="underline"
          >{{ c.name }}</NuxtLink
        >
      </div>
      <NuxtLink to="/library" class="inline-block mt-4"
        >Открыть библиотеку →</NuxtLink
      ></UCard
    >
  </section>
</template>
