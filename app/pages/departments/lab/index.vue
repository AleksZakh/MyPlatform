<template>
  <div class=" h-full absolute left-0 right-0 lab-area">
    <UCard class="h-full tabs-wrapper absolute  left-0 right-0 bottom-0 top-0" :ui="{ root: 'rounded-none' }">
      <UTabs
        v-model="activeTab"
        :items="tabs"
        size="lg"
        color="custom"
        class=" tabs-area  absolute bottom-2 top-1 left-1 right-1"
        :ui="{
          trigger: 'border border-gray-200 rounded-md',
          label: 'text-balance font-normal text-lg',
          list: 'p-1 gap-4 ',
          content: ' relative h-full'
        }"
      >
        <template #incomingInspection>
          <LabIncominginspection />
        </template>
        <template #eventsLog>
          <LabResearch  />
          <!-- <LabResearch v-if="acceptUserList.includes(LoginUser?.username)" /> -->
        </template>
        <template #handbook>
          <LabHandbook />
        </template>
        <template #file_system>
          <LabFileSystem />
        </template>
      </UTabs>
    </UCard>
  </div>
</template>

<script setup lang="ts">

// const { user, clear } = useUserSession();
const userStore = useUserStore();
const { user: adUser } = storeToRefs(userStore);
const acceptUserList=['Zakharov_AV', 'Golubin_KD'];
// console.log('user from cookie ===> ', user)
const LoginUser = ref(); 
watch(
  adUser,
  (newUser) => {
    if (newUser) {
      // console.log('Сессия успешно считана и обновилась:', newUser);
      LoginUser.value = newUser;
      // @ts-ignore
      // userDep.value = newUser.department || '';
      // @ts-ignore
      // authType.value = newUser.authType || null;
    }
  },
  { immediate: true }
);

useHead({
  title: 'Лабораторный контроль',
});

// Определение структуры вкладок
// const tabs = [
//   {
//     label: 'Реестр входного контроля',
//     icon: 'streamline-freehand-color:disability-blind-read',
//     slot: 'incomingInspection', // этот слот будет отображаться для вкладки
//     value: 'incomingInspection', // значение для v-model
//   },
//   {
//     label: 'Журнал событий',
//     icon: 'tabler:logs',
//     slot: 'eventsLog',
//     value: 'eventsLog',
//   },
//   {
//     label: 'Справочник лаборатории',
//     icon: 'streamline-freehand-color:book-bookmark',
//     slot: 'handbook', // этот слот будет отображаться для вкладки
//     value: 'handbook', // значение для v-model
//   },
// ];

const tabs = computed(() => {
  const baseTabs = [
    {
      label: 'Реестр входного контроля',
      icon: 'streamline-freehand-color:disability-blind-read',
      slot: 'incomingInspection',
      value: 'incomingInspection',
    },
    {
      label: 'Справочник лаборатории',
      icon: 'streamline-freehand-color:book-bookmark',
      slot: 'handbook',
      value: 'handbook',
    },
    {
      label: 'Журнал событий',
      icon: 'tabler:logs',
      slot: 'eventsLog',
      value: 'eventsLog',
    }
  ];

  // Вставляем "Журнал событий" только для избранных
  // if (acceptUserList.includes(LoginUser?.value?.username)) {
  //   baseTabs.splice(1, 0, {
  //     label: 'Журнал событий',
  //     icon: 'tabler:logs',
  //     slot: 'eventsLog',
  //     value: 'eventsLog',
  //   });
  // }

  return baseTabs;
});

// Активная вкладка (по умолчанию первая)
const activeTab = ref('incomingInspection');
definePageMeta({
  breadcrumb: 'Блог'
})
</script>

<style scoped>
/* Перебиваем внутренний слот body конкретной карточки */
:deep(.p-4.sm\:p-6) {
  padding: 5px 10px !important;
}
</style>
