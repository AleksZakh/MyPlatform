<script setup lang="ts">
import type { LibraryBook } from "../../../shared/types/library";
import { libraryAssetUrl } from "../../composables/useLibrary";
defineProps<{ book: LibraryBook; canManage: boolean }>();
defineEmits<{
  edit: [book: LibraryBook];
  remove: [book: LibraryBook];
  restore: [book: LibraryBook];
}>();
</script>
<template>
  <article class="library-card">
    <a
      :href="libraryAssetUrl(book.pdfId)"
      target="_blank"
      rel="noopener"
      :title="`Открыть: ${book.title}`"
      class="library-cover"
    >
      <img
        v-if="book.coverId"
        :src="libraryAssetUrl(book.coverId)"
        :alt="book.title"
        loading="lazy"
      />
      <span v-else class="library-placeholder"
        ><Icon name="lucide:book-open" /><span>{{ book.title }}</span></span
      >
    </a>
    <a
      :href="libraryAssetUrl(book.pdfId)"
      target="_blank"
      rel="noopener"
      class="library-title"
      :title="[book.title, book.author, book.note].filter(Boolean).join(' — ')"
      >{{ book.title }}</a
    >
    <small :title="book.author">{{ book.author || "Автор не указан" }}</small>
    <small v-if="book.series">{{ book.series }} · {{ book.issue }} </small>
    <div class="library-card-actions">
      <span>{{ book.year }}</span
      ><a
        :href="libraryAssetUrl(book.pdfId, true)"
        title="Скачать PDF"
        aria-label="Скачать PDF"
        ><Icon name="lucide:download"
      /></a>
      <template v-if="canManage"
        ><button
          v-if="!book.deletedAt"
          title="Редактировать"
          aria-label="Редактировать книгу"
          @click="$emit('edit', book)"
        >
          <Icon name="lucide:pencil" /></button
        ><button
          v-if="!book.deletedAt"
          title="В корзину"
          aria-label="Переместить книгу в корзину"
          @click="$emit('remove', book)"
        >
          <Icon name="lucide:square-x" /></button
        ><button v-else title="Восстановить" @click="$emit('restore', book)">
          <Icon name="lucide:undo-2" /></button
      ></template>
    </div>
  </article>
</template>
