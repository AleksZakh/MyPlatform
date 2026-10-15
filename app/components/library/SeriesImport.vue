<script setup lang="ts">
import type { LibraryCategory } from "../../../shared/types/library";
const props = defineProps<{
  categories: LibraryCategory[];
  write: (u: string, m: "POST" | "PUT" | "DELETE", b: any) => Promise<any>;
  upload: (f: File, k: "pdf" | "image") => Promise<{ id: string }>;
}>();
const emit = defineEmits<{ close: []; changed: [] }>();
const series = ref("");
const publisher = ref("");
const city = ref("");
const category = ref<number | null>(null);
const groupYears = ref(true);
const busy = ref(false);
const rows = ref<
  {
    file: File;
    clientKey: string;
    title: string;
    year: string;
    issue: string;
    pdfId?: string;
    done: boolean;
    error: string;
  }[]
>([]);
function select(e: Event) {
  rows.value = Array.from((e.target as HTMLInputElement).files || [])
    .filter((f) => f.name.toLowerCase().endsWith(".pdf"))
    .map((file) => ({
      file,
      clientKey: crypto.randomUUID(),
      title: file.name.replace(/\.pdf$/i, ""),
      year:
        /(?:19|20)\d{2}/.exec(file.webkitRelativePath || file.name)?.[0] || "",
      issue: "",
      done: false,
      error: "",
    }));
}
async function run() {
  if (!category.value || !series.value.trim()) return;
  busy.value = true;
  try {
    for (const r of rows.value.filter((r) => !r.done)) {
      r.error = "";
      try {
        r.pdfId ||= (await props.upload(r.file, "pdf")).id;
        await props.write("/api/library/books", "POST", {
          clientKey: r.clientKey,
          title: r.title,
          series: series.value,
          publisher: publisher.value,
          city: city.value,
          year: groupYears.value ? r.year : "",
          issue: r.issue,
          pdfId: r.pdfId,
          categoryIds: [category.value],
        });
        r.done = true;
      } catch (e: any) {
        r.error = e?.data?.message || e.message;
      }
    }
    emit("changed");
  } finally {
    busy.value = false;
  }
}
useLibraryDialog(() => {
  if (!busy.value) emit("close");
});
</script>
<template>
  <div class="library-overlay">
    <section
      class="library-dialog library-dialog-wide"
      role="dialog"
      aria-modal="true"
      aria-labelledby="series-title"
    >
      <header>
        <h2 id="series-title">Импорт подборки журналов</h2>
        <button :disabled="busy" aria-label="Закрыть" @click="emit('close')">
          ×
        </button>
      </header>
      <fieldset :disabled="busy">
        <label
          >Название журнала *<input v-model="series" maxlength="300"
        /></label>
        <div class="library-form-grid">
          <label
            >Издательство<input v-model="publisher" maxlength="300" /></label
          ><label>Город<input v-model="city" maxlength="500" /></label>
        </div>
        <label
          >Раздел *<select v-model="category">
            <option :value="null">Выберите раздел</option>
            <option v-for="c in categories" :key="c.id" :value="c.id">
              {{
                c.parentId
                  ? categories.find((p) => p.id === c.parentId)?.name + " → "
                  : ""
              }}{{ c.name }}
            </option>
          </select></label
        ><label
          ><input v-model="groupYears" type="checkbox" /> Определять год из пути
          / имени файла</label
        ><label
          >Выбрать папку<input
            type="file"
            webkitdirectory
            multiple
            @change="select" /></label
        ><label
          >Или выбрать PDF-файлы<input
            type="file"
            multiple
            accept=".pdf"
            @change="select"
        /></label>
      </fieldset>
      <p>
        Перед импортом проверьте названия и годы. Файлы загружаются
        последовательно; успешные строки при повторе пропускаются.
      </p>
      <div class="library-import-list">
        <div v-for="(r, i) in rows" :key="i">
          <input
            v-model="r.title"
            aria-label="Название выпуска"
            :disabled="busy || r.done"
          /><input
            v-model="r.year"
            aria-label="Год"
            placeholder="Год"
            :disabled="busy || r.done"
          /><input
            v-model="r.issue"
            aria-label="Номер выпуска"
            placeholder="Номер"
            :disabled="busy || r.done"
          /><span>{{ r.done ? "✓ Импортирован" : r.file.name }}</span>
          <p v-if="r.error" class="library-error">{{ r.error }}</p>
        </div>
      </div>
      <footer>
        <span>{{ rows.filter((r) => r.done).length }} / {{ rows.length }}</span
        ><button
          class="library-primary"
          :disabled="
            busy || !category || !series.trim() || !rows.some((r) => !r.done)
          "
          @click="run"
        >
          {{ busy ? "Импорт…" : "Импортировать" }}
        </button>
      </footer>
    </section>
  </div>
</template>
