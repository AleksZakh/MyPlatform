import type {
  LibraryBook,
  LibraryCategory,
  LibraryList,
} from "../../shared/types/library";
export const libraryAssetUrl = (id: string, download = false) =>
  `/api/library/assets/${id}${download ? "?download=1" : ""}`;
export function useLibrary(options: { beforeInitialLoad?: () => void } = {}) {
  const categories = ref<LibraryCategory[]>([]);
  const canManage = ref(false);
  const books = ref<LibraryBook[]>([]);
  const total = ref(0);
  const page = ref(1);
  const query = ref("");
  const category = ref<number | null>(null);
  const trash = ref(false);
  const loading = ref(false);
  const error = ref("");
  let request = 0;
  const message = (e: any) =>
    e?.data?.message ||
    e?.data?.statusMessage ||
    e?.message ||
    "Не удалось выполнить действие.";
  async function catalog() {
    const r = await $fetch<{
      categories: LibraryCategory[];
      canManage: boolean;
    }>("/api/library/catalog");
    categories.value = r.categories;
    canManage.value = r.canManage;
  }
  async function load() {
    const seq = ++request;
    loading.value = true;
    error.value = "";
    try {
      const r = await $fetch<LibraryList>("/api/library/books", {
        query: {
          page: page.value,
          q: query.value,
          category: category.value || undefined,
          trash: trash.value ? "1" : undefined,
        },
      });
      if (seq === request) {
        books.value = r.books;
        total.value = r.total;
      }
    } catch (e) {
      if (seq === request) error.value = message(e);
    } finally {
      if (seq === request) loading.value = false;
    }
  }
  async function refresh() {
    try {
      await catalog();
      await load();
    } catch (e) {
      error.value = message(e);
    }
  }
  function select(id: number | null) {
    category.value = id;
    page.value = 1;
    void load();
  }
  async function write(
    url: string,
    method: "POST" | "PUT" | "DELETE",
    body: any,
  ) {
    return $fetch(url, { method, headers: { "x-space-library": "1" }, body });
  }
  async function upload(file: File, kind: "pdf" | "image") {
    const limit = kind === "pdf" ? 100 : 5;
    if (file.size > limit * 1024 * 1024)
      throw new Error(`Максимальный размер: ${limit} МБ.`);
    return $fetch<{ id: string }>(`/api/library/assets?kind=${kind}`, {
      method: "POST",
      headers: {
        "x-space-library": "1",
        "x-file-name": encodeURIComponent(file.name),
        "Content-Type": "application/octet-stream",
      },
      body: file,
    });
  }
  onMounted(async () => {
    try {
      await catalog();
      options.beforeInitialLoad?.();
      await load();
    } catch (e) { error.value = message(e); }
  });
  return {
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
    load,
    refresh,
    catalog,
    select,
    write,
    upload,
    message,
  };
}
