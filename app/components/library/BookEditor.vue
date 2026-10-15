<script setup lang="ts">
import type {
  LibraryBook,
  LibraryCategory,
} from "../../../shared/types/library";
const props = defineProps<{
  book: LibraryBook | null;
  categories: LibraryCategory[];
  selected: number | null;
  write: (
    url: string,
    method: "POST" | "PUT" | "DELETE",
    body: any,
  ) => Promise<any>;
  upload: (file: File, kind: "pdf" | "image") => Promise<{ id: string }>;
}>();
const emit = defineEmits<{ close: []; saved: [] }>();
const form = reactive({
  clientKey: props.book ? undefined : crypto.randomUUID(),
  title: props.book?.title || "",
  author: props.book?.author || "",
  publisher: props.book?.publisher || "",
  year: props.book?.year || "",
  city: props.book?.city || "",
  keywords: props.book?.keywords || "",
  note: props.book?.note || "",
  series: props.book?.series || "",
  issue: props.book?.issue || "",
  pdfId: props.book?.pdfId || "",
  coverId: props.book?.coverId || (null as string | null),
  categoryIds:
    props.book?.categories.map((c) => c.categoryId) ||
    (props.selected ? [props.selected] : []),
  version: props.book?.version,
});
const pdf = ref<File | null>(null);
const cover = ref<File | null>(null);
const busy = ref(false);
const error = ref("");
function file(e: Event, kind: string) {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (f) {
    if (kind === "pdf") pdf.value = f;
    else cover.value = f;
  }
}
function drop(e: DragEvent, kind: string) {
  const f = e.dataTransfer?.files[0];
  if (f) {
    if (kind === "pdf") pdf.value = f;
    else cover.value = f;
  }
}
function label(c: LibraryCategory) {
  return c.parentId
    ? `${props.categories.find((p) => p.id === c.parentId)?.name} → ${c.name}`
    : c.name;
}
async function save() {
  busy.value = true;
  error.value = "";
  try {
    if (pdf.value) {
      form.pdfId = (await props.upload(pdf.value, "pdf")).id;
      pdf.value = null;
    }
    if (cover.value) {
      form.coverId = (await props.upload(cover.value, "image")).id;
      cover.value = null;
    }
    if (!form.pdfId) throw new Error("Выберите PDF книги.");
    await props.write(
      props.book ? `/api/library/books/${props.book.id}` : "/api/library/books",
      props.book ? "PUT" : "POST",
      form,
    );
    emit("saved");
  } catch (e: any) {
    error.value = e?.data?.message || e.message;
  } finally {
    busy.value = false;
  }
}
useLibraryDialog(() => {
  if (!busy.value) emit("close");
});
</script>
<template>
  <div class="library-overlay" @keydown.esc="!busy && emit('close')">
    <section
      class="library-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="book-editor-title"
    >
      <header>
        <h2 id="book-editor-title">
          {{ book ? "Редактирование книги" : "Новая книга" }}
        </h2>
        <button :disabled="busy" aria-label="Закрыть" @click="emit('close')">
          ×
        </button>
      </header>
      <form @submit.prevent="save">
        <fieldset :disabled="busy">
          <label
            >Название книги *<input
              v-model="form.title"
              required
              maxlength="500"
              autofocus
          /></label>
          <div class="library-form-grid">
            <label>Автор<input v-model="form.author" maxlength="500" /></label
            ><label
              >Издательство<input
                v-model="form.publisher"
                maxlength="300" /></label
            ><label
              >Год издания<input v-model="form.year" maxlength="100" /></label
            ><label>Город<input v-model="form.city" maxlength="500" /></label>
          </div>
          <label>Разделы * <small>Можно отметить несколько</small></label>
          <div class="library-category-picker">
            <label v-for="c in categories" :key="c.id"
              ><input
                v-model="form.categoryIds"
                type="checkbox"
                :value="c.id"
              />{{ label(c) }}</label
            >
          </div>
          <label
            >Ключевые слова<input
              v-model="form.keywords"
              maxlength="2000"
              placeholder="Через запятую" /></label
          ><label
            >Примечания<textarea
              v-model="form.note"
              rows="3"
              maxlength="20000"
            />
          </label>
          <div class="library-form-grid">
            <label
              >Журнал / серия<input
                v-model="form.series"
                maxlength="300" /></label
            ><label
              >Номер выпуска<input v-model="form.issue" maxlength="100"
            /></label>
          </div>
          <div class="library-form-grid">
            <label
              class="library-drop"
              @dragover.prevent
              @drop.prevent="drop($event, 'pdf')"
              >PDF книги (до 100 МБ)<input
                type="file"
                accept="application/pdf,.pdf"
                @change="file($event, 'pdf')"
              /><small>{{
                pdf?.name ||
                (form.pdfId
                  ? "PDF уже загружен"
                  : "Выберите или перетащите файл")
              }}</small></label
            ><label
              class="library-drop"
              @dragover.prevent
              @drop.prevent="drop($event, 'image')"
              >Обложка (до 5 МБ)<input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                @change="file($event, 'image')"
              /><small>{{
                cover?.name ||
                (form.coverId
                  ? "Обложка уже загружена"
                  : "Выберите или перетащите изображение")
              }}</small
              ><button
                v-if="form.coverId || cover"
                type="button"
                @click="
                  form.coverId = null;
                  cover = null;
                "
              >
                Убрать обложку
              </button></label
            >
          </div>
        </fieldset>
        <p v-if="error" role="alert" class="library-error">{{ error }}</p>
        <footer>
          <button type="button" :disabled="busy" @click="emit('close')">
            Отмена</button
          ><button
            class="library-primary"
            :disabled="busy || !form.categoryIds.length"
          >
            {{ busy ? "Сохранение…" : "Сохранить" }}
          </button>
        </footer>
      </form>
    </section>
  </div>
</template>
