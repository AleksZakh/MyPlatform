<script setup lang="ts">
import type { LibraryBook } from "../../../shared/types/library";
import { libraryAssetUrl } from "../../composables/useLibrary";
import "../../assets/css/library.css";
useHead({ title: "Библиотека — Space" });
const lib = useLibrary();
const {
  categories,
  canManage,
  books,
  total,
  page,
  query,
  category,
  trash,
  loading,
  error,
} = lib;
const route = useRoute();
const selected = ref<LibraryBook | null>(null);
const editor = ref(false);
const catalogEditor = ref(false);
const seriesEditor = ref(false);
const removing = ref<LibraryBook | null>(null);
const busy = ref(false);
const group = ref(false);
const mainId = computed(() => {
  const c = categories.value.find((c) => c.id === category.value);
  return c?.parentId || c?.id || null;
});
const children = computed(() =>
  categories.value.filter((c) => c.parentId === mainId.value),
);
const groups = computed(() => {
  if (!group.value) return [{ name: "", books: books.value }];
  const map = new Map<string, LibraryBook[]>();
  for (const b of books.value) {
    const key = [b.series || "Книги", b.year || "Год не указан"].join(" · ");
    map.set(key, [...(map.get(key) || []), b]);
  }
  return Array.from(map, ([name, books]) => ({ name, books }));
});
if (route.query.category && Number.isSafeInteger(Number(route.query.category)))
  category.value = Number(route.query.category);
watch(
  () => route.query.category,
  (v) => lib.select(v ? Number(v) : null),
);
function edit(book: LibraryBook | null) {
  selected.value = book;
  editor.value = true;
}
async function saved() {
  editor.value = false;
  await lib.refresh();
}
async function trashAction(book: LibraryBook, restore = false) {
  busy.value = true;
  try {
    await lib.write(
      `/api/library/books/${book.id}${restore ? "/restore" : ""}`,
      restore ? "POST" : "DELETE",
      { version: book.version },
    );
    removing.value = null;
    await lib.refresh();
  } catch (e) {
    error.value = lib.message(e);
  } finally {
    busy.value = false;
  }
}
function switchTrash() {
  trash.value = !trash.value;
  page.value = 1;
  void lib.load();
}
</script>
<template>
  <main class="space-library">
    <header class="library-heading">
      <div>
        <h1>Электронная библиотека</h1>
        <p>Дорожно-транспортное строительство</p>
      </div>
      <form
        class="library-search"
        @submit.prevent="
          page = 1;
          lib.load();
        "
      >
        <input
          v-model="query"
          aria-label="Поиск по библиотеке"
          placeholder="Название, автор, год, ключевые слова…"
        /><button type="submit" aria-label="Найти">
          <Icon name="lucide:search" />
        </button>
      </form>
    </header>
    <div v-if="canManage" class="library-toolbar">
      <button @click="edit(null)">+ Добавить книгу</button
      ><button @click="catalogEditor = true">Разделы и иконки</button
      ><button @click="seriesEditor = true">Импорт журналов</button
      ><button :aria-pressed="trash" @click="switchTrash">
        {{ trash ? "Вернуться к книгам" : "Корзина" }}
      </button>
    </div>
    <p v-if="error" role="alert" class="library-error">{{ error }}</p>
    <div class="library-layout">
      <section class="library-content" aria-label="Книги">
        <nav class="library-tabs" aria-label="Подразделы">
          <button
            :class="{ active: category === mainId }"
            @click="lib.select(mainId)"
          >
            Все</button
          ><button
            v-for="c in children"
            :key="c.id"
            :class="{ active: category === c.id }"
            @click="lib.select(c.id)"
          >
            {{ c.name }} <small>{{ c.count }}</small>
          </button>
        </nav>
        <div class="library-results">
          <span>{{ trash ? "Корзина · " : "" }}Найдено: {{ total }}</span
          ><label
            ><input v-model="group" type="checkbox" /> Группировать эту страницу
            по изданиям и годам</label
          >
        </div>
        <p v-if="loading" role="status">Загрузка…</p>
        <p v-else-if="!books.length" class="library-empty">
          {{
            query
              ? "По вашему запросу ничего не найдено."
              : trash
                ? "Корзина пуста."
                : "В этом разделе пока нет книг."
          }}
        </p>
        <div v-for="g in groups" :key="g.name">
          <h2 v-if="g.name" class="library-group-title">{{ g.name }}</h2>
          <div class="library-books">
            <LibraryBookCard
              v-for="book in g.books"
              :key="book.id"
              :book="book"
              :can-manage="canManage"
              @edit="edit"
              @remove="removing = $event"
              @restore="trashAction($event, true)"
            />
          </div>
        </div>
        <nav v-if="total > 48" class="library-pagination" aria-label="Страницы">
          <button
            :disabled="page === 1 || loading"
            @click="
              page--;
              lib.load();
            "
          >
            Назад</button
          ><span>{{ page }} / {{ Math.ceil(total / 48) }}</span
          ><button
            :disabled="page * 48 >= total || loading"
            @click="
              page++;
              lib.load();
            "
          >
            Далее
          </button>
        </nav>
      </section>
      <aside class="library-sections" aria-label="Разделы библиотеки">
        <button :class="{ active: !category }" @click="lib.select(null)">
          <Icon name="lucide:library" />Все книги</button
        ><button
          v-for="c in categories.filter((c) => !c.parentId)"
          :key="c.id"
          :class="{ active: mainId === c.id }"
          @click="lib.select(c.id)"
        >
          <img
            v-if="c.iconAssetId"
            :src="libraryAssetUrl(c.iconAssetId)"
            alt=""
          /><Icon v-else :name="c.icon" /><span>{{ c.name }}</span>
        </button>
      </aside>
    </div>
    <LibraryBookEditor
      v-if="canManage && editor"
      :book="selected"
      :categories="categories"
      :selected="category"
      :write="lib.write"
      :upload="lib.upload"
      @close="editor = false"
      @saved="saved"
    />
    <LibraryCatalogEditor
      v-if="canManage && catalogEditor"
      :categories="categories"
      :write="lib.write"
      :upload="lib.upload"
      @close="catalogEditor = false"
      @changed="lib.refresh"
    />
    <LibrarySeriesImport
      v-if="canManage && seriesEditor"
      :categories="categories"
      :write="lib.write"
      :upload="lib.upload"
      @close="seriesEditor = false"
      @changed="lib.refresh"
    />
    <div v-if="removing" class="library-overlay">
      <section
        class="library-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="remove-title"
      >
        <h2 id="remove-title">Переместить книгу в корзину?</h2>
        <p>
          «{{ removing.title }}» будет скрыта во всех разделах. Файлы
          сохранятся, книгу можно восстановить.
        </p>
        <p v-if="error" class="library-error">{{ error }}</p>
        <footer>
          <button :disabled="busy" @click="removing = null">Отмена</button
          ><button :disabled="busy" @click="trashAction(removing)">
            В корзину
          </button>
        </footer>
      </section>
    </div>
  </main>
</template>
