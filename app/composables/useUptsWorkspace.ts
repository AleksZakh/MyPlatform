import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import {
  UPTS_TYPES,
  UPTS_STATUSES,
  UPTS_AXES,
  UPTS_READINESS,
  type UptsSnapshot,
  type UptsProjectDTO,
  type UptsObjectLink,
  type UptsContractDTO,
} from '~~/shared/types/upts';
import {
  WORK_STATUSES,
  workUserName,
  type WorkContext,
  type WorkProjectDTO,
  type WorkTaskDTO,
  type WorkUser,
} from '~~/shared/types/work';
import { taskSummary, filterUpts } from '~~/shared/utils/upts';
import { formatWorkDate, portalToday } from '~~/shared/utils/work-board';
import type TaskEditor from '~/components/work/TaskEditor.vue';

export function useUptsWorkspace() {
  const route = useRoute();
  const context = ref<WorkContext | null>(null),
    data = ref<UptsSnapshot>({ projects: [], tasks: [], today: portalToday() });
  const loading = ref(true),
    error = ref(''),
    exporting = ref(false),
    section = ref('overview'),
    view = ref('board');
  const selectedId = ref<number | null>(Number(route.query.projectId) || null),
    employeeId = ref<number | null>(null),
    search = ref(''),
    archived = ref(false);
  const project = computed(
    () => data.value.projects.find((p) => p.id === selectedId.value) || null,
  );
  const filtered = computed(() =>
    filterUpts(data.value, {
      projectId: selectedId.value,
      employeeId: employeeId.value,
      q: search.value,
    }),
  );
  const summary = computed(() =>
    taskSummary(filtered.value.tasks, data.value.today),
  );
  const projects = computed(() => filtered.value.projects),
    tasks = computed(() => filtered.value.tasks);
  const canManage = computed(
    () => !!project.value?.canManage && !project.value.archivedAt,
  );
  const people = computed(() => {
    const map = new Map<number, WorkUser>();
    for (const p of data.value.projects) {
      map.set(p.owner.id, p.owner);
      for (const m of p.members) map.set(m.user.id, m.user);
    }
    for (const t of data.value.tasks)
      if (t.assignee) map.set(t.assignee.id, t.assignee);
    return [...map.values()].sort((a, b) =>
      workUserName(a).localeCompare(workUserName(b), 'ru'),
    );
  });
  const employeeRows = computed(() => {
    const users = new Map<number, WorkUser>();
    for (const p of projects.value) {
      users.set(p.owner.id, p.owner);
      for (const m of p.members) users.set(m.userId, m.user);
    }
    for (const t of tasks.value)
      if (t.assignee) users.set(t.assignee.id, t.assignee);
    return [...users.values()]
      .filter((u) => !employeeId.value || u.id === employeeId.value)
      .map((user) => {
        const list = tasks.value.filter((t) => t.assigneeId === user.id);
        return {
          user,
          ...taskSummary(list, data.value.today),
          projects: new Set(list.map((t) => t.projectId)).size,
        };
      })
      .sort((a, b) => b.overdue - a.overdue || b.active - a.active);
  });
  const attention = computed(() =>
    tasks.value
      .filter(
        (t) =>
          t.status !== 'DONE' &&
          (t.blockedReason ||
            (t.dueDate && t.dueDate.slice(0, 10) < data.value.today)),
      )
      .slice(0, 6),
  );
  const nearest = computed(() =>
    tasks.value
      .filter((t) => t.status !== 'DONE' && t.dueDate)
      .slice()
      .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))
      .slice(0, 5),
  );
  const objectRows = computed(() =>
    projects.value.flatMap((p) =>
      p.upts.objects.map((o) => ({ ...o, project: p })),
    ),
  );
  const contractRows = computed(() =>
    projects.value.flatMap((p) =>
      p.upts.contracts.map((c) => ({ ...c, project: p })),
    ),
  );
  const nav = [
    { key: 'overview', label: 'Обзор', icon: 'lucide:layout-dashboard' },
    { key: 'projects', label: 'Проекты', icon: 'lucide:folders' },
    { key: 'tasks', label: 'Задачи', icon: 'lucide:columns-3' },
    { key: 'objects', label: 'Участки и объекты', icon: 'lucide:map-pinned' },
    { key: 'employees', label: 'Сотрудники', icon: 'lucide:users' },
    { key: 'contracts', label: 'Договоры', icon: 'lucide:files' },
  ];
  const projectEditor = ref(false),
    editingProject = ref<WorkProjectDTO | null>(null),
    taskEditor = ref(false),
    editingTask = ref<WorkTaskDTO | null>(null),
    objectEditor = ref(false),
    editingObject = ref<UptsObjectLink | null>(null),
    contractEditor = ref(false),
    editingContract = ref<UptsContractDTO | null>(null),
    templateEditor = ref(false),
    demoConfirm = ref(false),
    connectModal = ref(false),
    available = ref<WorkProjectDTO[]>([]),
    connectId = ref<number | null>(null),
    activeContract = ref<number | null>(null);
  const taskEditorRef = ref<InstanceType<typeof TaskEditor> | null>(null);
  const { send, error: saveError, saving } = useWorkApi();
  let alive = true,
    serial = 0;
  const demoKey = ref('');
  let dayTimer: ReturnType<typeof setInterval> | undefined;
  async function load() {
    const n = ++serial;
    loading.value = true;
    error.value = '';
    try {
      const [c, s] = await Promise.all([
        $fetch<WorkContext>('/api/work/context'),
        $fetch<UptsSnapshot>('/api/upts', {
          query: { archived: archived.value ? '1' : '0' },
        }),
      ]);
      if (alive && n === serial) {
        context.value = c;
        data.value = s;
        if (
          selectedId.value &&
          !s.projects.some((p) => p.id === selectedId.value)
        )
          selectedId.value = null;
      }
    } catch (e: any) {
      if (alive && n === serial) {
        error.value =
          e.data?.message ||
          'Не удалось открыть УПТС. Проверьте подключение и применение миграции.';
        data.value = { projects: [], tasks: [], today: portalToday() };
      }
    } finally {
      if (alive && n === serial) loading.value = false;
    }
  }
  onMounted(() => {
    demoKey.value = crypto.randomUUID();
    load();
    dayTimer = setInterval(() => {
      data.value.today = portalToday();
    }, 60000);
  });
  onBeforeUnmount(() => {
    alive = false;
    serial++;
    clearInterval(dayTimer);
  });
  watch(archived, () => {
    selectedId.value = null;
    activeContract.value = null;
    load();
  });
  watch(selectedId, () => {
    activeContract.value = null;
  });
  function openProject(p: UptsProjectDTO) {
    selectedId.value = p.id;
    section.value = 'overview';
  }
  function editProject(p: WorkProjectDTO | null = null) {
    editingProject.value = p;
    projectEditor.value = true;
  }
  async function projectSaved(p: WorkProjectDTO) {
    projectEditor.value = false;
    await load();
    if (taskEditor.value) {
      taskEditorRef.value?.useProject(p);
    } else {
      selectedId.value = p.id;
      section.value = 'overview';
    }
  }
  async function editTask(t?: WorkTaskDTO) {
    try {
      editingTask.value = t
        ? await $fetch<WorkTaskDTO>('/api/work/tasks/' + t.id)
        : null;
      taskEditor.value = true;
    } catch (e: any) {
      error.value = e.data?.message || 'Не удалось открыть задачу.';
    }
  }
  async function taskSaved() {
    taskEditor.value = false;
    await load();
  }
  async function move(t: WorkTaskDTO, patch: Record<string, unknown>) {
    if (
      await send('/api/work/tasks/' + t.id, 'PATCH', {
        version: t.version,
        ...patch,
      })
    )
      await load();
  }
  async function demo() {
    const r = await send<{ id: number }>('/api/upts/demo', 'POST', {
      clientKey: demoKey.value,
    });
    if (r) {
      demoConfirm.value = false;
      archived.value = false;
      await load();
      selectedId.value = r.id;
      section.value = 'overview';
      demoKey.value = crypto.randomUUID();
    }
  }
  async function connect() {
    connectModal.value = true;
    error.value = '';
    available.value = [];
    connectId.value = null;
    try {
      let page = 1,
        total = 0;
      do {
        const r = await $fetch<{ items: WorkProjectDTO[]; total: number }>(
          '/api/work/projects',
          { query: { page } },
        );
        available.value.push(
          ...r.items.filter(
            (p) =>
              p.canManage && !data.value.projects.some((u) => u.id === p.id),
          ),
        );
        total = r.total;
        page++;
      } while ((page - 1) * 100 < total);
    } catch (e: any) {
      error.value = e.data?.message || 'Не удалось загрузить проекты.';
      connectModal.value = false;
    }
  }
  function connectChosen() {
    const p = available.value.find((p) => p.id === connectId.value);
    if (p) {
      connectModal.value = false;
      editProject(p);
    }
  }
  function editObject(o: UptsObjectLink | null = null) {
    editingObject.value = o;
    objectEditor.value = true;
  }
  function editContract(c: UptsContractDTO | null = null) {
    editingContract.value = c;
    contractEditor.value = true;
  }
  function showFiles(p: UptsProjectDTO, contractId?: number) {
    selectedId.value = p.id;
    activeContract.value = contractId || null;
    section.value = 'files';
  }
  async function exportExcel() {
    exporting.value = true;
    error.value = '';
    try {
      const blob = await $fetch<Blob>('/api/upts/export', {
        responseType: 'blob',
        query: {
          projectId: selectedId.value || undefined,
          employeeId: employeeId.value || undefined,
          q: search.value,
          archived: archived.value ? '1' : '0',
        },
      });
      const url = URL.createObjectURL(blob),
        a = document.createElement('a');
      a.href = url;
      a.download = `Space-UPTS-${data.value.today}.xlsx`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e: any) {
      error.value =
        e.data?.message ||
        'Не удалось сформировать Excel. Уточните фильтры или повторите запрос.';
    } finally {
      exporting.value = false;
    }
  }
  function clearFilters() {
    selectedId.value = null;
    employeeId.value = null;
    search.value = '';
  }
  function initials(u: WorkUser) {
    return workUserName(u)
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0])
      .join('');
  }
  function projectStats(p: UptsProjectDTO) {
    return taskSummary(
      tasks.value.filter((t) => t.projectId === p.id),
      data.value.today,
    );
  }
  const statusClass = (status: string) =>
    ({
      INTAKE: 'cyan',
      ACTIVE: 'blue',
      REVIEW: 'violet',
      HANDOVER: 'amber',
      DONE: 'green',
    })[status] || 'blue';

  return {
    context,
    data,
    loading,
    error,
    exporting,
    section,
    view,
    selectedId,
    employeeId,
    search,
    archived,
    project,
    filtered,
    summary,
    projects,
    tasks,
    canManage,
    people,
    employeeRows,
    attention,
    nearest,
    objectRows,
    contractRows,
    nav,
    projectEditor,
    editingProject,
    taskEditor,
    editingTask,
    objectEditor,
    editingObject,
    contractEditor,
    editingContract,
    templateEditor,
    demoConfirm,
    connectModal,
    available,
    connectId,
    activeContract,
    taskEditorRef,
    saveError,
    saving,
    load,
    openProject,
    editProject,
    projectSaved,
    editTask,
    taskSaved,
    move,
    demo,
    connect,
    connectChosen,
    editObject,
    editContract,
    showFiles,
    exportExcel,
    clearFilters,
    initials,
    projectStats,
    statusClass,
  };
}
