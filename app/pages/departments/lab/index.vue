<template >
    <div class="max-w-screen h-full mx-auto lab-area">
        <UCard class="h-full tabs-wrapper" :ui="{ root: 'rounded-none' }">
            <UTabs 
                v-model="activeTab"
                :items="tabs"
                class="w-full tabs-area"
                :ui="{trigger: 'border border-gray-300 rounded-md', list: 'p-1 gap-4',}"
            >
                <template #incomingInspection>
                    <LabIncominginspection/>
                </template>
                <template #research>
                    <LabResearch />
                </template>
                <template #handbook>
                    <LabHandbook />
                </template>
            </UTabs>
        </UCard>
    </div>
</template>

<script setup lang="ts">
    useHead({
        title: 'Лабораторный контроль'
    })
    
    // Определение структуры вкладок
    const tabs = [
        {
            label: 'Реестр входного контроля',
            icon: 'streamline-freehand-color:disability-blind-read',
            slot: 'incomingInspection',   // этот слот будет отображаться для вкладки
            value: 'incomingInspection'   // значение для v-model
        },
        {
            label: 'Исследования',
            icon: 'marketeq:research',
            slot: 'research',
            value: 'research'
        },
        {
            label: 'Справочник лаборатории',
            icon: 'streamline-freehand-color:book-bookmark',
            slot: 'handbook',   // этот слот будет отображаться для вкладки
            value: 'handbook'   // значение для v-model
        },
        
    ]

    // Активная вкладка (по умолчанию первая)
    const activeTab = ref('incomingInspection')
</script>

<style scoped>
    /* Перебиваем внутренний слот body конкретной карточки */
    :deep(.p-4.sm\:p-6) {
        padding: 5px 10px!important;
    }
</style>