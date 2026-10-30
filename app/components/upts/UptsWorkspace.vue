<script setup lang="ts">
import { useUptsWorkspace } from '~/composables/useUptsWorkspace';
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
import { taskSummary } from '~~/shared/utils/upts';
import { formatWorkDate, portalToday } from '~~/shared/utils/work-board';
import Board from '../work/Board.vue';
import Timeline from '../work/Timeline.vue';
import Calendar from '../work/Calendar.vue';
import TaskEditor from '../work/TaskEditor.vue';
import ProjectEditor from '../work/ProjectEditor.vue';
import ProjectFiles from '../work/ProjectFiles.vue';
import Members from '../work/Members.vue';
import Modal from '../work/Modal.vue';
import ObjectEditor from './ObjectEditor.vue';
import ContractEditor from './ContractEditor.vue';
import TemplateEditor from './TemplateEditor.vue';
const {
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
} = useUptsWorkspace();
</script>
<template>
  <section class="work-root upts-root">
    <aside class="upts-sidebar">
      <NuxtLink to="/" class="upts-back">← Space</NuxtLink>
      <div class="upts-brand">
        <span>УПТС</span><small>Территория. Проекты. Люди.</small>
      </div>
      <nav aria-label="Разделы УПТС">
        <button
          v-for="n in nav"
          :key="n.key"
          :aria-current="section === n.key ? 'page' : undefined"
          @click="section = n.key"
        >
          <Icon :name="n.icon" /><span>{{ n.label }}</span
          ><small v-if="n.key === 'projects'">{{ data.projects.length }}</small>
        </button>
      </nav>
      <div class="upts-sidebar-note">
        <span class="upts-dot" /> Пробная версия
        <p>Состав работ и правила готовности уточняем вместе с отделом.</p>
      </div>
      <NuxtLink to="/projects" class="upts-all-work"
        >Все задачи Space ↗</NuxtLink
      >
    </aside>
    <main class="upts-main">
      <header class="upts-heading">
        <div>
          <p class="upts-eyebrow">
            Управление подготовки территории строительства
          </p>
          <h1>
            {{
              project
                ? project.name
                : section === 'employees'
                  ? 'Работа сотрудников'
                  : 'Проекты и территория'
            }}
          </h1>
          <p class="work-muted">
            {{
              project
                ? UPTS_TYPES[project.upts.projectType]
                : 'Рабочее пространство подразделения'
            }}
            <span v-if="project?.upts.isDemo" class="upts-badge amber"
              >Демонстрационные данные</span
            >
          </p>
        </div>
        <div class="work-actions">
          <button
            :disabled="loading || exporting || !!error"
            @click="exportExcel"
          >
            <Icon name="lucide:download" />
            {{ exporting ? 'Формируем…' : 'Excel' }}</button
          ><button v-if="context" class="work-primary" @click="editProject()">
            + Проект
          </button>
        </div>
      </header>
      <div class="upts-filters">
        <label
          >Проект<select v-model="selectedId">
            <option :value="null">Все доступные проекты</option>
            <option v-for="p in data.projects" :key="p.id" :value="p.id">
              {{ p.name }}
            </option>
          </select></label
        ><label
          >Исполнитель<select v-model="employeeId">
            <option :value="null">Все сотрудники</option>
            <option v-for="u in people" :key="u.id" :value="u.id">
              {{ workUserName(u) }}
            </option>
          </select></label
        ><label class="upts-search"
          >Поиск<input
            v-model="search"
            type="search"
            maxlength="200"
            placeholder="Задача, проект или сотрудник" /></label
        ><button :disabled="loading" aria-label="Обновить данные" @click="load">
          <Icon name="lucide:refresh-cw" /></button
        ><button
          v-if="selectedId || employeeId || search"
          @click="clearFilters"
        >
          Сбросить</button
        ><label class="work-check"
          ><input v-model="archived" type="checkbox" />Архив</label
        >
      </div>
      <p v-if="error || saveError" class="work-error" role="alert">
        {{ error || saveError }}
      </p>
      <p v-if="loading" role="status" class="upts-notice">
        Загружаем проекты и задачи…
      </p>
      <p v-if="employeeId || search" class="upts-notice">
        Задачи и показатели отфильтрованы{{
          employeeId ? ' по основному исполнителю' : ''
        }}{{ search ? ' по поисковому запросу' : '' }}. Объекты и договоры
        показываются целиком для проектов, вошедших в срез.
      </p>
      <template v-if="!loading && !error && context">
        <div v-if="project" class="upts-project-strip">
          <span :class="['upts-badge', statusClass(project.upts.status)]">{{
            UPTS_STATUSES[project.upts.status]
          }}</span
          ><span><b>Владелец:</b> {{ workUserName(project.owner) }}</span
          ><span
            ><b>Срок:</b>
            {{ formatWorkDate(project.dueDate) || 'не задан' }}</span
          ><span v-if="project.archivedAt">Архив · только чтение</span>
          <div class="work-actions">
            <button v-if="canManage" @click="editProject(project)">
              Настройки</button
            ><button @click="section = 'team'">Команда</button
            ><button @click="section = 'files'">Документы</button
            ><NuxtLink :to="`/projects?projectId=${project.id}`"
              >Открыть в Space ↗</NuxtLink
            >
          </div>
        </div>
        <div class="upts-metrics">
          <article>
            <span>Проектов в срезе</span><strong>{{ projects.length }}</strong
            ><small>{{
              project ? 'Выбранный проект' : 'Доступные вам проекты УПТС'
            }}</small>
          </article>
          <article>
            <span>Открытых задач</span><strong>{{ summary.active }}</strong
            ><small>{{ summary.unassigned }} без исполнителя</small>
          </article>
          <article class="upts-metric-danger">
            <span>Просрочено</span><strong>{{ summary.overdue }}</strong
            ><small>По крайнему сроку задачи</small>
          </article>
          <article>
            <span>Требуют внимания</span><strong>{{ summary.blocked }}</strong
            ><small>Указано препятствие</small>
          </article>
          <article>
            <span>Выполнено задач</span
            ><strong
              >{{ summary.done }}<em> / {{ summary.total }}</em></strong
            ><progress
              :value="summary.done"
              :max="summary.total || 1"
              aria-label="Доля выполненных задач"
            />
          </article>
        </div>
        <nav
          v-if="project"
          class="upts-project-tabs"
          aria-label="Карточка проекта"
        >
          <button
            v-for="n in [
              ...nav.filter(
                (n) => n.key !== 'projects' && n.key !== 'employees',
              ),
              { key: 'files', label: 'Документы' },
              { key: 'team', label: 'Команда' },
            ]"
            :key="n.key"
            :aria-pressed="section === n.key"
            @click="section = n.key"
          >
            {{ n.label }}
          </button>
        </nav>
        <template v-if="section === 'overview'">
          <div class="upts-dashboard">
            <div class="upts-dashboard-main">
              <section v-if="project" class="upts-panel">
                <div class="upts-panel-head">
                  <h2>Паспорт проекта</h2>
                  <span class="work-muted">{{
                    project.department?.name ||
                    project.group?.name ||
                    (project.scope === 'PRIVATE'
                      ? 'Личный доступ'
                      : 'Команда проекта')
                  }}</span>
                </div>
                <p class="upts-description">
                  {{ project.description || 'Цель проекта пока не описана.' }}
                </p>
                <dl class="upts-facts">
                  <div>
                    <dt>Основание</dt>
                    <dd>{{ project.upts.basis || 'Не указано' }}</dd>
                  </div>
                  <div>
                    <dt>Инициатор</dt>
                    <dd>{{ project.upts.initiator || 'Не указан' }}</dd>
                  </div>
                  <div>
                    <dt>Поступило</dt>
                    <dd>
                      {{ formatWorkDate(project.upts.receivedDate) || '—' }}
                    </dd>
                  </div>
                  <div>
                    <dt>Начало</dt>
                    <dd>{{ formatWorkDate(project.startDate) || '—' }}</dd>
                  </div>
                </dl>
                <p v-if="project.upts.completionNote">
                  <b>Результат:</b> {{ project.upts.completionNote }}
                </p>
              </section>
              <section v-else class="upts-panel">
                <div class="upts-panel-head">
                  <h2>Портфель проектов</h2>
                  <button @click="section = 'projects'">Все проекты →</button>
                </div>
                <div v-if="projects.length" class="upts-portfolio">
                  <button
                    v-for="p in projects.slice(0, 6)"
                    :key="p.id"
                    class="upts-portfolio-row"
                    @click="openProject(p)"
                  >
                    <span
                      class="upts-project-symbol"
                      :style="{ background: p.color }"
                      ><Icon name="lucide:folder-open" /></span
                    ><span
                      ><strong>{{ p.name }}</strong
                      ><small
                        >{{ workUserName(p.owner) }} ·
                        {{ p.upts.objects.length }} объекта</small
                      ></span
                    ><span
                      :class="['upts-badge', statusClass(p.upts.status)]"
                      >{{ UPTS_STATUSES[p.upts.status] }}</span
                    ><span class="upts-mini-progress"
                      ><b
                        >{{ projectStats(p).done }}/{{
                          projectStats(p).total
                        }}</b
                      ><progress :value="projectStats(p).percent" max="100"
                    /></span>
                  </button>
                </div>
                <p v-else class="work-empty">Проектов в выбранном срезе нет.</p>
              </section>
              <section v-if="project" class="upts-panel">
                <div class="upts-panel-head">
                  <h2>Готовность объектов</h2>
                  <button @click="section = 'objects'">Открыть реестр →</button>
                </div>
                <p class="work-muted">
                  Независимые направления. Их состояние задаётся ответственными
                  вручную.
                </p>
                <div
                  v-for="(label, key) in UPTS_AXES"
                  :key="key"
                  class="upts-axis"
                >
                  <span>{{ label }}</span>
                  <div class="upts-axis-segments">
                    <span
                      v-for="o in project.upts.objects"
                      :key="o.id"
                      :class="'state-' + o[key]"
                      :title="o.object.name + ': ' + UPTS_READINESS[o[key]]"
                    />
                  </div>
                  <b
                    >{{
                      project.upts.objects.filter((o) => o[key] === 'DONE')
                        .length
                    }}
                    / {{ project.upts.objects.length }}</b
                  >
                </div>
                <p v-if="!project.upts.objects.length" class="work-empty">
                  Добавьте первый объект проекта.
                </p>
                <div class="upts-legend">
                  <span v-for="(label, key) in UPTS_READINESS" :key="key"
                    ><i :class="'state-' + key" />{{ label }}</span
                  >
                </div>
              </section>
              <section class="upts-panel">
                <div class="upts-panel-head">
                  <h2>Работа команды</h2>
                  <button @click="section = 'employees'">
                    По сотрудникам →
                  </button>
                </div>
                <div
                  v-for="row in employeeRows.slice(0, 5)"
                  :key="row.user.id"
                  class="upts-person-row"
                >
                  <span class="upts-avatar">{{ initials(row.user) }}</span
                  ><button
                    @click="
                      employeeId = row.user.id;
                      section = 'tasks';
                    "
                  >
                    {{ workUserName(row.user) }}</button
                  ><span>{{ row.active }} открыто</span
                  ><span :class="{ 'upts-danger': row.overdue }"
                    >{{ row.overdue }} просрочено</span
                  >
                </div>
                <p v-if="!employeeRows.length" class="work-empty">
                  Нет сотрудников в выбранном срезе.
                </p>
              </section>
            </div>
            <aside class="upts-dashboard-side">
              <section class="upts-panel upts-attention">
                <div class="upts-panel-head">
                  <h2>Требует внимания</h2>
                  <Icon name="lucide:circle-alert" />
                </div>
                <button
                  v-for="t in attention"
                  :key="t.id"
                  class="upts-attention-task"
                  @click="editTask(t)"
                >
                  <strong>{{ t.title }}</strong
                  ><small>{{ t.project?.name }}</small>
                  <p>{{ t.blockedReason || 'Истёк крайний срок' }}</p>
                  <span
                    >{{ workUserName(t.assignee) }} ·
                    {{ formatWorkDate(t.dueDate) || 'Без срока' }}</span
                  >
                </button>
                <p v-if="!attention.length" class="work-empty">
                  Нет просроченных задач и отмеченных препятствий.
                </p>
              </section>
              <section class="upts-panel">
                <h2>Ближайшие сроки</h2>
                <button
                  v-for="t in nearest"
                  :key="t.id"
                  class="upts-deadline"
                  @click="editTask(t)"
                >
                  <time>{{ formatWorkDate(t.dueDate) }}</time
                  ><span>{{ t.title }}</span>
                </button>
                <p v-if="!nearest.length" class="work-empty">
                  Сроки ещё не назначены.
                </p>
              </section>
            </aside>
          </div>
        </template>
        <section v-else-if="section === 'projects'" class="upts-projects">
          <div class="upts-section-head">
            <h2>Проекты УПТС</h2>
            <div class="work-actions">
              <button @click="connect">Подключить проект Space</button
              ><button @click="demoConfirm = true">Создать демопроект</button>
            </div>
          </div>
          <div class="upts-project-board">
            <div
              v-for="(label, key) in UPTS_STATUSES"
              :key="key"
              class="upts-project-column"
            >
              <header :class="statusClass(key)">
                <strong>{{ label }}</strong
                ><span>{{
                  projects.filter((p) => p.upts.status === key).length
                }}</span>
              </header>
              <button
                v-for="p in projects.filter((p) => p.upts.status === key)"
                :key="p.id"
                class="upts-project-card"
                @click="openProject(p)"
              >
                <small>{{ UPTS_TYPES[p.upts.projectType] }}</small>
                <h3>{{ p.name }}</h3>
                <p>
                  {{ p.upts.objects.length }} объекта ·
                  {{ p.upts.contracts.length }} договоров
                </p>
                <span>{{ workUserName(p.owner) }}</span
                ><progress :value="projectStats(p).percent" max="100" />
                <footer>
                  <span
                    >{{ projectStats(p).done }}/{{
                      projectStats(p).total
                    }}
                    задач</span
                  ><span>{{ formatWorkDate(p.dueDate) || 'Без срока' }}</span>
                </footer>
              </button>
              <p
                v-if="!projects.some((p) => p.upts.status === key)"
                class="upts-column-empty"
              >
                Пока нет проектов
              </p>
            </div>
          </div>
        </section>
        <section v-else-if="section === 'tasks'" class="upts-panel">
          <div class="upts-section-head">
            <div class="work-view-switch">
              <button
                v-for="v in [
                  { key: 'board', label: 'Канбан' },
                  { key: 'list', label: 'Таблица' },
                  { key: 'timeline', label: 'План' },
                  { key: 'calendar', label: 'Календарь' },
                ]"
                :key="v.key"
                :aria-pressed="view === v.key"
                @click="view = v.key"
              >
                {{ v.label }}
              </button>
            </div>
            <div class="work-actions">
              <button v-if="canManage" @click="templateEditor = true">
                Набор работ</button
              ><button
                v-if="project?.canCreateTask"
                class="work-primary"
                @click="editTask()"
              >
                + Задача
              </button>
            </div>
          </div>
          <p v-if="!project" class="work-muted">
            Для добавления задач и применения набора работ выберите проект.
          </p>
          <Board
            v-if="view === 'board'"
            :tasks="tasks"
            mode="status"
            :today="data.today"
            :busy="saving"
            @open="editTask"
            @move="move"
          /><Timeline
            v-else-if="view === 'timeline'"
            :tasks="tasks"
            :today="data.today"
            @open="editTask"
          /><Calendar
            v-else-if="view === 'calendar'"
            :tasks="tasks"
            :today="data.today"
            @open="editTask"
          />
          <div v-else class="work-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Задача / проект</th>
                  <th>Объект</th>
                  <th>Исполнитель</th>
                  <th>Состояние</th>
                  <th>Срок</th>
                  <th>Препятствие</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="t in tasks" :key="t.id">
                  <td>
                    <button class="upts-link" @click="editTask(t)">
                      {{ t.title }}</button
                    ><small>{{ t.project?.name }}</small>
                  </td>
                  <td>
                    {{
                      data.projects
                        .find((p) => p.id === t.projectId)
                        ?.upts.objects.find((o) => o.id === t.uptsObjectId)
                        ?.object.name || 'Общая задача'
                    }}
                  </td>
                  <td>{{ workUserName(t.assignee) }}</td>
                  <td>
                    {{ WORK_STATUSES[t.status as keyof typeof WORK_STATUSES] }}
                  </td>
                  <td
                    :class="{
                      'upts-danger': taskSummary([t], data.today).overdue,
                    }"
                  >
                    {{ formatWorkDate(t.dueDate) || '—' }}
                  </td>
                  <td>{{ t.blockedReason || '—' }}</td>
                </tr>
              </tbody>
            </table>
            <p v-if="!tasks.length" class="work-empty">
              Задач в этом срезе нет.
            </p>
          </div>
          <p class="upts-footnote">
            Всего задач в срезе: {{ tasks.length }}. Доля выполненных задач не
            определяет готовность объекта.
          </p>
        </section>
        <section v-else-if="section === 'objects'" class="upts-panel">
          <div class="upts-section-head">
            <div>
              <h2>Участки и объекты</h2>
              <p class="work-muted">
                Одна карточка объекта — отдельные работы и готовность в каждом
                проекте
              </p>
            </div>
            <button v-if="canManage" class="work-primary" @click="editObject()">
              + Объект
            </button>
          </div>
          <div class="work-table-wrap">
            <table class="upts-objects-table">
              <thead>
                <tr>
                  <th>Объект / проект</th>
                  <th v-for="(label, key) in UPTS_AXES" :key="key">
                    {{ label }}
                  </th>
                  <th>Действие</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="o in objectRows" :key="o.id">
                  <td>
                    <strong>{{ o.object.name }}</strong
                    ><small>{{
                      o.object.cadastralNumber || 'Кадастровый номер не задан'
                    }}</small
                    ><small>{{ o.project.name }}</small>
                    <p v-if="o.note" class="upts-object-note">{{ o.note }}</p>
                  </td>
                  <td v-for="(_, key) in UPTS_AXES" :key="key">
                    <span :class="['upts-readiness', 'state-' + o[key]]">{{
                      UPTS_READINESS[o[key]]
                    }}</span>
                  </td>
                  <td>
                    <button
                      v-if="o.project.canManage && !o.project.archivedAt"
                      @click="
                        selectedId = o.project.id;
                        editObject(o);
                      "
                    >
                      Изменить</button
                    ><button v-else @click="openProject(o.project)">
                      Проект
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            <p v-if="!objectRows.length" class="work-empty">
              Объектов пока нет. Выберите проект и добавьте объект.
            </p>
          </div>
        </section>
        <section v-else-if="section === 'employees'" class="upts-panel">
          <div class="upts-section-head">
            <div>
              <h2>
                {{
                  employeeId
                    ? workUserName(people.find((p) => p.id === employeeId))
                    : 'Работа сотрудников'
                }}
              </h2>
              <p class="work-muted">
                Количество задач по основному исполнителю. Это не оценка
                трудозатрат.
              </p>
            </div>
          </div>
          <div class="work-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Сотрудник</th>
                  <th>Проектов с задачами</th>
                  <th>Открыто</th>
                  <th>Выполнено</th>
                  <th>Просрочено</th>
                  <th>С препятствием</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in employeeRows" :key="r.user.id">
                  <td>
                    <span class="upts-avatar">{{ initials(r.user) }}</span>
                    {{ workUserName(r.user) }}
                  </td>
                  <td>{{ r.projects }}</td>
                  <td>{{ r.active }}</td>
                  <td>{{ r.done }}</td>
                  <td :class="{ 'upts-danger': r.overdue }">{{ r.overdue }}</td>
                  <td>{{ r.blocked }}</td>
                  <td>
                    <button
                      @click="
                        employeeId = r.user.id;
                        section = 'tasks';
                      "
                    >
                      Задачи →
                    </button>
                  </td>
                </tr>
                <tr v-if="summary.unassigned">
                  <td>Без исполнителя</td>
                  <td>—</td>
                  <td>{{ summary.unassigned }}</td>
                  <td colspan="4">Назначьте ответственных в карточках задач</td>
                </tr>
              </tbody>
            </table>
            <p
              v-if="!employeeRows.length && !summary.unassigned"
              class="work-empty"
            >
              Нет данных для выбранного среза.
            </p>
          </div>
        </section>
        <section v-else-if="section === 'contracts'" class="upts-panel">
          <div class="upts-section-head">
            <h2>Договоры</h2>
            <button
              v-if="canManage"
              class="work-primary"
              @click="editContract()"
            >
              + Договор
            </button>
          </div>
          <div class="work-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Номер / наименование</th>
                  <th>Проект</th>
                  <th>Контрагент</th>
                  <th>Дата</th>
                  <th>Срок</th>
                  <th>Документы</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="c in contractRows" :key="c.id">
                  <td>
                    <strong>{{ c.number }}</strong
                    ><small>{{ c.name }}</small
                    ><button
                      v-if="c.project.canManage && !c.project.archivedAt"
                      class="upts-link"
                      @click="
                        selectedId = c.project.id;
                        editContract(c);
                      "
                    >
                      Изменить
                    </button>
                  </td>
                  <td>{{ c.project.name }}</td>
                  <td>{{ c.counterparty || '—' }}</td>
                  <td>{{ formatWorkDate(c.signedDate) || '—' }}</td>
                  <td>{{ formatWorkDate(c.dueDate) || '—' }}</td>
                  <td>
                    <button @click="showFiles(c.project, c.id)">
                      <Icon name="lucide:folder-open" /> Открыть папку
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            <p v-if="!contractRows.length" class="work-empty">
              Договоров пока нет. Выберите проект для добавления.
            </p>
          </div>
        </section>
        <section v-else-if="section === 'files' && project" class="upts-panel">
          <div class="upts-section-head">
            <h2>Документы проекта</h2>
            <label
              >Папка<select v-model="activeContract">
                <option :value="null">Общие материалы проекта</option>
                <option
                  v-for="c in project.upts.contracts"
                  :key="c.id"
                  :value="c.id"
                >
                  Договор {{ c.number }} · {{ c.name }}
                </option>
              </select></label
            >
          </div>
          <ProjectFiles
            :key="project.id + ':' + activeContract"
            :project="project"
            :contract-id="activeContract || undefined"
            default-scope="SHARED"
          />
        </section>
        <section v-else-if="section === 'team' && project" class="upts-panel">
          <Members
            :project="project"
            :user-id="context.userId"
            @changed="load"
            @settings="editProject(project)"
          />
        </section>
        <div v-else class="work-empty">
          Выберите проект для открытия этого раздела.
        </div>
        <div v-if="!data.projects.length && !archived" class="upts-onboarding">
          <Icon name="lucide:folder-plus" />
          <div>
            <h2>Первый проект УПТС</h2>
            <p>
              Создайте проект, подключите существующий или откройте учебный
              пример с тремя объектами.
            </p>
          </div>
          <div class="work-actions">
            <button @click="connect">Подключить из Space</button
            ><button class="work-primary" @click="demoConfirm = true">
              Создать демопроект
            </button>
          </div>
        </div>
        <footer class="upts-footer">
          <span>Space / УПТС · Пробная версия</span
          ><span
            >Срез на {{ formatWorkDate(data.today) }} · Только доступные вам
            данные</span
          >
        </footer>
      </template>
    </main>
    <ProjectEditor
      v-if="projectEditor && context"
      :project="editingProject"
      :context="context"
      upts-mode
      @close="projectEditor = false"
      @saved="projectSaved"
    />
    <TaskEditor
      ref="taskEditorRef"
      v-if="taskEditor && context"
      :task="editingTask"
      :projects="data.projects"
      :project="project"
      :context="context"
      @close="taskEditor = false"
      @saved="taskSaved"
      @create-project="editProject()"
    />
    <ObjectEditor
      v-if="objectEditor && project"
      :project-id="project.id"
      :link="editingObject"
      @close="objectEditor = false"
      @saved="
        objectEditor = false;
        load();
      "
    />
    <ContractEditor
      v-if="contractEditor && project"
      :project-id="project.id"
      :contract="editingContract"
      @close="contractEditor = false"
      @saved="
        contractEditor = false;
        load();
      "
    />
    <TemplateEditor
      v-if="templateEditor && project"
      :project="project"
      @close="templateEditor = false"
      @saved="
        templateEditor = false;
        load();
      "
    />
    <Modal
      v-if="demoConfirm"
      title="Демонстрационный проект УПТС"
      @close="demoConfirm = false"
      ><div class="work-form">
        <p>
          Будет создан личный учебный проект с тремя условными объектами,
          девятью задачами и одним договором. Он появится и в «Задачах и
          проектах» Space.
        </p>
        <p>
          Данные сохраняются на сервере. Файлы-примеры не создаются. Для
          совместной демонстрации измените видимость и добавьте команду в
          настройках проекта.
        </p>
        <p v-if="saveError" class="work-error">{{ saveError }}</p>
        <button class="work-primary" :disabled="saving" @click="demo">
          {{ saving ? 'Создаём…' : 'Создать учебный проект' }}
        </button>
      </div></Modal
    >
    <Modal
      v-if="connectModal"
      title="Подключить существующий проект Space"
      @close="connectModal = false"
      ><div class="work-form">
        <p>
          Выберите доступный вам проект, которым вы управляете. Его задачи,
          команда и документы сохранятся.
        </p>
        <label
          >Проект<select v-model="connectId">
            <option :value="null">Выберите проект</option>
            <option v-for="p in available" :key="p.id" :value="p.id">
              {{ p.name }}
            </option>
          </select></label
        >
        <p v-if="!available.length">
          Доступных для подключения проектов пока нет.
        </p>
        <button
          class="work-primary"
          :disabled="!connectId"
          @click="connectChosen"
        >
          Заполнить сведения УПТС
        </button>
      </div></Modal
    >
  </section>
</template>
<style src="~/assets/css/work.css"></style>
<style src="~/assets/css/upts.css"></style>
