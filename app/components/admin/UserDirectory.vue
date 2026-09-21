<template>
  <div class="admin-shell">
    <header class="admin-header">
      <div>
        <p class="eyebrow">
          Space
        </p>

        <h1 class="page-title">
          AdminCenter
        </h1>

        <p class="page-subtitle">
          Пользователи, доступы и структура системы
        </p>
      </div>

      <div class="cache-toolbar">
        <div
          class="cache-state"
          :class="cacheStateClass"
          :title="cacheStateTitle"
        >
          <span
            class="cache-dot"
            :class="cacheDotClass"
          />

          <div>
            <div class="cache-title">
              Кэш Active Directory
            </div>

            <div class="cache-text">
              {{ cacheStateText }}
            </div>

            <div
              v-if="responseMeta.directoryCache.lastUpdated"
              class="cache-updated"
            >
              Обновлён:
              {{
                formatDateTime(
                  responseMeta.directoryCache.lastUpdated,
                )
              }}
            </div>
          </div>
        </div>

        <UButton
          v-if="capabilities.canRefreshDirectoryCache"
          label="Обновить AD"
          icon="i-heroicons-arrow-path"
          color="primary"
          variant="outline"
          :loading="isRefreshingDirectoryCache"
          :disabled="isRefreshingDirectoryCache"
          @click="refreshDirectoryCache"
        />
      </div>
    </header>


    <section class="stats-grid">
      <article class="stat-card">
        <span class="stat-label">
          Всего
        </span>

        <strong class="stat-value">
          {{ stats.total }}
        </strong>
      </article>

      <article class="stat-card">
        <span class="stat-label">
          DOMAIN
        </span>

        <strong class="stat-value">
          {{ stats.domain }}
        </strong>
      </article>

      <article class="stat-card">
        <span class="stat-label">
          EXTERNAL
        </span>

        <strong class="stat-value">
          {{ stats.external }}
        </strong>
      </article>

      <article class="stat-card">
        <span class="stat-label">
          Зарегистрировано
        </span>

        <strong class="stat-value">
          {{ stats.registered }}
        </strong>
      </article>

      <article class="stat-card">
        <span class="stat-label">
          Активные
        </span>

        <strong class="stat-value">
          {{ stats.active }}
        </strong>
      </article>

      <article class="stat-card stat-card--warning">
        <span class="stat-label">
          Заблокировано
        </span>

        <strong class="stat-value">
          {{ stats.blocked }}
        </strong>
      </article>
    </section>


    <section class="filters">
      <div class="search-box">
        <Icon
          name="i-heroicons-magnifying-glass"
          class="search-icon"
        />

        <input
          v-model="filters.search"
          type="text"
          class="filter-input search-input"
          placeholder="ФИО, логин, email, подразделение, должность..."
        >
      </div>

      <select
        v-model="filters.source"
        class="filter-input"
      >
        <option value="all">
          Все источники
        </option>

        <option value="domain">
          DOMAIN
        </option>

        <option value="external">
          EXTERNAL
        </option>
      </select>

      <select
        v-model="filters.status"
        class="filter-input"
      >
        <option value="all">
          Все статусы
        </option>

        <option value="ACTIVE">
          ACTIVE
        </option>

        <option value="PENDING_ACTIVATION">
          PENDING_ACTIVATION
        </option>

        <option value="BLOCKED">
          BLOCKED
        </option>

        <option value="DISABLED">
          DISABLED
        </option>
      </select>

      <UButton
        label="Сбросить"
        icon="i-heroicons-x-mark"
        color="neutral"
        variant="outline"
        :disabled="!hasFilters"
        @click="resetFilters"
      />
    </section>


    <div class="admin-mode-tabs">
      <button
        type="button"
        class="admin-mode-tab"
        :class="{
          'admin-mode-tab--active':
            adminMode === 'users',
        }"
        @click="adminMode = 'users'"
      >
        <Icon
          name="i-heroicons-users"
          size="17"
        />
        Пользователи
      </button>

      <button
        type="button"
        class="admin-mode-tab"
        :class="{
          'admin-mode-tab--active':
            adminMode === 'departments',
        }"
        @click="openDepartments"
      >
        <Icon
          name="i-heroicons-building-office-2"
          size="17"
        />
        Подразделения
      </button>
    </div>


    <section
      v-if="adminMode === 'users'"
      class="workspace"
    >
      <aside class="users-panel">
        <div class="panel-head">
          <div>
            <h2 class="panel-title">
              Пользователи
            </h2>

            <p class="panel-subtitle">
              Найдено: {{ total }}
            </p>
          </div>

          <span class="page-badge">
            {{ page }} / {{ totalPages }}
          </span>
        </div>


        <div
          v-if="isLoading"
          class="loading-state"
        >
          <div class="spinner" />
          <span>Загрузка пользователей...</span>
        </div>

        <div
          v-else
          class="users-list"
        >
          <button
            v-for="row in rows"
            :key="row.key"
            type="button"
            class="user-row"
            :class="{
              'user-row--active':
                selectedUser?.key === row.key,
            }"
            @click="selectUser(row)"
          >
            <div class="avatar">
              {{ initials(row.displayName) }}
            </div>

            <div class="user-main">
              <div class="user-name">
                {{ row.displayName }}
              </div>

              <div class="user-meta">
                <span>
                  {{ row.login || row.email || '—' }}
                </span>

                <span
                  class="source-badge"
                  :class="sourceBadgeClass(row.source)"
                >
                  {{ row.source }}
                </span>
              </div>

              <div class="user-submeta">
                {{
                  row.directory?.department ||
                  row.appUser?.department?.name ||
                  'Подразделение не указано'
                }}
              </div>
            </div>

            <div class="user-state">
              <span
                v-if="row.appUser"
                class="status-badge"
                :class="statusBadgeClass(row.appUser.status)"
              >
                {{ row.appUser.status }}
              </span>

              <span
                v-else
                class="status-badge status-badge--not-registered"
              >
                Не зарегистрирован
              </span>

              <span
                v-if="row.directory?.accountDisabled"
                class="directory-disabled"
              >
                AD disabled
              </span>
            </div>
          </button>

          <div
            v-if="rows.length === 0"
            class="empty-users"
          >
            Пользователи не найдены
          </div>
        </div>


        <footer class="users-footer">
          <UButton
            label="Назад"
            size="sm"
            color="neutral"
            variant="outline"
            :disabled="page <= 1 || isLoading"
            @click="previousPage"
          />

          <span class="page-text">
            {{ page }} / {{ totalPages }}
          </span>

          <UButton
            label="Вперёд"
            size="sm"
            color="neutral"
            variant="outline"
            :disabled="
              page >= totalPages ||
              isLoading
            "
            @click="nextPage"
          />
        </footer>
      </aside>


      <main class="detail-panel">
        <template v-if="selectedUser">
          <header class="detail-header">
            <div class="detail-person">
              <div class="detail-avatar">
                {{ initials(selectedUser.displayName) }}
              </div>

              <div>
                <h2 class="detail-name">
                  {{ selectedUser.displayName }}
                </h2>

                <div class="detail-identity">
                  {{
                    selectedUser.login ||
                    selectedUser.email ||
                    '—'
                  }}
                </div>
              </div>
            </div>

            <div class="detail-badges">
              <span
                class="source-badge"
                :class="sourceBadgeClass(selectedUser.source)"
              >
                {{ selectedUser.source }}
              </span>

              <span
                v-if="selectedUser.appUser"
                class="status-badge"
                :class="statusBadgeClass(selectedUser.appUser.status)"
              >
                {{ selectedUser.appUser.status }}
              </span>
            </div>
          </header>


          <div class="section-tabs">
            <button
              v-for="tab in tabs"
              :key="tab.value"
              type="button"
              class="section-tab"
              :class="{
                'section-tab--active':
                  activeTab === tab.value,
              }"
              @click="activeTab = tab.value"
            >
              <Icon
                :name="tab.icon"
                size="16"
              />

              {{ tab.label }}
            </button>
          </div>


          <section
            v-if="activeTab === 'profile'"
            class="detail-content"
          >
            <div class="info-grid">
              <article class="info-card">
                <span class="info-label">
                  ФИО
                </span>

                <strong>
                  {{ selectedUser.displayName }}
                </strong>
              </article>

              <article class="info-card">
                <span class="info-label">
                  Логин
                </span>

                <strong>
                  {{ selectedUser.login || '—' }}
                </strong>
              </article>

              <article class="info-card">
                <span class="info-label">
                  Email
                </span>

                <strong>
                  {{ selectedUser.email || '—' }}
                </strong>
              </article>

              <article class="info-card">
                <span class="info-label">
                  Телефон
                </span>

                <strong>
                  {{
                    selectedUser.directory?.telephoneNumber ||
                    '—'
                  }}
                </strong>
              </article>

              <article class="info-card">
                <span class="info-label">
                  Подразделение AD
                </span>

                <strong>
                  {{
                    selectedUser.directory?.department ||
                    '—'
                  }}
                </strong>
              </article>

              <article class="info-card">
                <span class="info-label">
                  Подразделение Space
                </span>

                <strong>
                  {{
                    selectedUser.appUser?.department?.name ||
                    '—'
                  }}
                </strong>
              </article>

              <article class="info-card">
                <span class="info-label">
                  Должность
                </span>

                <strong>
                  {{
                    selectedUser.directory?.position ||
                    selectedUser.appUser?.position ||
                    '—'
                  }}
                </strong>
              </article>

              <article class="info-card">
                <span class="info-label">
                  Организация
                </span>

                <strong>
                  {{
                    selectedUser.appUser?.organization ||
                    '—'
                  }}
                </strong>
              </article>
            </div>


            <div class="system-block">
              <h3 class="block-title">
                Состояние в Space
              </h3>

              <div class="system-grid">
                <div class="system-item">
                  <span>
                    App User
                  </span>

                  <strong>
                    {{
                      selectedUser.appUser
                        ? `#${selectedUser.appUser.id}`
                        : 'Не создан'
                    }}
                  </strong>
                </div>

                <div class="system-item">
                  <span>
                    Назначено прав
                  </span>

                  <strong>
                    {{
                      selectedUser.appUser?.permissionsCount ??
                      0
                    }}
                  </strong>
                </div>

                <div class="system-item">
                  <span>
                    Directory ID
                  </span>

                  <strong class="mono">
                    {{
                      selectedUser.directory?.directoryObjectId ||
                      selectedUser.appUser?.directoryObjectId ||
                      '—'
                    }}
                  </strong>
                </div>

                <div class="system-item">
                  <span>
                    AD учётка
                  </span>

                  <strong>
                    {{
                      selectedUser.directory?.accountDisabled
                        ? 'Отключена'
                        : selectedUser.directory
                          ? 'Активна'
                          : 'Нет данных'
                    }}
                  </strong>
                </div>
              </div>
            </div>
          </section>


          <section
            v-else-if="activeTab === 'access'"
            class="access-section"
          >
            <template v-if="!selectedUser.appUser">
              <div class="placeholder-section">
                <Icon
                  name="i-heroicons-user-plus"
                  size="34"
                />

                <h3>
                  Пользователь ещё не зарегистрирован в Space
                </h3>

                <p>
                  Индивидуальные права можно назначать только после создания
                  записи пользователя в app_users.
                </p>
              </div>
            </template>

            <template v-else>
              <div class="access-head">
                <div>
                  <h3 class="block-title">
                    Индивидуальные права
                  </h3>

                  <p class="access-hint">
                    Сейчас матрица работает только в режиме просмотра.
                  </p>
                </div>

                <div class="access-summary">
                  <span>
                    Ресурсов:
                    <strong>
                      {{ accessSummary.totalResources }}
                    </strong>
                  </span>

                  <span>
                    С доступом:
                    <strong>
                      {{ accessSummary.resourcesWithAnyPermission }}
                    </strong>
                  </span>

                  <span>
                    Прав:
                    <strong>
                      {{ accessSummary.grantedPermissionsCount }}
                    </strong>
                  </span>
                </div>
              </div>

              <div
                v-if="isLoadingAccess"
                class="loading-state access-loading"
              >
                <div class="spinner" />
                <span>Загрузка прав...</span>
              </div>

              <div
                v-else
                class="access-table-shell"
              >
                <table class="access-table">
                  <thead>
                    <tr>
                      <th class="resource-column">
                        Ресурс
                      </th>

                      <th>
                        Тип
                      </th>

                      <th>
                        Подразделение
                      </th>

                      <th
                        v-for="action in accessActions"
                        :key="action"
                        class="action-column"
                      >
                        {{ action }}
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr
                      v-for="resource in accessResources"
                      :key="resource.id"
                    >
                      <td>
                        <div class="resource-name">
                          {{ resource.name }}
                        </div>

                        <div
                          class="resource-key"
                          :title="resource.key"
                        >
                          {{ resource.key }}
                        </div>
                      </td>

                      <td>
                        <span class="resource-type">
                          {{ resource.type }}
                        </span>
                      </td>

                      <td>
                        <div class="resource-departments">
                          <span
                            v-for="department in resource.departments"
                            :key="department.id"
                            class="department-chip"
                            :class="{
                              'department-chip--owner':
                                department.isOwner,
                            }"
                            :title="
                              department.isOwner
                                ? 'Владелец ресурса'
                                : department.name
                            "
                          >
                            {{ department.name }}
                          </span>

                          <span
                            v-if="resource.departments.length === 0"
                            class="muted"
                          >
                            —
                          </span>
                        </div>
                      </td>

                      <td
                        v-for="action in accessActions"
                        :key="action"
                        class="permission-cell"
                      >
                        <span
                          class="permission-box"
                          :class="{
                            'permission-box--granted':
                              resource.actions[action]?.granted,
                          }"
                          :title="
                            permissionTitle(
                              resource,
                              action,
                            )
                          "
                        >
                          <Icon
                            v-if="resource.actions[action]?.granted"
                            name="i-heroicons-check"
                            size="14"
                          />

                          <span v-else>
                            —
                          </span>
                        </span>
                      </td>
                    </tr>

                    <tr v-if="accessResources.length === 0">
                      <td
                        colspan="7"
                        class="empty-access"
                      >
                        Активные ресурсы не найдены
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>
          </section>


          <section
            v-else-if="activeTab === 'roles'"
            class="placeholder-section"
          >
            <Icon
              name="i-heroicons-user-group"
              size="34"
            />

            <h3>
              Роли пользователя
            </h3>

            <p>
              Этот раздел станет активным после добавления
              Role / UserRole / RolePermission.
            </p>
          </section>


          <section
            v-else
            class="placeholder-section"
          >
            <Icon
              name="i-heroicons-clock"
              size="34"
            />

            <h3>
              История изменений
            </h3>

            <p>
              Здесь появится административный аудит:
              активация, блокировка, роли и права.
            </p>
          </section>
        </template>


        <div
          v-else
          class="empty-detail"
        >
          <Icon
            name="i-heroicons-user-circle"
            size="58"
          />

          <h3>
            Выберите пользователя
          </h3>

          <p>
            Карточка пользователя появится здесь.
          </p>
        </div>
      </main>
    </section>


    <section
      v-else
      class="departments-workspace"
    >
      <aside class="departments-list-panel">
        <div class="panel-head">
          <div>
            <h2 class="panel-title">
              Подразделения Active Directory
            </h2>

            <p class="panel-subtitle">
              Найдено:
              {{ directoryDepartmentSummary.directoryDepartmentsCount }}
              · сопоставлено:
              {{ directoryDepartmentSummary.mappedCount }}
            </p>
          </div>

          <UButton
            label="Обновить"
            icon="i-heroicons-arrow-path"
            size="sm"
            color="neutral"
            variant="outline"
            :loading="isLoadingDepartments"
            @click="loadDirectoryDepartments"
          />
        </div>


        <div
          v-if="isLoadingDepartments"
          class="loading-state"
        >
          <div class="spinner" />
          <span>Загрузка подразделений...</span>
        </div>

        <div
          v-else
          class="department-list"
        >
          <button
            v-for="department in directoryDepartments"
            :key="department.directoryName"
            type="button"
            class="department-row"
            :class="{
              'department-row--active':
                selectedDirectoryDepartment?.directoryName ===
                department.directoryName,
            }"
            @click="selectedDirectoryDepartment = department"
          >
            <div class="department-row-main">
              <div class="department-row-name">
                {{ department.directoryName }}
              </div>

              <div class="department-row-meta">
                {{ department.usersCount }} сотрудников
                ·
                {{ department.registeredCount }} в Space
              </div>
            </div>

            <span
              class="mapping-badge"
              :class="{
                'mapping-badge--mapped':
                  !!department.mapping,
              }"
            >
              {{
                department.mapping
                  ? 'Сопоставлено'
                  : 'Не сопоставлено'
              }}
            </span>
          </button>

          <div
            v-if="directoryDepartments.length === 0"
            class="empty-users"
          >
            Подразделения AD не найдены
          </div>
        </div>
      </aside>


      <main class="department-detail-panel">
        <template v-if="selectedDirectoryDepartment">
          <header class="detail-header">
            <div>
              <h2 class="detail-name">
                {{ selectedDirectoryDepartment.directoryName }}
              </h2>

              <div class="detail-identity">
                Active Directory ·
                {{ selectedDirectoryDepartment.usersCount }}
                сотрудников
              </div>
            </div>

            <span
              class="mapping-badge"
              :class="{
                'mapping-badge--mapped':
                  !!selectedDirectoryDepartment.mapping,
              }"
            >
              {{
                selectedDirectoryDepartment.mapping
                  ? 'Сопоставлено'
                  : 'Требует сопоставления'
              }}
            </span>
          </header>


          <div class="section-tabs">
            <button
              type="button"
              class="section-tab"
              :class="{
                'section-tab--active':
                  departmentDetailTab === 'members',
              }"
              @click="departmentDetailTab = 'members'"
            >
              <Icon
                name="i-heroicons-users"
                size="16"
              />
              Сотрудники
            </button>

            <button
              type="button"
              class="section-tab"
              :class="{
                'section-tab--active':
                  departmentDetailTab === 'permissions',
              }"
              :disabled="!selectedDirectoryDepartment.mapping"
              @click="openDepartmentPermissions"
            >
              <Icon
                name="i-heroicons-key"
                size="16"
              />
              Права подразделения
            </button>
          </div>


          <template v-if="departmentDetailTab === 'members'">
          <section class="department-mapping-card">
            <div>
              <h3 class="block-title">
                Подразделение Space
              </h3>

              <p class="access-hint">
                Сотрудники этого AD-подразделения будут связаны
                с выбранным подразделением Space.
              </p>
            </div>

            <div class="mapping-controls">
              <select
                v-model="selectedSpaceDepartmentId"
                class="filter-input"
                :disabled="isSavingDepartmentMapping"
              >
                <option :value="null">
                  Не сопоставлено
                </option>

                <option
                  v-for="spaceDepartment in spaceDepartments"
                  :key="spaceDepartment.id"
                  :value="spaceDepartment.id"
                >
                  {{ spaceDepartment.name }}
                </option>
              </select>

              <UButton
                label="Сохранить сопоставление"
                icon="i-heroicons-check"
                :loading="isSavingDepartmentMapping"
                :disabled="
                  isSavingDepartmentMapping ||
                  !departmentMappingChanged
                "
                @click="saveDepartmentMapping"
              />
            </div>
          </section>


          <section class="department-stats-grid">
            <article class="info-card">
              <span class="info-label">
                Сотрудников
              </span>

              <strong>
                {{ selectedDirectoryDepartment.usersCount }}
              </strong>
            </article>

            <article class="info-card">
              <span class="info-label">
                Уже в Space
              </span>

              <strong>
                {{ selectedDirectoryDepartment.registeredCount }}
              </strong>
            </article>

            <article class="info-card">
              <span class="info-label">
                Ещё не зарегистрированы
              </span>

              <strong>
                {{ selectedDirectoryDepartment.notRegisteredCount }}
              </strong>
            </article>

            <article class="info-card">
              <span class="info-label">
                Отключены в AD
              </span>

              <strong>
                {{ selectedDirectoryDepartment.disabledCount }}
              </strong>
            </article>
          </section>


          <section class="department-members">
            <h3 class="block-title">
              Сотрудники подразделения
            </h3>

            <div class="members-table-shell">
              <table class="members-table">
                <thead>
                  <tr>
                    <th>ФИО</th>
                    <th>Логин</th>
                    <th>Должность</th>
                    <th>Space</th>
                    <th>AD</th>
                  </tr>
                </thead>

                <tbody>
                  <tr
                    v-for="member in selectedDirectoryDepartment.members"
                    :key="member.login"
                  >
                    <td>
                      {{ member.fullName }}
                    </td>

                    <td class="mono">
                      {{ member.login }}
                    </td>

                    <td>
                      {{ member.position || '—' }}
                    </td>

                    <td>
                      <span
                        class="status-badge"
                        :class="
                          member.appUser
                            ? 'status-badge--active'
                            : 'status-badge--not-registered'
                        "
                      >
                        {{
                          member.appUser
                            ? member.appUser.status
                            : 'Не зарегистрирован'
                        }}
                      </span>
                    </td>

                    <td>
                      <span
                        class="status-badge"
                        :class="
                          member.accountDisabled
                            ? 'status-badge--blocked'
                            : 'status-badge--active'
                        "
                      >
                        {{
                          member.accountDisabled
                            ? 'Отключена'
                            : 'Активна'
                        }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
          </template>


          <section
            v-else
            class="department-permissions-section"
          >
            <template v-if="selectedDirectoryDepartment.mapping">
              <div class="access-head">
                <div>
                  <h3 class="block-title">
                    Права подразделения
                    «{{ selectedDirectoryDepartment.mapping.department.name }}»
                  </h3>

                  <p class="access-hint">
                    Каждая галочка сохраняется отдельно.
                    Это права подразделения, а не персональные UserPermission.
                  </p>
                </div>

                <div class="access-summary">
                  <span>
                    Ресурсов:
                    <strong>
                      {{ departmentPermissionSummary.totalResources }}
                    </strong>
                  </span>

                  <span>
                    С доступом:
                    <strong>
                      {{
                        departmentPermissionSummary
                          .resourcesWithAnyPermission
                      }}
                    </strong>
                  </span>

                  <span>
                    Прав:
                    <strong>
                      {{
                        departmentPermissionSummary
                          .grantedPermissionsCount
                      }}
                    </strong>
                  </span>
                </div>
              </div>


              <div
                v-if="isLoadingDepartmentPermissions"
                class="loading-state access-loading"
              >
                <div class="spinner" />
                <span>
                  Загрузка прав подразделения...
                </span>
              </div>


              <div
                v-else
                class="access-table-shell"
              >
                <table class="access-table">
                  <thead>
                    <tr>
                      <th class="resource-column">
                        Ресурс
                      </th>

                      <th>
                        Тип
                      </th>

                      <th>
                        Владелец
                      </th>

                      <th
                        v-for="action in departmentPermissionActions"
                        :key="action"
                        class="action-column"
                      >
                        {{ action }}
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr
                      v-for="resource in departmentPermissionResources"
                      :key="resource.id"
                    >
                      <td>
                        <div class="resource-name">
                          {{ resource.name }}
                        </div>

                        <div class="resource-key">
                          {{ resource.key }}
                        </div>
                      </td>

                      <td>
                        <span class="resource-type">
                          {{ resource.type }}
                        </span>
                      </td>

                      <td>
                        <div class="resource-departments">
                          <span
                            v-for="owner in resource.ownership.filter(
                              item => item.isOwner
                            )"
                            :key="owner.departmentId"
                            class="department-chip department-chip--owner"
                          >
                            {{ owner.departmentName }}
                          </span>

                          <span
                            v-if="
                              resource.ownership.filter(
                                item => item.isOwner
                              ).length === 0
                            "
                            class="muted"
                          >
                            —
                          </span>
                        </div>
                      </td>

                      <td
                        v-for="action in departmentPermissionActions"
                        :key="action"
                        class="permission-cell"
                      >
                        <button
                          type="button"
                          class="permission-toggle"
                          :class="{
                            'permission-toggle--granted':
                              resource.actions[action]?.granted,
                          }"
                          :disabled="
                            isDepartmentPermissionSaving(
                              resource.id,
                              action,
                            )
                          "
                          :title="
                            departmentPermissionTitle(
                              resource,
                              action,
                            )
                          "
                          @click="
                            toggleDepartmentPermission(
                              resource,
                              action,
                            )
                          "
                        >
                          <Icon
                            v-if="
                              isDepartmentPermissionSaving(
                                resource.id,
                                action,
                              )
                            "
                            name="i-heroicons-arrow-path"
                            size="14"
                            class="permission-spin"
                          />

                          <Icon
                            v-else-if="
                              resource.actions[action]?.granted
                            "
                            name="i-heroicons-check"
                            size="14"
                          />

                          <span v-else>
                            —
                          </span>
                        </button>
                      </td>
                    </tr>

                    <tr
                      v-if="
                        departmentPermissionResources.length === 0
                      "
                    >
                      <td
                        colspan="7"
                        class="empty-access"
                      >
                        Активные ресурсы не найдены
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>

            <div
              v-else
              class="placeholder-section"
            >
              <Icon
                name="i-heroicons-link"
                size="34"
              />

              <h3>
                Сначала сопоставьте подразделение
              </h3>

              <p>
                Права выдаются внутреннему Department в Space,
                поэтому сначала нужно настроить AD → Space mapping.
              </p>
            </div>
          </section>
        </template>

        <div
          v-else
          class="empty-detail"
        >
          <Icon
            name="i-heroicons-building-office-2"
            size="58"
          />

          <h3>
            Выберите подразделение
          </h3>

          <p>
            Здесь появятся сотрудники и настройка сопоставления.
          </p>
        </div>
      </main>
    </section>
  </div>
</template>


<script setup lang="ts">
import {
  computed,
  onMounted,
  reactive,
  ref,
  watch,
} from 'vue'


type UserStatus =
  | 'PENDING_ACTIVATION'
  | 'ACTIVE'
  | 'BLOCKED'
  | 'DISABLED'


interface DirectoryUserView {
  directoryObjectId: string | null
  login: string
  userPrincipalName: string | null
  fullName: string
  email: string | null
  department: string | null
  position: string | null
  telephoneNumber: string | null
  distinguishedName: string | null
  userAccountControl: number | null
  accountDisabled: boolean
}


interface AdminUserRow {
  source:
    | 'DOMAIN'
    | 'EXTERNAL'

  key: string
  displayName: string
  login: string | null
  email: string | null

  directory:
    DirectoryUserView | null

  appUser: {
    id: number
    authType:
      | 'DOMAIN'
      | 'EXTERNAL'

    status:
      UserStatus

    login: string | null
    directoryObjectId: string | null
    email: string | null
    fullName: string | null
    organization: string | null
    position: string | null

    department: {
      id: number
      key: string
      name: string
    } | null

    permissionsCount: number
    createdAt: string
    updatedAt: string
  } | null
}


interface ApiResponse {
  success: boolean
  data: AdminUserRow[]
  total: number
  page: number
  pageSize: number
  totalPages: number

  directoryCache: {
    available: boolean

    state:
      | 'fresh'
      | 'stale'
      | 'missing'

    stale: boolean

    lastUpdated: string | null

    ageMinutes: number | null

    expiresAfterMinutes: number

    totalCount: number
    normalizedCount: number
  }

  capabilities: {
    canRefreshDirectoryCache: boolean
  }

  stats: {
    total: number
    domain: number
    external: number
    registered: number
    notRegistered: number
    active: number
    blocked: number
    directoryDisabled: number
  }
}


type AccessActionName =
  | 'VIEW'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'


interface AccessPermissionState {
  granted: boolean
  permissionId: number | null
  grantedByLogin: string | null
  createdAt: string | null
  updatedAt: string | null
}


interface AccessResourceRow {
  id: number
  key: string
  name: string
  description: string | null
  type:
    | 'TABLE'
    | 'SECTION'
    | 'FEATURE'

  sortOrder: number

  departments: Array<{
    id: number
    key: string
    name: string
    isOwner: boolean
  }>

  actions:
    Record<
      AccessActionName,
      AccessPermissionState
    >
}


interface UserAccessResponse {
  success: boolean

  actions:
    AccessActionName[]

  data:
    AccessResourceRow[]

  summary: {
    totalResources: number
    resourcesWithAnyPermission: number
    grantedPermissionsCount: number
  }
}


const {
  showTost,
} = useAppToasts()


type DepartmentAccessAction =
  | 'VIEW'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'


interface DepartmentPermissionState {
  granted: boolean
  permissionId: number | null
  grantedByLogin: string | null
  createdAt: string | null
  updatedAt: string | null
}


interface DepartmentPermissionResource {
  id: number
  key: string
  name: string
  description: string | null

  type:
    | 'TABLE'
    | 'SECTION'
    | 'FEATURE'

  sortOrder: number

  ownership: Array<{
    departmentId: number
    departmentKey: string
    departmentName: string
    isOwner: boolean
  }>

  actions:
    Record<
      DepartmentAccessAction,
      DepartmentPermissionState
    >
}


interface DepartmentPermissionsResponse {
  success: boolean

  actions:
    DepartmentAccessAction[]

  data:
    DepartmentPermissionResource[]

  summary: {
    totalResources: number
    resourcesWithAnyPermission: number
    grantedPermissionsCount: number
  }
}


interface DirectoryDepartmentMember {
  login: string
  fullName: string
  email: string | null
  position: string | null
  accountDisabled: boolean

  appUser: {
    id: number
    status: string
    departmentId: number | null
  } | null
}


interface DirectoryDepartmentRow {
  directoryName: string
  usersCount: number
  registeredCount: number
  notRegisteredCount: number
  disabledCount: number

  mapping: {
    id: number

    department: {
      id: number
      key: string
      name: string
      isActive: boolean
    }
  } | null

  members: DirectoryDepartmentMember[]
}


interface SpaceDepartmentOption {
  id: number
  key: string
  name: string
  sortOrder: number
}


interface DirectoryDepartmentsResponse {
  success: boolean

  summary: {
    directoryDepartmentsCount: number
    mappedCount: number
    unmappedCount: number
    usersWithoutDepartment: number
    totalDirectoryUsers: number
  }

  directoryDepartments: DirectoryDepartmentRow[]
  spaceDepartments: SpaceDepartmentOption[]
}


const adminMode =
  ref<
    'users' |
    'departments'
  >(
    'users',
  )


const directoryDepartments =
  ref<DirectoryDepartmentRow[]>([])

const spaceDepartments =
  ref<SpaceDepartmentOption[]>([])

const selectedDirectoryDepartment =
  ref<DirectoryDepartmentRow | null>(
    null,
  )

const selectedSpaceDepartmentId =
  ref<number | null>(
    null,
  )

const isLoadingDepartments =
  ref(false)

const isSavingDepartmentMapping =
  ref(false)

const directoryDepartmentSummary =
  reactive({
    directoryDepartmentsCount:
      0,

    mappedCount:
      0,

    unmappedCount:
      0,

    usersWithoutDepartment:
      0,

    totalDirectoryUsers:
      0,
  })


const departmentDetailTab =
  ref<
    'members' |
    'permissions'
  >(
    'members',
  )


const departmentPermissionActions =
  ref<DepartmentAccessAction[]>([
    'VIEW',
    'CREATE',
    'UPDATE',
    'DELETE',
  ])


const departmentPermissionResources =
  ref<DepartmentPermissionResource[]>([])


const isLoadingDepartmentPermissions =
  ref(false)


const departmentPermissionSaving =
  ref<
    Set<string>
  >(
    new Set(),
  )


const loadedDepartmentPermissionId =
  ref<number | null>(
    null,
  )


const departmentPermissionSummary =
  reactive({
    totalResources:
      0,

    resourcesWithAnyPermission:
      0,

    grantedPermissionsCount:
      0,
  })


const departmentMappingChanged =
  computed(
    () =>
      selectedDirectoryDepartment.value !==
        null &&
      (
        selectedDirectoryDepartment.value
          .mapping
          ?.department
          .id ??
        null
      ) !==
        selectedSpaceDepartmentId.value,
  )


const rows =
  ref<AdminUserRow[]>([])

const selectedUser =
  ref<AdminUserRow | null>(
    null,
  )

const isLoading =
  ref(false)

const page =
  ref(1)

const pageSize =
  ref(25)

const total =
  ref(0)

const totalPages =
  ref(1)


const accessActions =
  ref<AccessActionName[]>([
    'VIEW',
    'CREATE',
    'UPDATE',
    'DELETE',
  ])

const accessResources =
  ref<AccessResourceRow[]>([])

const isLoadingAccess =
  ref(false)

const loadedAccessUserId =
  ref<number | null>(
    null,
  )

const accessSummary =
  reactive({
    totalResources:
      0,

    resourcesWithAnyPermission:
      0,

    grantedPermissionsCount:
      0,
  })


const filters =
  reactive({
    search:
      '',

    source:
      'all',

    status:
      'all',
  })


const stats =
  reactive({
    total:
      0,

    domain:
      0,

    external:
      0,

    registered:
      0,

    notRegistered:
      0,

    active:
      0,

    blocked:
      0,

    directoryDisabled:
      0,
  })


const responseMeta =
  reactive({
    directoryCache: {
      available:
        false,

      state:
        'missing' as
          | 'fresh'
          | 'stale'
          | 'missing',

      stale:
        false,

      lastUpdated:
        null as
          string |
          null,

      ageMinutes:
        null as
          number |
          null,

      expiresAfterMinutes:
        60,

      totalCount:
        0,

      normalizedCount:
        0,
    },
  })


const capabilities =
  reactive({
    canRefreshDirectoryCache:
      false,
  })


const isRefreshingDirectoryCache =
  ref(false)


const tabs = [
  {
    value:
      'profile',

    label:
      'Профиль',

    icon:
      'i-heroicons-user',
  },

  {
    value:
      'access',

    label:
      'Права',

    icon:
      'i-heroicons-key',
  },

  {
    value:
      'roles',

    label:
      'Роли',

    icon:
      'i-heroicons-user-group',
  },

  {
    value:
      'history',

    label:
      'История',

    icon:
      'i-heroicons-clock',
  },
] as const


const activeTab =
  ref<
    typeof tabs[number]['value']
  >(
    'profile',
  )


const cacheStateText =
  computed(
    () => {
      const cache =
        responseMeta
          .directoryCache

      switch (
        cache.state
      ) {
        case 'fresh':
          return cache.ageMinutes ===
            null
              ? 'Кэш актуален'
              : `Кэш актуален · ${cache.ageMinutes} мин.`

        case 'stale':
          return cache.ageMinutes ===
            null
              ? 'Кэш устарел'
              : `Кэш устарел · ${cache.ageMinutes} мин.`

        case 'missing':
        default:
          return 'Кэш отсутствует или недоступен'
      }
    },
  )


const cacheStateTitle =
  computed(
    () => {
      const cache =
        responseMeta
          .directoryCache

      switch (
        cache.state
      ) {
        case 'fresh':
          return (
            'Данные Active Directory загружены из актуального кэша.'
          )

        case 'stale':
          return (
            `Кэш старше ${cache.expiresAfterMinutes} минут. ` +
            'Каталог отображается, но данные AD могут быть неактуальны.'
          )

        case 'missing':
        default:
          return (
            'Кэш Active Directory отсутствует или не удалось его прочитать. ' +
            'DOMAIN-пользователи из app_users по-прежнему отображаются.'
          )
      }
    },
  )


const cacheDotClass =
  computed(
    () => ({
      'cache-dot--fresh':
        responseMeta
          .directoryCache
          .state ===
        'fresh',

      'cache-dot--stale':
        responseMeta
          .directoryCache
          .state ===
        'stale',

      'cache-dot--missing':
        responseMeta
          .directoryCache
          .state ===
        'missing',
    }),
  )


const cacheStateClass =
  computed(
    () => ({
      'cache-state--fresh':
        responseMeta
          .directoryCache
          .state ===
        'fresh',

      'cache-state--stale':
        responseMeta
          .directoryCache
          .state ===
        'stale',

      'cache-state--missing':
        responseMeta
          .directoryCache
          .state ===
        'missing',
    }),
  )


const hasFilters =
  computed(
    () =>
      !!filters.search ||
      filters.source !==
        'all' ||
      filters.status !==
        'all',
  )


function getApiErrorMessage(
  error: unknown,
  fallback: string,
): string {
  const value =
    error as {
      data?: {
        data?: {
          message?: string
        }

        message?: string
        statusMessage?: string
      }

      statusMessage?: string
      message?: string
    }

  return (
    value.data
      ?.data
      ?.message ||
    value.data
      ?.message ||
    value.data
      ?.statusMessage ||
    value.statusMessage ||
    value.message ||
    fallback
  )
}


function departmentPermissionKey(
  resourceId: number,
  action: DepartmentAccessAction,
): string {
  return `${resourceId}:${action}`
}


function isDepartmentPermissionSaving(
  resourceId: number,
  action: DepartmentAccessAction,
): boolean {
  return departmentPermissionSaving.value.has(
    departmentPermissionKey(
      resourceId,
      action,
    ),
  )
}


function departmentPermissionTitle(
  resource: DepartmentPermissionResource,
  action: DepartmentAccessAction,
): string {
  const state =
    resource.actions[action]

  if (
    !state ||
    !state.granted
  ) {
    return `${action}: право подразделению не выдано`
  }

  const parts = [
    `${action}: право подразделению выдано`,
  ]

  if (
    state.grantedByLogin
  ) {
    parts.push(
      `выдал: ${state.grantedByLogin}`,
    )
  }

  if (
    state.createdAt
  ) {
    parts.push(
      `дата: ${formatDateTime(state.createdAt)}`,
    )
  }

  return parts.join('\n')
}


async function loadDepartmentPermissions(
  departmentId: number,
) {
  isLoadingDepartmentPermissions.value =
    true

  try {
    const response =
      await $fetch<DepartmentPermissionsResponse>(
        `/api/admin/departments/${departmentId}/permissions`,
      )

    departmentPermissionActions.value =
      response.actions

    departmentPermissionResources.value =
      response.data

    Object.assign(
      departmentPermissionSummary,
      response.summary,
    )

    loadedDepartmentPermissionId.value =
      departmentId

  } catch (error) {
    console.error(
      '[AdminCenter department permissions] Ошибка:',
      error,
    )

    showTost(
      'Ошибка',
      getApiErrorMessage(
        error,
        'Не удалось загрузить права подразделения',
      ),
      'error',
      'fxemoji:warningsign',
      6000,
    )

  } finally {
    isLoadingDepartmentPermissions.value =
      false
  }
}


async function openDepartmentPermissions() {
  const departmentId =
    selectedDirectoryDepartment
      .value
      ?.mapping
      ?.department
      .id

  if (!departmentId) {
    return
  }

  departmentDetailTab.value =
    'permissions'

  if (
    loadedDepartmentPermissionId.value !==
      departmentId
  ) {
    await loadDepartmentPermissions(
      departmentId,
    )
  }
}


async function toggleDepartmentPermission(
  resource: DepartmentPermissionResource,
  action: DepartmentAccessAction,
) {
  const departmentId =
    selectedDirectoryDepartment
      .value
      ?.mapping
      ?.department
      .id

  if (!departmentId) {
    return
  }


  const key =
    departmentPermissionKey(
      resource.id,
      action,
    )


  if (
    departmentPermissionSaving.value.has(
      key,
    )
  ) {
    return
  }


  const current =
    !!resource.actions[action]
      ?.granted

  const next =
    !current


  departmentPermissionSaving.value.add(
    key,
  )

  departmentPermissionSaving.value =
    new Set(
      departmentPermissionSaving.value,
    )


  try {
    await $fetch(
      `/api/admin/departments/${departmentId}/permissions`,
      {
        method:
          'PUT',

        body: {
          resourceId:
            resource.id,

          action,

          granted:
            next,
        },
      },
    )


    const state =
      resource.actions[action]

    if (state) {
      state.granted =
        next
    }


    await loadDepartmentPermissions(
      departmentId,
    )

  } catch (error) {
    console.error(
      '[AdminCenter department permission update] Ошибка:',
      error,
    )

    showTost(
      'Ошибка',
      getApiErrorMessage(
        error,
        'Не удалось изменить право подразделения',
      ),
      'error',
      'fxemoji:warningsign',
      6000,
    )

  } finally {
    departmentPermissionSaving.value.delete(
      key,
    )

    departmentPermissionSaving.value =
      new Set(
        departmentPermissionSaving.value,
      )
  }
}


async function loadDirectoryDepartments() {
  isLoadingDepartments.value =
    true

  try {
    const response =
      await $fetch<DirectoryDepartmentsResponse>(
        '/api/admin/directory-departments',
      )

    directoryDepartments.value =
      response.directoryDepartments

    spaceDepartments.value =
      response.spaceDepartments

    Object.assign(
      directoryDepartmentSummary,
      response.summary,
    )


    if (
      selectedDirectoryDepartment.value
    ) {
      selectedDirectoryDepartment.value =
        directoryDepartments.value
          .find(
            item =>
              item.directoryName ===
              selectedDirectoryDepartment
                .value
                ?.directoryName,
          ) ??
        null
    }


    if (
      !selectedDirectoryDepartment.value &&
      directoryDepartments.value.length >
        0
    ) {
      selectedDirectoryDepartment.value =
        directoryDepartments.value[0]!
    }

  } catch (error) {
    console.error(
      '[AdminCenter departments] Ошибка:',
      error,
    )

    showTost(
      'Ошибка',
      getApiErrorMessage(
        error,
        'Не удалось загрузить подразделения Active Directory',
      ),
      'error',
      'fxemoji:warningsign',
      6000,
    )

  } finally {
    isLoadingDepartments.value =
      false
  }
}


async function openDepartments() {
  adminMode.value =
    'departments'

  if (
    directoryDepartments.value.length ===
      0
  ) {
    await loadDirectoryDepartments()
  }
}


async function saveDepartmentMapping() {
  const department =
    selectedDirectoryDepartment.value

  if (
    !department ||
    !departmentMappingChanged.value ||
    isSavingDepartmentMapping.value
  ) {
    return
  }


  isSavingDepartmentMapping.value =
    true

  try {
    const response =
      await $fetch<{
        success: boolean
        message: string
      }>(
        '/api/admin/directory-departments/mapping',
        {
          method:
            'PUT',

          body: {
            directoryName:
              department.directoryName,

            departmentId:
              selectedSpaceDepartmentId.value,
          },
        },
      )


    showTost(
      'Подразделения',
      response.message,
      'success',
      'i-heroicons-check-circle',
      4500,
    )


    await loadDirectoryDepartments()

  } catch (error) {
    console.error(
      '[AdminCenter department mapping] Ошибка:',
      error,
    )

    showTost(
      'Ошибка',
      getApiErrorMessage(
        error,
        'Не удалось сохранить сопоставление подразделения',
      ),
      'error',
      'fxemoji:warningsign',
      6000,
    )

  } finally {
    isSavingDepartmentMapping.value =
      false
  }
}


async function refreshDirectoryCache() {
  if (
    !capabilities
      .canRefreshDirectoryCache ||
    isRefreshingDirectoryCache.value
  ) {
    return
  }


  isRefreshingDirectoryCache.value =
    true

  try {
    const response =
      await $fetch<{
        success: boolean

        data: {
          usersCount: number
          refreshedAt: string
          durationMs: number
        }

        message: string
      }>(
        '/api/admin/ad-cache/refresh',
        {
          method:
            'POST',
        },
      )


    showTost(
      'Active Directory',
      response.message,
      'success',
      'i-heroicons-check-circle',
      5000,
    )


    page.value =
      1

    await loadUsers()

  } catch (error) {
    console.error(
      '[AdminCenter AD cache refresh] Ошибка:',
      error,
    )

    showTost(
      'Ошибка',
      getApiErrorMessage(
        error,
        'Не удалось обновить кэш Active Directory',
      ),
      'error',
      'fxemoji:warningsign',
      6000,
    )

  } finally {
    isRefreshingDirectoryCache.value =
      false
  }
}


async function loadUsers() {
  isLoading.value =
    true

  try {
    const response =
      await $fetch<ApiResponse>(
        '/api/admin/users',
        {
          query: {
            page:
              page.value,

            pageSize:
              pageSize.value,

            search:
              filters.search ||
              undefined,

            source:
              filters.source,

            status:
              filters.status,
          },
        },
      )


    rows.value =
      response.data

    total.value =
      response.total

    totalPages.value =
      Math.max(
        1,
        response.totalPages,
      )

    page.value =
      response.page


    Object.assign(
      stats,
      response.stats,
    )

    Object.assign(
      responseMeta.directoryCache,
      response.directoryCache,
    )

    Object.assign(
      capabilities,
      response.capabilities,
    )


    if (
      selectedUser.value
    ) {
      const replacement =
        rows.value.find(
          row =>
            row.key ===
            selectedUser.value
              ?.key,
        )

      if (replacement) {
        selectedUser.value =
          replacement
      }
    }


    if (
      !selectedUser.value &&
      rows.value.length > 0
    ) {
      selectedUser.value =
        rows.value[0]!
    }

  } catch (error) {
    console.error(
      '[AdminCenter users] Ошибка:',
      error,
    )

    showTost(
      'Ошибка',
      getApiErrorMessage(
        error,
        'Не удалось загрузить пользователей',
      ),
      'error',
      'fxemoji:warningsign',
      6000,
    )

  } finally {
    isLoading.value =
      false
  }
}


async function loadUserAccess() {
  const appUserId =
    selectedUser.value
      ?.appUser
      ?.id

  if (!appUserId) {
    accessResources.value =
      []

    loadedAccessUserId.value =
      null

    Object.assign(
      accessSummary,
      {
        totalResources:
          0,

        resourcesWithAnyPermission:
          0,

        grantedPermissionsCount:
          0,
      },
    )

    return
  }


  isLoadingAccess.value =
    true

  try {
    const response =
      await $fetch<UserAccessResponse>(
        `/api/admin/users/${appUserId}/access`,
      )

    accessActions.value =
      response.actions

    accessResources.value =
      response.data

    Object.assign(
      accessSummary,
      response.summary,
    )

    loadedAccessUserId.value =
      appUserId

  } catch (error) {
    console.error(
      '[AdminCenter user access] Ошибка:',
      error,
    )

    showTost(
      'Ошибка',
      getApiErrorMessage(
        error,
        'Не удалось загрузить права пользователя',
      ),
      'error',
      'fxemoji:warningsign',
      6000,
    )

  } finally {
    isLoadingAccess.value =
      false
  }
}


function permissionTitle(
  resource:
    AccessResourceRow,
  action:
    AccessActionName,
): string {
  const state =
    resource.actions[action]

  if (
    !state ||
    !state.granted
  ) {
    return `${action}: право не назначено`
  }

  const parts = [
    `${action}: право назначено`,
  ]

  if (
    state.grantedByLogin
  ) {
    parts.push(
      `выдал: ${state.grantedByLogin}`,
    )
  }

  if (
    state.createdAt
  ) {
    parts.push(
      `дата: ${formatDateTime(state.createdAt)}`,
    )
  }

  return parts.join('\n')
}


function selectUser(
  row: AdminUserRow,
) {
  selectedUser.value =
    row

  activeTab.value =
    'profile'
}


function resetFilters() {
  filters.search =
    ''

  filters.source =
    'all'

  filters.status =
    'all'

  page.value =
    1

  void loadUsers()
}


function previousPage() {
  if (page.value <= 1) {
    return
  }

  page.value--

  void loadUsers()
}


function nextPage() {
  if (
    page.value >=
    totalPages.value
  ) {
    return
  }

  page.value++

  void loadUsers()
}


function initials(
  value: string,
): string {
  const parts =
    value
      .trim()
      .split(/\s+/)
      .filter(Boolean)

  if (
    parts.length >=
    2
  ) {
    return (
      (
        parts[0]?.[0] ??
        ''
      ) +
      (
        parts[1]?.[0] ??
        ''
      )
    )
      .toUpperCase()
  }

  return value
    .slice(
      0,
      2,
    )
    .toUpperCase()
}


function sourceBadgeClass(
  source:
    AdminUserRow['source'],
): string {
  return source ===
    'DOMAIN'
      ? 'source-badge--domain'
      : 'source-badge--external'
}


function statusBadgeClass(
  status:
    UserStatus,
): string {
  return (
    `status-badge--${
      status.toLowerCase()
    }`
  )
}


function formatDateTime(
  value:
    string | null,
): string {
  if (!value) {
    return '—'
  }

  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return '—'
  }

  return date
    .toLocaleString(
      'ru-RU',
      {
        day:
          '2-digit',

        month:
          '2-digit',

        year:
          'numeric',

        hour:
          '2-digit',

        minute:
          '2-digit',
      },
    )
}


let searchTimer:
  ReturnType<
    typeof setTimeout
  > | null = null


watch(
  () => filters.search,
  () => {
    if (searchTimer) {
      clearTimeout(
        searchTimer,
      )
    }

    searchTimer =
      setTimeout(
        () => {
          page.value =
            1

          void loadUsers()
        },
        350,
      )
  },
)


watch(
  [
    () =>
      filters.source,

    () =>
      filters.status,
  ],
  () => {
    page.value =
      1

    void loadUsers()
  },
)


watch(
  () =>
    selectedDirectoryDepartment
      .value,
  value => {
    selectedSpaceDepartmentId.value =
      value
        ?.mapping
        ?.department
        .id ??
      null

    departmentDetailTab.value =
      'members'

    loadedDepartmentPermissionId.value =
      null

    departmentPermissionResources.value =
      []
  },
)


watch(
  [
    () =>
      activeTab.value,

    () =>
      selectedUser.value
        ?.appUser
        ?.id,
  ],
  (
    [
      tab,
      userId,
    ],
  ) => {
    if (
      tab !==
        'access' ||
      !userId
    ) {
      return
    }

    if (
      loadedAccessUserId.value ===
        userId
    ) {
      return
    }

    void loadUserAccess()
  },
)


onMounted(
  () => {
    void loadUsers()
  },
)
</script>


<style scoped>
.admin-shell {
  display: flex;
  flex-direction: column;
  min-height:
    calc(100vh - 32px);
  padding: 18px;
  background: #f8fafc;
}

.admin-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 22px;
}

.eyebrow {
  margin: 0 0 3px;
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0.09em;
  color: #64748b;
  text-transform: uppercase;
}

.page-title {
  margin: 0;
  font-size: 30px;
  line-height: 1.1;
  font-weight: 780;
  color: #0f172a;
}

.page-subtitle {
  margin: 5px 0 0;
  font-size: 13px;
  color: #64748b;
}

.cache-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cache-state {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 210px;
  padding: 8px 11px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 9px;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease;
}

.cache-state--fresh {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.cache-state--stale {
  background: #fffbeb;
  border-color: #fde68a;
}

.cache-state--missing {
  background: #fef2f2;
  border-color: #fecaca;
}

.cache-dot {
  width: 9px;
  height: 9px;
  flex: 0 0 auto;
  border-radius: 999px;
}

.cache-dot--fresh {
  background: #22c55e;
  box-shadow:
    0 0 0 3px
    rgb(34 197 94 / 12%);
}

.cache-dot--stale {
  background: #eab308;
  box-shadow:
    0 0 0 3px
    rgb(234 179 8 / 13%);
}

.cache-dot--missing {
  background: #ef4444;
  box-shadow:
    0 0 0 3px
    rgb(239 68 68 / 12%);
}

.cache-title {
  font-size: 11px;
  font-weight: 700;
  color: #334155;
}

.cache-text {
  margin-top: 1px;
  font-size: 9px;
  font-weight: 650;
  color: #64748b;
}

.cache-updated {
  margin-top: 2px;
  font-size: 8px;
  color: #94a3b8;
}

.stats-grid {
  display: grid;
  grid-template-columns:
    repeat(
      6,
      minmax(0, 1fr)
    );
  gap: 8px;
  margin-top: 15px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  padding: 9px 11px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 9px;
}

.stat-card--warning {
  background: #fff7ed;
  border-color: #fed7aa;
}

.stat-label {
  font-size: 9px;
  font-weight: 750;
  letter-spacing: 0.05em;
  color: #94a3b8;
  text-transform: uppercase;
}

.stat-value {
  margin-top: 2px;
  font-size: 20px;
  color: #0f172a;
}

.filters {
  display: grid;
  grid-template-columns:
    minmax(300px, 1fr)
    170px
    190px
    auto;
  gap: 8px;
  margin-top: 12px;
}

.search-box {
  position: relative;
}

.search-icon {
  position: absolute;
  top: 50%;
  left: 11px;
  color: #94a3b8;
  transform:
    translateY(-50%);
}

.filter-input {
  width: 100%;
  min-width: 0;
  height: 38px;
  padding: 0 10px;
  font-size: 12px;
  color: #0f172a;
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  outline: none;
}

.search-input {
  padding-left: 34px;
}

.filter-input:focus {
  border-color: #38bdf8;
  box-shadow:
    0 0 0 3px
    rgb(56 189 248 / 11%);
}

.admin-mode-tabs {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 12px;
}

.admin-mode-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  font-size: 10px;
  font-weight: 700;
  color: #64748b;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.admin-mode-tab:hover {
  color: #0369a1;
  border-color: #bae6fd;
}

.admin-mode-tab--active {
  color: #075985;
  background: #e0f2fe;
  border-color: #7dd3fc;
}

.departments-workspace {
  display: grid;
  grid-template-columns:
    minmax(360px, 0.8fr)
    minmax(560px, 1.5fr);
  flex: 1;
  min-height: 0;
  gap: 12px;
  margin-top: 12px;
}

.departments-list-panel,
.department-detail-panel {
  min-width: 0;
  min-height: 620px;
  overflow: hidden;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow:
    0 8px 24px
    rgb(15 23 42 / 4%);
}

.departments-list-panel {
  display: flex;
  flex-direction: column;
}

.department-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.department-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 10px;
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid #f1f5f9;
}

.department-row:hover {
  background: #f8fbff;
}

.department-row--active {
  background: #eff6ff;
  box-shadow:
    inset 3px 0 0 #0ea5e9;
}

.department-row-main {
  min-width: 0;
}

.department-row-name {
  overflow: hidden;
  font-size: 11px;
  font-weight: 700;
  color: #0f172a;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.department-row-meta {
  margin-top: 2px;
  font-size: 9px;
  color: #94a3b8;
}

.mapping-badge {
  display: inline-flex;
  flex: 0 0 auto;
  padding: 3px 6px;
  font-size: 8px;
  font-weight: 750;
  color: #92400e;
  background: #fef3c7;
  border-radius: 999px;
}

.mapping-badge--mapped {
  color: #166534;
  background: #dcfce7;
}

.department-mapping-card {
  display: grid;
  grid-template-columns:
    minmax(0, 1fr)
    minmax(300px, 0.9fr);
  align-items: end;
  gap: 14px;
  margin: 14px 16px 0;
  padding: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 9px;
}

.mapping-controls {
  display: grid;
  grid-template-columns:
    minmax(0, 1fr)
    auto;
  gap: 7px;
}

.department-stats-grid {
  display: grid;
  grid-template-columns:
    repeat(4, minmax(0, 1fr));
  gap: 7px;
  margin: 12px 16px 0;
}

.department-members {
  margin: 14px 16px 16px;
}

.department-permissions-section {
  padding: 14px 16px 16px;
}

.permission-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  color: #cbd5e1;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  transition:
    background-color 0.12s ease,
    border-color 0.12s ease,
    color 0.12s ease;
}

.permission-toggle:hover:not(:disabled) {
  color: #0369a1;
  background: #f0f9ff;
  border-color: #7dd3fc;
}

.permission-toggle--granted {
  color: #166534;
  background: #dcfce7;
  border-color: #86efac;
}

.permission-toggle:disabled {
  cursor: wait;
  opacity: 0.65;
}

.permission-spin {
  animation:
    spin 0.8s linear infinite;
}

.members-table-shell {
  max-height: 370px;
  overflow: auto;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.members-table {
  width: 100%;
  min-width: 700px;
  border-collapse: collapse;
}

.members-table th {
  position: sticky;
  top: 0;
  z-index: 2;
  padding: 8px 9px;
  font-size: 8px;
  font-weight: 750;
  color: #64748b;
  text-align: left;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.members-table td {
  padding: 8px 9px;
  font-size: 10px;
  color: #475569;
  border-bottom: 1px solid #f1f5f9;
}

.members-table tbody tr:hover {
  background: #f8fbff;
}

.workspace {
  display: grid;
  grid-template-columns:
    minmax(380px, 0.85fr)
    minmax(520px, 1.5fr);
  flex: 1;
  min-height: 0;
  gap: 12px;
  margin-top: 12px;
}

.users-panel,
.detail-panel {
  min-width: 0;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow:
    0 8px 24px
    rgb(15 23 42 / 4%);
}

.users-panel {
  display: flex;
  flex-direction: column;
  min-height: 620px;
  overflow: hidden;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 0 0 auto;
  gap: 10px;
  padding: 13px 14px 10px;
  border-bottom: 1px solid #e2e8f0;
}

.panel-title {
  margin: 0;
  font-size: 15px;
  font-weight: 740;
  color: #0f172a;
}

.panel-subtitle {
  margin: 2px 0 0;
  font-size: 10px;
  color: #94a3b8;
}

.page-badge {
  padding: 4px 7px;
  font-size: 9px;
  font-weight: 700;
  color: #475569;
  background: #f8fafc;
  border-radius: 6px;
}

.users-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.user-row {
  display: grid;
  grid-template-columns:
    38px
    minmax(0, 1fr)
    auto;
  align-items: center;
  width: 100%;
  gap: 9px;
  padding: 9px 11px;
  text-align: left;
  border-bottom: 1px solid #f1f5f9;
}

.user-row:hover {
  background: #f8fbff;
}

.user-row--active {
  background: #eff6ff;
  box-shadow:
    inset 3px 0 0 #0ea5e9;
}

.avatar,
.detail-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  font-weight: 750;
  color: #075985;
  background: #e0f2fe;
  border-radius: 999px;
}

.avatar {
  width: 34px;
  height: 34px;
  font-size: 11px;
}

.detail-avatar {
  width: 50px;
  height: 50px;
  font-size: 16px;
}

.user-main {
  min-width: 0;
}

.user-name {
  overflow: hidden;
  font-size: 12px;
  font-weight: 700;
  color: #0f172a;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-meta {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 5px;
  margin-top: 2px;
  font-size: 10px;
  color: #64748b;
}

.user-meta > span:first-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-submeta {
  margin-top: 2px;
  overflow: hidden;
  font-size: 9px;
  color: #94a3b8;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-state {
  display: flex;
  align-items: flex-end;
  flex-direction: column;
  gap: 3px;
}

.source-badge,
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  font-size: 8px;
  font-weight: 750;
  border-radius: 999px;
}

.source-badge--domain {
  color: #075985;
  background: #e0f2fe;
}

.source-badge--external {
  color: #6b21a8;
  background: #f3e8ff;
}

.status-badge--active {
  color: #166534;
  background: #dcfce7;
}

.status-badge--pending_activation {
  color: #92400e;
  background: #fef3c7;
}

.status-badge--blocked {
  color: #991b1b;
  background: #fee2e2;
}

.status-badge--disabled {
  color: #475569;
  background: #e2e8f0;
}

.status-badge--not-registered {
  color: #64748b;
  background: #f1f5f9;
}

.directory-disabled {
  font-size: 8px;
  font-weight: 700;
  color: #b91c1c;
}

.users-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 0 0 auto;
  gap: 8px;
  padding: 9px 11px;
  border-top: 1px solid #e2e8f0;
}

.page-text {
  font-size: 10px;
  color: #64748b;
}

.loading-state,
.empty-users {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-height: 180px;
  gap: 9px;
  color: #94a3b8;
  font-size: 11px;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #e2e8f0;
  border-bottom-color: #0ea5e9;
  border-radius: 999px;
  animation:
    spin 0.8s linear infinite;
}

/* DETAIL */

.detail-panel {
  min-height: 620px;
  overflow: hidden;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px;
  border-bottom: 1px solid #e2e8f0;
}

.detail-person {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 12px;
}

.detail-name {
  margin: 0;
  overflow: hidden;
  font-size: 18px;
  font-weight: 760;
  color: #0f172a;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-identity {
  margin-top: 2px;
  font-size: 11px;
  color: #64748b;
}

.detail-badges {
  display: flex;
  align-items: center;
  gap: 6px;
}

.section-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 14px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.section-tab {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 9px;
  font-size: 10px;
  font-weight: 650;
  color: #64748b;
  border-radius: 7px;
}

.section-tab:hover {
  color: #0369a1;
  background: #f0f9ff;
}

.section-tab--active {
  color: #075985;
  background: #e0f2fe;
}

.detail-content {
  padding: 15px 18px 18px;
}

.info-grid {
  display: grid;
  grid-template-columns:
    repeat(
      2,
      minmax(0, 1fr)
    );
  gap: 8px;
}

.info-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 9px 10px;
  background: #f8fafc;
  border: 1px solid #eef2f7;
  border-radius: 8px;
}

.info-label {
  margin-bottom: 3px;
  font-size: 8px;
  font-weight: 750;
  letter-spacing: 0.05em;
  color: #94a3b8;
  text-transform: uppercase;
}

.info-card strong {
  overflow: hidden;
  font-size: 11px;
  color: #334155;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.system-block {
  margin-top: 14px;
  padding-top: 13px;
  border-top: 1px solid #e2e8f0;
}

.block-title {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 740;
  color: #0f172a;
}

.system-grid {
  display: grid;
  grid-template-columns:
    repeat(
      2,
      minmax(0, 1fr)
    );
  gap: 7px;
}

.system-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  gap: 10px;
  padding: 8px 9px;
  font-size: 10px;
  color: #64748b;
  border: 1px solid #e2e8f0;
  border-radius: 7px;
}

.system-item strong {
  max-width: 62%;
  overflow: hidden;
  color: #334155;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mono {
  font-family:
    ui-monospace,
    SFMono-Regular,
    Menlo,
    monospace;
  font-size: 9px;
}

.access-section {
  min-height: 430px;
  padding: 14px 16px 16px;
}

.access-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.access-hint {
  margin: 2px 0 0;
  font-size: 9px;
  color: #94a3b8;
}

.access-summary {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
}

.access-summary span {
  padding: 4px 7px;
  font-size: 9px;
  color: #64748b;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
}

.access-summary strong {
  color: #0f172a;
}

.access-loading {
  min-height: 300px;
}

.access-table-shell {
  max-height: 505px;
  overflow: auto;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.access-table {
  width: 100%;
  min-width: 760px;
  border-collapse: collapse;
}

.access-table th {
  position: sticky;
  top: 0;
  z-index: 2;
  padding: 8px 9px;
  font-size: 8px;
  font-weight: 750;
  letter-spacing: 0.04em;
  color: #64748b;
  text-align: left;
  text-transform: uppercase;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.access-table td {
  padding: 8px 9px;
  font-size: 10px;
  color: #475569;
  vertical-align: middle;
  border-bottom: 1px solid #f1f5f9;
}

.access-table tbody tr:hover {
  background: #f8fbff;
}

.resource-column {
  min-width: 235px;
}

.action-column {
  width: 72px;
  text-align: center !important;
}

.resource-name {
  font-weight: 700;
  color: #0f172a;
}

.resource-key {
  max-width: 290px;
  margin-top: 2px;
  overflow: hidden;
  font-family:
    ui-monospace,
    SFMono-Regular,
    Menlo,
    monospace;
  font-size: 8px;
  color: #94a3b8;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resource-type {
  display: inline-flex;
  padding: 2px 5px;
  font-size: 8px;
  font-weight: 700;
  color: #475569;
  background: #f1f5f9;
  border-radius: 5px;
}

.resource-departments {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
}

.department-chip {
  display: inline-flex;
  padding: 2px 5px;
  font-size: 8px;
  color: #475569;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 5px;
}

.department-chip--owner {
  color: #075985;
  background: #f0f9ff;
  border-color: #bae6fd;
}

.permission-cell {
  text-align: center;
}

.permission-box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 25px;
  height: 25px;
  color: #cbd5e1;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
}

.permission-box--granted {
  color: #166534;
  background: #dcfce7;
  border-color: #86efac;
}

.empty-access {
  padding: 35px 12px !important;
  color: #94a3b8 !important;
  text-align: center;
}

.muted {
  color: #94a3b8;
}

.placeholder-section,
.empty-detail {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 430px;
  flex-direction: column;
  padding: 30px;
  color: #94a3b8;
  text-align: center;
}

.placeholder-section h3,
.empty-detail h3 {
  margin: 9px 0 4px;
  font-size: 14px;
  color: #334155;
}

.placeholder-section p,
.empty-detail p {
  max-width: 430px;
  margin: 0;
  font-size: 11px;
  line-height: 1.5;
}

.placeholder-number {
  margin-top: 12px;
  padding: 7px 10px;
  font-size: 10px;
  color: #475569;
  background: #f8fafc;
  border-radius: 7px;
}

@keyframes spin {
  to {
    transform:
      rotate(360deg);
  }
}

@media (max-width: 1180px) {
  .stats-grid {
    grid-template-columns:
      repeat(
        3,
        minmax(0, 1fr)
      );
  }

  .workspace {
    grid-template-columns:
      minmax(330px, 0.9fr)
      minmax(450px, 1.3fr);
  }
}

@media (max-width: 880px) {
  .admin-shell {
    padding: 12px;
  }

  .admin-header {
    flex-direction: column;
  }

  .filters {
    grid-template-columns:
      1fr;
  }

  .workspace,
  .departments-workspace {
    grid-template-columns:
      1fr;
  }

  .department-mapping-card,
  .department-stats-grid {
    grid-template-columns:
      1fr;
  }

  .info-grid,
  .system-grid {
    grid-template-columns:
      1fr;
  }
}
</style>
