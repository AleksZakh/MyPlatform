<template #research>
    <!-- <UFormGroup label="Email рассылка" name="emailNotifications" class="mb-4">
        <UToggle v-model="formData.emailNotifications" />
        </UFormGroup>
        <UFormGroup label="Push уведомления" name="pushNotifications" class="mb-4">
        <UToggle v-model="formData.pushNotifications" />
    </UFormGroup> -->
</template>

<script setup lang="ts">
    const formData = reactive({
        emailNotifications: false,
        pushNotifications: true
    })
</script>