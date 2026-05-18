<template>
    <div class="mx-auto w-1/2 p-4 ">
        <div class="bg-white w-full p-4 border border-gray-200 rounded-lg mb-4">
            <div class="">
                <input v-model="newName" type="text" placeholder="name" class="border border-gray-200 p-4 mb-2 rounded-lg w-full">
            </div>
            <div class="mb-4">
                <textarea v-model="newEmail" placeholder="email" class="border border-gray-200 rounded-lg w-full p-4"></textarea>
            </div>
            <div class="">
                <a @click="updateUser" href="#" class="inline-block text-xs text-white px-3 py-2 bg-emerald-600 border border-emerald-700 rounded-sm">Сохранить</a>
            </div>
        </div>

    </div>

</template>

<script setup lang="ts">
    const userStore = useUserStore();
    const name = computed(() => userStore.name);
    const email = computed(() => userStore.email);
    const newName = ref(name.value);
    const newEmail = ref(email.value);
    const updateUser = () => {
        userStore.updateName(newName.value);
        userStore.updateEmail(newEmail.value);
        alert('Пользователь обновлен!');
        navigateTo('/');
    }
</script>