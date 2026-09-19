<template>
  <div class="min-h-full bg-slate-50">
    <div class="mx-auto w-full max-w-[1500px] px-6 py-8 lg:px-8">

      <!-- Header -->
      <div class="mb-8">
        <div class="mb-3 flex items-center gap-2 text-sm text-slate-500">
          <span>Space</span>

          <Icon
            name="lucide:chevron-right"
            class="h-4 w-4"
          />

          <span class="font-medium text-sky-700">
            Инструменты
          </span>
        </div>

        <h1 class="text-3xl font-semibold tracking-tight text-slate-950">
          Инструменты
        </h1>

        <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Инструменты управление пользователями, правами доступа,
          заявками и системным журналом событий.
        </p>
      </div>


      <!-- Cards -->
      <div
        class="
          grid gap-5
          md:grid-cols-2
          xl:grid-cols-4
        "
      >

        <!-- Audit log -->
        <NuxtLink
          to="/admin/audit-log"
          class="
            group rounded-2xl border border-slate-200
            bg-white p-6 shadow-sm transition
            hover:-translate-y-0.5
            hover:border-sky-300
            hover:shadow-md
          "
        >
          <div
            class="
              mb-5 flex h-12 w-12
              items-center justify-center
              rounded-xl bg-sky-50
              text-sky-700 transition
              group-hover:bg-sky-100
            "
          >
            <Icon
              name="lucide:history"
              class="h-6 w-6"
            />
          </div>

          <h2 class="font-semibold text-slate-900">
            Журнал событий
          </h2>

          <p class="mt-2 text-sm leading-5 text-slate-500">
            Просмотр действий пользователей,
            отказов доступа и изменений данных.
          </p>

          <div
            class="
              mt-5 flex items-center gap-2
              text-sm font-medium text-sky-700
            "
          >
            Открыть журнал

            <Icon
              name="lucide:arrow-right"
              class="
                h-4 w-4 transition-transform
                group-hover:translate-x-1
              "
            />
          </div>
        </NuxtLink>


        <!-- Users -->
        <div
          class="
            rounded-2xl border border-slate-200
            bg-white p-6 opacity-60
          "
        >
          <div
            class="
              mb-5 flex h-12 w-12
              items-center justify-center
              rounded-xl bg-slate-100
              text-slate-500
            "
          >
            <Icon
              name="lucide:users"
              class="h-6 w-6"
            />
          </div>

          <h2 class="font-semibold text-slate-900">
            Пользователи
          </h2>

          <p class="mt-2 text-sm leading-5 text-slate-500">
            Управление учётными записями
            и состояниями пользователей.
          </p>

          <div class="mt-5 text-xs font-medium uppercase tracking-wide text-slate-400">
            В разработке
          </div>
        </div>


        <!-- Access -->
        <div
          class="
            rounded-2xl border border-slate-200
            bg-white p-6 opacity-60
          "
        >
          <div
            class="
              mb-5 flex h-12 w-12
              items-center justify-center
              rounded-xl bg-slate-100
              text-slate-500
            "
          >
            <Icon
              name="lucide:shield-check"
              class="h-6 w-6"
            />
          </div>

          <h2 class="font-semibold text-slate-900">
            Права доступа
          </h2>

          <p class="mt-2 text-sm leading-5 text-slate-500">
            Настройка разрешений
            на ресурсы системы.
          </p>

          <div class="mt-5 text-xs font-medium uppercase tracking-wide text-slate-400">
            В разработке
          </div>
        </div>


        <!-- Registration requests -->
         <NuxtLink
          to="/admin/registration-requests"
          class="
            group rounded-2xl border border-slate-200
            bg-white p-6 shadow-sm transition
            hover:-translate-y-0.5
            hover:border-sky-300
            hover:shadow-md
          "
        >
          <div
            class="
              mb-5 flex h-12 w-12
              items-center justify-center
              rounded-xl bg-sky-50
              text-sky-700 transition
              group-hover:bg-sky-100
            "
          >
            <Icon
              name="lucide:clipboard-list"
              class="h-6 w-6"
            />
          </div>

          <h2 class="font-semibold text-slate-900">
            Заявки
          </h2>

          <p class="mt-2 text-sm leading-5 text-slate-500">
            Рассмотрение заявок
            на внешний доступ к Space.
          </p>

          <div
            class="
              mt-5 flex items-center gap-2
              text-sm font-medium text-sky-700
            "
          >
            Список заявок

            <Icon
              name="lucide:arrow-right"
              class="
                h-4 w-4 transition-transform
                group-hover:translate-x-1
              "
            />
          </div>
        </NuxtLink>
         

      </div>
    </div>
  </div>
</template>


<script setup lang="ts">
useSeoMeta({
  title: 'Центр админимтрирования',
  description: 'Центр администрирования Space',
});
</script>