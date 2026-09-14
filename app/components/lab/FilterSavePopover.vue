<template>
  <UPopover :dismissible="false" @update:open="onPopoverToggle" :ui="{ content: 'py-2 pl-1 pr-2 shadow-lg bg-blue-50' }" :content="{ side: 'top' } ">
    <UButton icon="streamline-freehand-color:floppy-disk" color="neutral" variant="subtle" class="px-4" title="Сохранение шаблон фильтра"/>

    <template #content="{ close }">
        
        <div class="flex items-center justify-start gap-4  relative">
            <span class="text-md font-medium "></span>
            <UButton color="neutral" variant="link" size="sm" icon="i-lucide-x" @click="close" class="absolute -right-3 -top-2 text-red-600"/>
        </div>
        <UForm>
            <fieldset class="border-2 border-gray-200 mx-2 p-3 rounded-md ">
                <legend class="text-md font-medium px-2 flex items-center gap-2 bg-transparent">Сохранить в качестве шаблона?</legend>
                <UFormField name="plp" >
                  <template #label>
                    <label class="font-normal flex items-center gap-2 min-w-32 text-gray-700 text-sm" >
                    <Icon name="streamline-freehand-color:content-paper-edit" size="18" /> Укажите имя шаблона:</label>
                  </template>
                  <UInput v-model="filterTmpName" class="w-full mb-1"  size="sm" :ui="{ base: isMatch ? 'text-red-500' : 'text-gray-900'}"/>
                  <UCheckbox size="sm"color="info" v-model="useAsDefault" label="Использовать по умолчанию" />
                </UFormField>
                
                <div class="flex justify-center mt-2">
                    <UButton variant="outline" size="sm" color="info" type="submit" @click="saveFilterTemplite(close)">Сохранить</UButton>
                </div>            
            </fieldset>
            <!-- <Placeholder class="size-5 m-4 inline-flex" /> -->
        </UForm>


    </template>
  </UPopover>
</template>
<script setup lang="ts">
import type { ITableFilter } from '@@/types/tableFilter'; 

const { showTost } = useAppToasts();
const filterTmpName = ref();
const useAsDefault = ref(false);
const isMatch = ref(false); // Флаг для отслеживания совпадения имени шаблона

interface Props {
  filters: ITableFilter;
  authorEmail?: string;
  templateId?: number;
  templateName?: string;
  isDefault?: boolean;
}
const props = withDefaults(defineProps<Props>(), {
    authorEmail: '',
    templateId: 0,
    templateName: '',
    isDefault: false,
});


async function saveFilterTemplite(closePopover: () => void) {
    // console.log('Начало сохранения...');
    // console.log('props.filters in FilterSavePopover.vue:', props.filters);
    let answer;
    let action;

    if(filterTmpName.value){
        try {
            if(isMatch.value) {
                // Если имя шаблона совпадает с существующим, перезаписываем старый шаблон
                answer = await $fetch(`/api/lab/filter-template/${props.templateId}`, {
                    method: 'put',
                    body: {
                        name: props.templateName, // Передайте имя, если хотите его обновить/сохранить
                        filters: props.filters,   // Теперь бэкенд увидит body.filters!
                        isDefault: props.isDefault, // Если применимо
                        currentUserEmail: props.authorEmail,
                    },
                });
                action = 'обновлен';
            } else {
                // Если имя шаблона уникальное, создаем новый шаблон
                answer = await $fetch('/api/lab/filter-template', {
                    method: 'post',
                    body: {
                        filters: props.filters,
                        name: filterTmpName.value,
                        authorEmail: props.authorEmail,
                        isDefault: useAsDefault.value,
                    },
                });
                action = 'сохранен';
            }
            
            // console.log('Шаблон успешно сохранен!', answer);
            showTost( 'Успех!', `Шаблон ${filterTmpName.value} успешно ${action}!`, 'success', 'streamline-freehand-color:form-validation-check-double', 3000);
            
            // Вызываем функцию закрытия поповера
            closePopover(); 
            
        } catch (error) {
            console.error('Ошибка при сохранении шаблона:', error);
            showTost( 'Ошибка!', `Не удалось сохранить акт. ${(error as any)?.message || 'Неизвестная ошибка'}`, 'error', 'fxemoji:warningsign', 5000 );
        }
    }
    
}

async function onPopoverToggle(value: boolean) {
    // console.log('Поповер открыт:', props.templateId, props.templateName, props.authorEmail, props.isDefault);
  if (value) {
    filterTmpName.value = props.templateName ?? ''; // Подставляем имя шаблона при открытии поповера
    try {
       const response = await $fetch('/api/lab/filter-template', {
            method: 'GET',
            params: { onlyMine: true }, // Получаем только свои шаблоны
        });        
        if(response && response.success) {
            for (const template of response.data) {
                if (template.name === filterTmpName.value && template.authorEmail === props.authorEmail) {
                    if(template.isDefault) {
                        useAsDefault.value = true; // Если шаблон по умолчанию, устанавливаем флаг
                    } else {
                        useAsDefault.value = false; // Иначе сбрасываем флаг
                    }
                    
                    isMatch.value = true;
                    // break;
                }
            }
            // console.log('Шаблон успешно получен:', response.data);
        } else {
            // console.error('Ошибка при получении шаблона:', response?.message || 'Неизвестная ошибка');
        }
    } catch (error) {
      console.error('Ошибка при отправке запроса:', error);
      
    }
    // Здесь можно загрузить данные, обновить что-то и т.д.
  } else {
  }
}

</script>


<style lang="stylus" scoped>

</style>