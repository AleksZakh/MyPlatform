<template>
  <UPopover :dismissible="false" :ui="{ content: 'py-2 pl-1 pr-2' }">
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
                  <UInput v-model="filterTmpName" class="w-full mb-3" size="sm"/>
                </UFormField>
                
                <div class="flex justify-center">
                    <UButton variant="outline" size="sm" color="info" type="submit" @click="saveFilterTemplite(close)">Сохранить</UButton>
                </div>            
            </fieldset>
            <!-- <Placeholder class="size-5 m-4 inline-flex" /> -->
        </UForm>


    </template>
  </UPopover>
</template>
<script setup lang="ts">
const { showTost } = useAppToasts();
const filterTmpName = ref();

async function saveFilterTemplite(closePopover: () => void) {
    // console.log('Начало сохранения...');

    if(filterTmpName.value){
        try {
            // Здесь будет ваш код отправки данных на сервер, например:
            // await $fetch('/api/filters/save', { method: 'POST', body: ... })
            
            // console.log('Шаблон успешно сохранен!');
            showTost( 'Успех!', `Шаблон ${filterTmpName.value} успешно сохранен!`, 'success', 'streamline-freehand-color:form-validation-check-double', 3000);
            
            // Вызываем функцию закрытия поповера
            closePopover(); 
            
        } catch (error) {
            console.error('Ошибка при сохранении шаблона:', error);
            showTost( 'Ошибка!', `Не удалось сохранить акт. ${(error as any)?.message || 'Неизвестная ошибка'}`, 'error', 'fxemoji:warningsign', 5000 );
        }
    }
    
}

</script>


<style lang="stylus" scoped>

</style>