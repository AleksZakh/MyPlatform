<template>
  <UModal :ui="{ content: 'w-full sm:max-w-2xl bg-gray-50' }">
    <template #header>
      <div class="flex w-full items-center justify-between gap-3">
        <div class="flex gap-3 items-center">

          <Icon name="vscode-icons:file-type-excel2" size="24"/>
          <div>
            <h2 class="font-semibold">Экспорт реестра входного контроля</h2>
            <p class="text-xs text-gray-500">Excel и документы в ZIP-архиве</p>
          </div>
        </div>
        <UButton icon="i-lucide-x" variant="ghost" color="neutral" aria-label="Закрыть" @click="emit('close')" />
      </div>
    </template>
    <template #body>
      <div class=" text-sm p-2">
        <p class="rounded border border-blue-100 bg-blue-50 p-3">
          Выгружаются все записи, соответствующие фильтру. Быстрый поиск, текущая страница и выделение строк не учитываются.
        </p>
        <div v-if="errorMessage" role="alert" class="rounded bg-red-50 p-3 text-red-700">{{ errorMessage }}</div>
        <template v-if="!currentJob">
          <fieldset :disabled="saving" class="space-y-3 rounded border bg-white p-4">
            <legend class="px-2 font-medium">Содержимое выгрузки</legend>
            <label v-for="item in items" :key="item.value" class="flex cursor-pointer items-start gap-3">
              <input v-model="kinds" :value="item.value" type="checkbox" class="mt-1" />
              <span><span class="block font-medium">{{ item.label }}</span><span class="text-xs text-gray-500">{{ item.description }}</span></span>
            </label>
          </fieldset>
          <fieldset v-if="kinds.includes('reestr')" :disabled="saving" class="rounded border bg-white p-3">
            <legend class="px-2 font-medium">Столбцы Excel</legend>
            <label class="mr-4 inline-flex items-center gap-2"><input v-model="columnMode" type="radio" value="visible" :disabled="!columns.length" />Как в таблице</label>
            <label class="inline-flex items-center gap-2"><input v-model="columnMode" type="radio" value="all" />Все поля реестра</label>
          </fieldset>
          <p class="text-xs py-2 text-gray-500">Сначала подготовим состав и размер выгрузки. Сборка ZIP начнётся после подтверждения. Готовые архивы доступны сутки.</p>
          <p v-if="preview" class="py-2" :class="preview.allowed ? 'text-gray-600' : 'text-red-700'">
            Записей по фильтру: {{ preview.total }}. Лимит: {{ preview.recordLimit }}.
            <span v-if="!preview.allowed">Уменьшите выборку в «Настройке фильтра».</span>
          </p>
          <p v-else class="py-2 text-gray-500">{{ previewLoading ? 'Проверяем количество записей…' : 'Количество записей не проверено.' }}</p>
          <UButton class="mb-1" :disabled="!kinds.length || saving || !preview?.allowed || previewLoading" :loading="saving" @click="prepare">Подготовить выгрузку</UButton>
        </template>
        <template v-else>
          <div class="space-y-2 rounded border bg-white p-4" aria-live="polite">
            <p class="font-semibold">{{ statusLabel(currentJob) }}</p>
            <p class="text-xs text-gray-600">Фильтр: {{ currentJob.filterDescription.join('; ') || 'Не установлен' }}</p>
            <p>Записей: {{ currentJob.total }} · Документов: {{ currentJob.documents }}</p>
            <p>Объём документов до упаковки: {{ formatBytes(currentJob.bytes) }} <span class="text-xs text-gray-500">(без Excel и отчёта)</span></p>
            <p v-if="currentJob.snapshotAt" class="text-xs text-gray-500">Состав зафиксирован: {{ formatTime(currentJob.snapshotAt) }}</p>
            <template v-if="['PREPARING', 'RUNNING'].includes(currentJob.status)">
              <progress class="w-full" :value="currentJob.total ? currentJob.processed : undefined" :max="currentJob.total || 1" />
              <p>Обработано {{ currentJob.processed }} из {{ currentJob.total }} записей. В архиве: {{ currentJob.packed }} документов.</p>
              <p class="text-xs text-gray-500">Можно закрыть окно и продолжать работу. Задание останется в списке «Мои выгрузки».</p>
            </template>
            <p v-if="currentJob.warnings" class="text-amber-700">Предупреждений о документах: {{ currentJob.warnings }}. Подробности будут в отчёте.</p>
            <p v-if="currentJob.error" class="text-red-700">{{ currentJob.error }}</p>
          </div>
          <template v-if="currentJob.status === 'AWAITING_CONFIRMATION' && !confirmed[currentJob.id]">
            <div v-if="!currentJob.hasFilter" class="space-y-3 rounded border border-amber-300 bg-amber-50 p-4">
              <h3 class="font-semibold">Выгрузка всего реестра</h3>
              <p>Фильтр не установлен. В выгрузку попадут все доступные вам записи и выбранные типы документов. Подготовка большого архива может занять длительное время. Рекомендуем ограничить выгрузку фильтром, например по дате или объекту.</p>
              <label class="flex items-start gap-2"><input v-model="confirmAll" type="checkbox" class="mt-1" /><span>Понимаю, что запускаю выгрузку всего реестра.</span></label>
            </div>
            <div class="flex flex-wrap gap-2">
              <UButton color="neutral" variant="outline" :disabled="saving" @click="backToSettings">Вернуться к настройкам</UButton>
              <UButton :disabled="saving || (!currentJob.hasFilter && !confirmAll)" :loading="saving" @click="confirmExport">{{ currentJob.hasFilter ? 'Сформировать архив' : 'Выгрузить всё' }}</UButton>
            </div>
          </template>
          <UButton v-if="currentJob.status === 'READY'" :href="`/api/incoming-control/exports/${currentJob.id}/download`" external>Скачать ZIP ({{ formatBytes(currentJob.archiveBytes || 0) }})</UButton>
          <UButton v-if="['PREPARING', 'QUEUED', 'RUNNING'].includes(currentJob.status) || confirmed[currentJob.id] && currentJob.status === 'AWAITING_CONFIRMATION'" color="error" variant="outline" :disabled="saving" @click="cancelCurrent">Отменить выгрузку</UButton>
          <UButton color="neutral" variant="ghost" @click="selectedId = null; confirmAll = false">Новая выгрузка</UButton>
        </template>
        <section v-if="jobs.length" class="border-t pt-4">
          <h3 class="mb-2 font-medium">Мои выгрузки</h3>
          <div class="max-h-48 space-y-2 overflow-y-auto">
            <button v-for="job in jobs" :key="job.id" type="button" class="flex w-full items-center justify-between gap-3 rounded border bg-white p-2 text-left hover:bg-blue-50" @click="selectJob(job.id)">
              <span>{{ formatTime(job.createdAt) }} · {{ job.total }} записей</span><span>{{ statusLabel(job) }}</span>
            </button>
          </div>
        </section>
      </div>
    </template>
    <template #footer>
      <div class="flex w-full justify-end"><UButton color="neutral" variant="outline" @click="emit('close')">Закрыть</UButton></div>
    </template>
  </UModal>
</template>
<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { EXPORT_COLUMNS, type ExportJobView, type ExportKind } from '~~/shared/types/lab-export'
const props = withDefaults(defineProps<{ columns?: string[] }>(), { columns: () => [] })
const emit = defineEmits<{ (e: 'close'): void; (e: 'save'): void }>()
const kinds = ref<ExportKind[]>(['reestr'])
const columnMode = ref(props.columns.length ? 'visible' : 'all')
const saving = ref(false)
const preview = ref<{ total: number; recordLimit: number; allowed: boolean } | null>(null)
const previewLoading = ref(true)
async function refreshPreview(): Promise<void> {
  previewLoading.value = true
  try {
    const result = await $fetch<{ total: number; recordLimit: number; allowed: boolean }>('/api/incoming-control/exports/preview', { signal: pollController.signal })
    if (alive) preview.value = result
  } catch {
    if (alive) { preview.value = null; errorMessage.value = 'Не удалось проверить лимит выгрузки. Повторяем запрос.' }
  } finally { if (alive) previewLoading.value = false }
}
const errorMessage = ref('')
const jobs = ref<ExportJobView[]>([])
const selectedId = ref<string | null>(null)
const currentJob = computed(() => jobs.value.find(j => j.id === selectedId.value))
const confirmAll = ref(false)
const confirmed = ref<Record<string, boolean>>({})
let requestId: string | null = null
let lastOptions = ''
let alive = true
let timer: ReturnType<typeof setTimeout> | undefined
const pollController = new AbortController()
const items: { value: ExportKind; label: string; description: string }[] = [
  { value: 'reestr', label: 'Реестр', description: 'Выгрузка отфильтрованных записей реестра в Excel.' },
  { value: 'samplingReport', label: 'Акты отбора проб', description: 'Выгрузка актов отбора проб.' },
  { value: 'materialPassp', label: 'Паспорта на материалы', description: 'Документы о качестве материалов.' },
  { value: 'testProtocol', label: 'Протоколы испытаний', description: 'Выгрузка протоколов испытаний.' },
]
function formatBytes(value: number): string {
  if (value < 1024) return `${value} Б`
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} КБ`
  if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(1)} МБ`
  return `${(value / 1024 ** 3).toFixed(2)} ГБ`
}
function formatTime(value: string): string { return new Date(value).toLocaleString('ru-RU') }
function statusLabel(job: ExportJobView): string {
  if (job.status === 'AWAITING_CONFIRMATION' && confirmed.value[job.id]) return 'В очереди'
  if (job.status === 'READY' && job.warnings) return 'Готово с предупреждениями'
  return { PREPARING: 'Подготовка состава выгрузки', AWAITING_CONFIRMATION: 'Ожидает подтверждения', QUEUED: 'В очереди', RUNNING: 'Формирование архива', READY: 'Готово', FAILED: 'Ошибка', CANCELLED: 'Отменено' }[job.status]
}
function selectJob(id: string): void { selectedId.value = id; confirmAll.value = false }
async function refresh(): Promise<void> {
  const data = await $fetch<ExportJobView[]>('/api/incoming-control/exports', { signal: pollController.signal })
  if (alive) jobs.value = data
}
async function poll(): Promise<void> {
  try { await refresh(); if (!currentJob.value) await refreshPreview() }
  catch { if (alive) errorMessage.value = 'Не удалось обновить состояние выгрузок. Повторяем запрос.' }
  finally { if (alive) timer = setTimeout(() => void poll(), 4000) }
}
async function action(run: () => Promise<void>): Promise<void> {
  if (saving.value) return
  saving.value = true
  errorMessage.value = ''
  try { await run() }
  catch (error) {
    const e = error as { data?: { message?: string }; message?: string }
    errorMessage.value = e.data?.message || e.message || 'Ошибка экспорта'
  } finally { saving.value = false }
}
async function prepare(): Promise<void> {
  if (previewLoading.value || !preview.value?.allowed) return
  await action(async () => {
    const columns = columnMode.value === 'all' ? EXPORT_COLUMNS.map(c => c[0]) : [...props.columns]
    const optionsKey = JSON.stringify({ kinds: kinds.value, columns })
    if (!requestId || lastOptions !== optionsKey) requestId = crypto.randomUUID()
    lastOptions = optionsKey
    const job = await $fetch<ExportJobView>('/api/incoming-control/exports', {
      method: 'POST', headers: { 'x-space-export': '1' }, body: { requestId, kinds: kinds.value, columns },
    })
    jobs.value = [job, ...jobs.value.filter(j => j.id !== job.id)]
    selectJob(job.id)
    requestId = null
  })
}
async function confirmExport(): Promise<void> {
  const job = currentJob.value
  if (!job) return
  await action(async () => {
    await $fetch(`/api/incoming-control/exports/${job.id}/confirm`, { method: 'POST', headers: { 'x-space-export': '1' }, body: { confirmAll: confirmAll.value } })
    confirmed.value[job.id] = true
    emit('save')
  })
}
async function cancelCurrent(): Promise<void> {
  const job = currentJob.value
  if (!job) return
  await action(async () => {
    await $fetch(`/api/incoming-control/exports/${job.id}/cancel`, { method: 'POST', headers: { 'x-space-export': '1' } })
    delete confirmed.value[job.id]
    await refresh()
  })
}
async function backToSettings(): Promise<void> {
  await cancelCurrent()
  if (!errorMessage.value) { selectedId.value = null; confirmAll.value = false }
}
onMounted(() => { void poll() })
onBeforeUnmount(() => { alive = false; if (timer) clearTimeout(timer); pollController.abort() })
</script>
