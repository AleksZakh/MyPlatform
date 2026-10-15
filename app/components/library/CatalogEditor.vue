<script setup lang="ts">
import type { LibraryCategory } from "../../../shared/types/library";
const props = defineProps<{
  categories: LibraryCategory[];
  write: (u: string, m: "POST" | "PUT" | "DELETE", b: any) => Promise<any>;
  upload: (f: File, k: "pdf" | "image") => Promise<{ id: string }>;
}>();
const emit = defineEmits<{ close: []; changed: [] }>();
const editing = ref<number | null>(null);
const busy = ref(false);
const error = ref("");
const target = ref<number | null>(null);
const deleting = ref<LibraryCategory | null>(null);
const iconFile = ref<File | null>(null);
const form = reactive({
  name: "",
  parentId: null as number | null,
  position: 0,
  icon: "lucide:book-open",
  iconAssetId: null as string | null,
});
const icons = [
  "book-open",
  "graduation-cap",
  "flask-conical",
  "mountain",
  "layers",
  "hard-hat",
  "newspaper",
  "file-text",
  "ruler",
  "code",
];
function edit(c?: LibraryCategory) {
  editing.value = c?.id || null;
  Object.assign(form, {
    name: c?.name || "",
    parentId: c?.parentId || null,
    position: c?.position || 0,
    icon: c?.icon || "lucide:book-open",
    iconAssetId: c?.iconAssetId || null,
  });
  iconFile.value = null;
  error.value = "";
}
async function save() {
  busy.value = true;
  error.value = "";
  try {
    if (iconFile.value) {
      form.iconAssetId = (await props.upload(iconFile.value, "image")).id;
      iconFile.value = null;
    }
    await props.write(
      editing.value
        ? `/api/library/categories/${editing.value}`
        : "/api/library/categories",
      editing.value ? "PUT" : "POST",
      form,
    );
    emit("changed");
    edit();
  } catch (e: any) {
    error.value = e?.data?.message || e.message;
  } finally {
    busy.value = false;
  }
}
async function remove() {
  if (!deleting.value) return;
  busy.value = true;
  error.value = "";
  try {
    await props.write(
      `/api/library/categories/${deleting.value.id}`,
      "DELETE",
      { targetId: target.value },
    );
    deleting.value = null;
    emit("changed");
    edit();
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
  <div class="library-overlay">
    <section
      class="library-dialog library-dialog-wide"
      role="dialog"
      aria-modal="true"
      aria-labelledby="catalog-title"
    >
      <header>
        <h2 id="catalog-title">Управление разделами</h2>
        <button :disabled="busy" aria-label="Закрыть" @click="emit('close')">
          ×
        </button>
      </header>
      <div class="library-catalog-editor">
        <div class="library-category-list">
          <button :disabled="busy" @click="edit()">+ Новый раздел</button>
          <div
            v-for="c in categories"
            :key="c.id"
            :class="{ 'library-child': c.parentId }"
          >
            <button :disabled="busy" @click="edit(c)">
              {{
                c.parentId
                  ? categories.find((p) => p.id === c.parentId)?.name + " → "
                  : ""
              }}{{ c.name }}</button
            ><button
              :disabled="busy"
              aria-label="Удалить раздел"
              @click="
                deleting = c;
                target = null;
                error = '';
              "
            >
              ×
            </button>
          </div>
        </div>
        <form @submit.prevent="save">
          <fieldset :disabled="busy">
            <h3>{{ editing ? "Изменить раздел" : "Добавить раздел" }}</h3>
            <label
              >Название<input
                v-model="form.name"
                required
                maxlength="200" /></label
            ><label
              >Основной раздел<select v-model="form.parentId">
                <option :value="null">Это основной раздел</option>
                <option
                  v-for="c in categories.filter(
                    (c) => !c.parentId && c.id !== editing,
                  )"
                  :key="c.id"
                  :value="c.id"
                >
                  {{ c.name }}
                </option>
              </select></label
            ><label
              >Порядок отображения<input
                v-model.number="form.position"
                type="number"
                min="0"
                max="10000" /></label
            ><label
              >Иконка<select v-model="form.icon">
                <option v-for="i in icons" :key="i" :value="'lucide:' + i">
                  {{ i }}
                </option>
              </select></label
            ><label
              >Своя иконка (SVG/PNG/JPEG, до 5 МБ)<input
                type="file"
                accept=".svg,.png,.jpg,.jpeg,.webp"
                @change="
                  iconFile =
                    ($event.target as HTMLInputElement).files?.[0] || null
                " /></label
            ><button
              v-if="form.iconAssetId"
              type="button"
              @click="form.iconAssetId = null"
            >
              Убрать свою иконку</button
            ><button class="library-primary">
              {{ busy ? "Сохранение…" : "Сохранить" }}
            </button>
          </fieldset>
        </form>
      </div>
      <div v-if="deleting" class="library-delete-panel">
        <p>
          Удалить «{{ deleting.name }}»? Если раздел не пуст, выберите, куда
          перенести книги и подразделы. Книги из корзины также учитываются.
        </p>
        <select v-model="target">
          <option :value="null">Без переноса (только пустой раздел)</option>
          <option
            v-for="c in categories.filter(
              (c) => !c.parentId && c.id !== deleting?.id,
            )"
            :key="c.id"
            :value="c.id"
          >
            {{ c.name }}
          </option></select
        ><button :disabled="busy" @click="remove">Удалить раздел</button
        ><button :disabled="busy" @click="deleting = null">Отмена</button>
      </div>
      <p v-if="error" role="alert" class="library-error">{{ error }}</p>
    </section>
  </div>
</template>
