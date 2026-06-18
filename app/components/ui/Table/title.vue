<template>
    <!-- Фиксированная шапка -->
    <div class="shrink-0 py-1 border-b-2 border-gray-200 flex justify-between items-center">
        <h2 class="text-2xl font-bold mb-2 ">Реестр входного контроля</h2>
        <div class="flex gap-2 h-full items-center">
            <!-- <UButton variant="outline" color="primary" size="md">
                <Icon name="solar:document-download-broken" width="20" />
                Скачать реестр
            </UButton> -->
            <UButton variant="outline" color="info" size="lg" class="h-full hover:shadow-md active:shadow-sm">
                <Icon name="solar:clipboard-list-broken" width="20" />
                Добавить запись
            </UButton> 
        </div>
    </div>
</template>
<script setup lang="ts">

</script>


<style lang="css" scoped>

</style>