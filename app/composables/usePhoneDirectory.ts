import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import type { ContactDTO, ContactsResponse } from '~~/shared/types/contacts';

export function usePhoneDirectory() {
  const contacts = ref<ContactDTO[]>([]);
  const loading = ref(true);
  const error = ref('');
  const lastUpdated = ref('');
  const search = ref('');
  const department = ref('');
  const page = ref(1);
  const pageSize = 25;
  const sortKey = ref<Exclude<keyof ContactDTO, 'id'>>('fullName');
  const descending = ref(false);
  const collator = new Intl.Collator('ru', {
    numeric: true,
    sensitivity: 'base',
  });
  const normalize = (text: string) =>
    text.trim().toLocaleLowerCase('ru-RU').replace(/ё/g, 'е');
  const departments = computed(() =>
    [...new Set(contacts.value.map((c) => c.department).filter(Boolean))].sort(
      collator.compare,
    ),
  );
  const filtered = computed(() => {
    const words = normalize(search.value).split(/\s+/).filter(Boolean);
    return contacts.value
      .filter((contact) => {
        if (department.value && contact.department !== department.value)
          return false;
        const text = normalize(
          [
            contact.fullName,
            contact.telephoneNumber,
            contact.email,
            contact.department,
            contact.position,
          ].join(' '),
        );
        return words.every((word) => text.includes(word));
      })
      .sort(
        (a, b) =>
          (descending.value ? -1 : 1) *
          collator.compare(a[sortKey.value], b[sortKey.value]),
      );
  });
  const pageCount = computed(() =>
    Math.max(1, Math.ceil(filtered.value.length / pageSize)),
  );
  const start = computed(() => (page.value - 1) * pageSize);
  const end = computed(() =>
    Math.min(start.value + pageSize, filtered.value.length),
  );
  const rows = computed(() => filtered.value.slice(start.value, end.value));
  const updatedLabel = computed(() => {
    const date = new Date(lastUpdated.value);
    return Number.isNaN(date.getTime())
      ? ''
      : new Intl.DateTimeFormat('ru-RU', {
          dateStyle: 'short',
          timeStyle: 'short',
          timeZone: 'Europe/Moscow',
        }).format(date);
  });
  watch([search, department, sortKey, descending], () => {
    page.value = 1;
  });
  watch(pageCount, (value) => {
    page.value = Math.min(page.value, value);
  });
  function sort(key: typeof sortKey.value) {
    if (sortKey.value === key) descending.value = !descending.value;
    else {
      sortKey.value = key;
      descending.value = false;
    }
  }
  let controller: AbortController | undefined;
  async function load() {
    controller?.abort();
    const request = new AbortController();
    controller = request;
    loading.value = true;
    error.value = '';
    try {
      const data = await $fetch<ContactsResponse>('/api/contacts', {
        signal: request.signal,
      });
      if (request.signal.aborted) return;
      contacts.value = data.contacts;
      lastUpdated.value = data.lastUpdated;
      page.value = Math.min(
        page.value,
        Math.max(1, Math.ceil(filtered.value.length / pageSize)),
      );
    } catch (cause: unknown) {
      if (request.signal.aborted) return;
      const response = cause as { data?: { data?: { message?: string } } };
      error.value =
        response.data?.data?.message ||
        'Не удалось загрузить справочник. Повторите попытку.';
    } finally {
      if (!request.signal.aborted) loading.value = false;
    }
  }
  onMounted(load);
  onBeforeUnmount(() => controller?.abort());
  return {
    contacts,
    loading,
    error,
    search,
    department,
    departments,
    page,
    pageCount,
    filtered,
    rows,
    start,
    end,
    updatedLabel,
    sortKey,
    descending,
    sort,
    load,
  };
}
