<template>
    <UModal
    :ui="{
      content: ' w-full bg-gray-100'
    }"
  >
        <template #header>
            <div class="flex items-center justify-between  w-full">
                <div class="flex items-center gap-3">
                    <Icon name="vscode-icons:file-type-excel2" size="24"/>
                    <div>
                        <span class="font-semibold text-sm"> ЭКСПОРТ</span>
                        <p class="text-xs">Настройки экпорта данных</p>
                    </div>
                </div>
                <UButton
                    variant="ghost"
                    color="neutral"
                    icon="i-heroicons-x-mark-20-solid"
                    class="rounded-full hover:bg-gray-100 transition-colors"
                    @click="emit('close')"
                />
            </div>
        </template>
        <template #body>
            <div class="space-y-4 relative">
                <div class="space-y-4 space-x-0 px-2 pb-3 bg-white parent">
                    <fieldset class="border-2 border-gray-200 mx-4  px-2 py-1 rounded-md bg-white/80">
                        <legend class="text-xl font-normal px-2 flex items-center gap-2 bg-transparent">
                            <span class="flex items-center gap-3">
                                <Icon name="streamline-freehand-color:task-list-clipboard-check" size="20" />
                                Список документов:
                            </span>
                            <span class="text-xs text-gray-400 font-light">(выберите необходимое)</span>
                        </legend>
                        <div class="py-5 px-10">
                            <UCheckboxGroup v-model="docListValue" :items="items" />
                        </div>
                        <div class="flex items-center justify-start gap-2 w-full ">
                            <Icon name="gravity-ui:exclamation-shape" size="24"/>
                            <span class="text-xs/4 whitespace-normal wrap-break-word">Все табличные данные будут выгружаться в формат .xslx. Все прикреплённые файлы будут выгружаться отдельными файлами</span>
                        </div>
                    </fieldset>
                </div>
            </div>
        </template>
        <template #footer>
            <div class="flex w-full gap-4 justify-end pt-2">
        <UButton
          type="button"
          variant="outline"
          color="neutral"
          label="Отмена"
          @click="emit('close')"
        />
        <UButton
          type="button"
          color="neutral"
          variant="outline"
          @click="handleSave"
          :loading="saving"
        ><Icon name="vscode-icons:file-type-excel2" size="24" /><span>Экспортировать</span></UButton>
      </div>
        </template>
        
    </UModal>
</template>
<script setup lang="ts">
    import type { CheckboxGroupItem } from '@nuxt/ui'
    // ======= СОБЫТИЯ =======
    const emit = defineEmits<{
        (e: 'close'): void
        (e: 'save'): void
    }>();
    const saving = ref(false)

    const items = ref<CheckboxGroupItem[]>([
        {
            label: 'Реестр',
            description: 'Будут выгружены отфильтрованные записи реестра.',
            value: 'reestr'
        },
        {
            label: 'Акты отборов проб',
            description: 'Выгрусзка актов отборов проб.',
            value: 'samplingReport'
        },
        {
            label: 'Паспорта на материалы',
            description: 'Выгрузка протоколов на материалы.',
            value: 'materialPassp'
        },
        {
            label: 'Протоколы испытаний',
            description: 'Выгрузка протоколов испытаний.',
            value: 'testProtocol'
        }
    ])
    const docListValue = ref([
        'reestr'
    ]);
    const toast = useToast();

    async function handleSave() {
        saving.value = true;
        toast.add({
            title: 'Список сформирован',
            description: `Список документов для экспорта успешно сформирован.`,
            color: 'info',
            icon: 'streamline-freehand-color:lists-bullets',
            duration:3000
        });
        emit('save')
        emit('close')
    }

</script>


<style lang="stylus" scoped>

</style>