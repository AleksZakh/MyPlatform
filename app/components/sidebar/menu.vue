<!-- /app/components/sidebar/menu.vue -->
<template>
  <aside class="sidebar p-2 relative">

    <!-- Кнопка сворачивания меню -->
    <button
      type="button"
      class="absolute toggle-icon right-1 top-0"
      @click="$emit('toggle')"
    >
      <span
        class="toggle-icon"
        :class="{ rotated: isCollapsed }"
      >
        <Icon
          name="streamline-freehand-color:navigation-page-right"
          size="13"
        />
      </span>
    </button>


    <!-- Меню отображаем только авторизованному пользователю -->
    <nav v-if="loggedIn">

      <NuxtLink
        v-for="item in visibleMenuItems"
        :key="item.url"
        :to="item.url"
        class="
          flex
          items-center
          menu-item
          py-1
          px-3
          text-lg
          text-balance
          rounded-lg
          w-full
          transition-all
          cursor-pointer
        "
      >
        <UTooltip :text="item.tooltip">

          <span class="icon flex items-center">
            <Icon
              :name="item.icon"
              class="mr-3"
              size="22"
            />
          </span>


          <span
            v-if="!isCollapsed"
            class="text flex items-center"
          >
            {{ item.title }}
          </span>

        </UTooltip>

      </NuxtLink>

    </nav>

  </aside>
</template>


<script setup lang="ts">

import {
  computed,
  ref,
  watch,
} from 'vue'

import {
  menuItems,
} from './menu.data'

import type {
  MenuItem,
} from './menu.data'


/**
 * ============================================================
 * Авторизация
 * ============================================================
 */
const {
  loggedIn,
} = useUserSession()


/**
 * ============================================================
 * Права навигации
 * ============================================================
 *
 * Пока в боковом меню защищён только AdminCenter.
 *
 * Сервер остаётся единственным источником истины:
 * наличие пункта в меню само по себе доступ не даёт.
 */
const canViewAdminCenter =
  ref(false)

const isLoadingMenuPermissions =
  ref(false)


async function loadMenuPermissions() {
  if (
    !loggedIn.value
  ) {
    canViewAdminCenter.value =
      false

    return
  }


  isLoadingMenuPermissions.value =
    true

  try {
    await $fetch(
      '/api/admin/guard',
    )

    canViewAdminCenter.value =
      true

  } catch (error: any) {
    const statusCode =
      Number(
        error?.statusCode ??
        error?.status ??
        error?.response
          ?.status ??
        0,
      )

    if (
      statusCode === 401 ||
      statusCode === 403
    ) {
      canViewAdminCenter.value =
        false

      return
    }


    /**
     * При технической ошибке не показываем
     * административный пункт "на всякий случай".
     *
     * Это fail-closed поведение.
     */
    canViewAdminCenter.value =
      false

    console.error(
      '[sidebar menu] Не удалось проверить доступ к AdminCenter:',
      error,
    )

  } finally {
    isLoadingMenuPermissions.value =
      false
  }
}


function canShowMenuItem(
  item:
    MenuItem,
): boolean {
  if (
    !item.permission
  ) {
    return true
  }


  if (
    item.permission.resource ===
      'admin.center' &&
    item.permission.action ===
      'VIEW'
  ) {
    return (
      canViewAdminCenter.value
    )
  }


  /**
   * Для неизвестного защищённого пункта
   * используем fail-closed:
   * пока нет серверной проверки — не показываем.
   */
  return false
}


const visibleMenuItems =
  computed(
    () =>
      menuItems.filter(
        canShowMenuItem,
      ),
  )


watch(
  loggedIn,
  async value => {
    if (!value) {
      canViewAdminCenter.value =
        false

      return
    }

    await loadMenuPermissions()
  },
  {
    immediate:
      true,
  },
)


/**
 * ============================================================
 * Props
 * ============================================================
 */
defineProps<{
  isCollapsed:
    boolean
}>()


/**
 * ============================================================
 * Events
 * ============================================================
 */
defineEmits<{
  toggle: []
}>()

</script>


<style scoped>

.sidebar {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  white-space: nowrap;
}


.menu-item {
  display: flex;
  align-items: center;
  padding: 10px;
}


.icon {
  font-size: 20px;
  min-width: 40px;
  text-align: center;
}


.toggle-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}


.toggle-icon {
  display: inline-block;
  transition: transform 0.8s ease;
}


.toggle-icon.rotated {
  transform: rotate(180deg);
}

</style>