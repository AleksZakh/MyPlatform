<template>
    <div class="mx-auto w-1/2 p-4 ">
        <div class="flex flex-col gap-2 bg-white w-full p-4 border border-gray-200 rounded-lg mb-4">
            <div class="">
                <input v-model="userName" type="text" placeholder="name" class="border border-gray-200 p-4 rounded-lg w-full">
            </div>
            <div class="">
                <input v-model="userEmail" placeholder="email" class="border border-gray-200 rounded-lg w-full p-4">
            </div>
            <div class="mb-4">
                <input v-model="passwordRef" type="password" placeholder="password" class="border border-gray-200 p-4 rounded-lg w-full">
            </div>
            <div class="flex justify-between">
                <a @click="authUser" href="#" class="inline-block text-xs text-white px-3 py-2 bg-emerald-600 border border-emerald-700 rounded-sm">Войти</a>
                <a @click="newUser" href="#" class="inline-block text-xs text-white px-3 py-2 bg-amber-500 border border-emerald-700 rounded-sm">Зарегистрироваться</a>
            </div>
        </div>

    </div>

</template>

<script setup lang="ts">
    import { v4 as uuidv4 } from "uuid";
    useSeoMeta({
        title: 'Авторизация',
        description: 'Страница авторизации для доступа к системе.',
    })

    const isLoadingStore = useIsLoadingStore();
    const store = useAuthStore();
    const router = useRouter();
    // 1. Создаем реактивные переменные для полей ввода
    const userName = ref('');
    const userEmail = ref('');
    const passwordRef = ref('');

    // Запрос выполнится на сервере при первой загрузке
    

    const login = async () => {
        

        // await account.createEmailSession(userName.value, userEmail.value);
        // const response = await account.get();

    }
    
    
    // 2. Инициализируем куку (называем её, например, 'user_data')
    // Nuxt автоматически преобразует объект в JSON-строку для хранения в куках
    

    const authUser = async() => {
        const sessionId = uuidv4();
        isLoadingStore.set(true);
        const inputUserData = {
            userName: userName.value,
            pass: passwordRef.value,
            sessionId: sessionId,
            userEmail: userEmail.value,
        };
        try {
            const response = await $fetch('/api/auth/login', {
                method: 'POST',
                body: inputUserData,
            });
            console.log('Ответ от сервера:', response);
            // if (response.success) {
            //     // Сохраняем данные в Pinia
            //     store.set({
            //         name: userName.value,
            //         email: userEmail.value,
            //         sessionId: sessionId,
            //     });
            //     isLoadingStore.set(false);
            //     // Редиректим на главную страницу
            //     navigateTo('/');
            // } else {
            //     console.error('Ошибка авторизации:', response.message);
            //     isLoadingStore.set(false);
            // }
        } catch (error) {
            if (error){
                alert('Ошибка авторизации: ' + error);
            }
            console.error('Ошибка при запросе к серверу:', error);
            isLoadingStore.set(false);
        }
    //     console.log("Авторизация пользователя:", userName.value, userEmail.value);
    //     // 3. Записываем данные в куку
    //     userData.value = {
    //         name: userName.value,
    //         email: userEmail.value
    //     }

    //     // После сохранения данных перенаправляем пользователя на главную
    //     navigateTo('/')
    }


    // const authUser = () => {};
    const newUser = () => {};
</script>