<template>
    <div class="mx-auto w-1/2 p-4 ">
        <div class="flex flex-col gap-2 bg-white w-full p-4 border border-gray-200 rounded-lg mb-4">
            <div class="">
                <input v-model="userName" type="text" placeholder="name" class="border border-gray-200 p-4 rounded-lg w-full">
            </div>
            <div class="">
                <input v-model="userLogin" type="text" placeholder="login" class="border border-gray-200 p-4 rounded-lg w-full">
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

<script lang="ts" setup>
    import { v4 as uuidv4 } from "uuid";
    import Swal from 'sweetalert2';
    import { ref } from 'vue';
    import axios, { AxiosError } from 'axios';
import { el } from "zod/v4/locales";

    definePageMeta({
        public: true // ✅ Указываем, что страница публичная
    });
    useSeoMeta({
        title: 'Авторизация',
        description: 'Страница авторизации для доступа к системе.',
    })
    const isLoadingStore = useIsLoadingStore();
    const authStore = useAuthStore();
    const { fetch: refreshSession } = useUserSession()

    const router = useRouter();
    // 1. Создаем реактивные переменные для полей ввода
    const userName = ref('');
    const userLogin = ref('');
    const userEmail = ref('');
    const passwordRef = ref('');
    const sessionId = ref('');

    // Composables
    const { login, register, isLoading, error: authError } = useAuth();
    // const error = ref<string | null>(null);
    // const isLoading = isLoadingStore.isLoading;
    // const showRegistrationPrompt = ref(false);
    // const registrationPromptMessage = ref('');

    watch([userLogin, userEmail, passwordRef], () => {
        if (userLogin.value && userEmail.value && passwordRef.value && userName.value) {
            console.log("Пользователь готов к авторизации");
            // userData = useCookie('user_data', {
            //     default: () => ({}),
            //     maxAge: 60 * 60 * 24 * 7, // Кука будет жить 1 неделю
            //     sameSite: 'lax', // Защита от CSRF
            // });

            
        } else {
            // console.log("Пожалуйста, заполните все поля");
        }
    });
    
    


    // Запрос выполнится на сервере при первой загрузке
    // const authUser = async () => {
    //     // error.value = null;
    //     // showRegistrationPrompt.value = false;
    //     // isLoadingStore.set(true);
    //     sessionId.value = uuidv4(); // Генерируем уникальный sessionId для текущей сессии
    //     console.log(isLoadingStore.isLoading)
    //     try {
    //         console.log("Отправляем данные на сервер:", {
    //             login: userLogin.value,
    //             email: userEmail.value,
    //             password: passwordRef.value,
    //             sessionId: sessionId.value
    //         });
            
    //         const response = await axios.post('/api/auth/login', {
    //             login: userLogin.value,
    //             email: userEmail.value,
    //             password: passwordRef.value,
    //             sessionId: sessionId.value
    //         });
    //         // ✅ refreshSession() обновляет клиентскую сессию
    //         // await refreshSession();
    //         // Данные ответа будут в response.data
    //         // console.log('Успешный вход:', response.data);
    //     } catch (err) {
    //         if (axios.isAxiosError(err)) {
    //             const statusCode = err.response?.status;
    //             // ✅ Получаем статус код ошибки и текст ошибки из ответа сервера
    //             // const errorMessage = err.response?.data?.message || err.message;
    //             if (statusCode === 404) {
    //                 const result = await Swal.fire({
    //                     title: 'Пользователь не найден',
    //                     text: 'Зарегистрировать нового пользователя?',
    //                     icon: 'question',
    //                     showCancelButton: true,
    //                     confirmButtonText: 'Зарегистрировать',
    //                     cancelButtonText: 'Отмена'
    //                 });

    //                 if (result.isConfirmed) {
    //                     newUser();                    
    //                 } else if (result.isDismissed) {
    //                     console.log('Отмена')
    //                 }
    //             }
                
    //         } else {
    //             // Обработка других ошибок
    //             const statusCode = 500;
    //             // console.error("Неизвестная ошибка при авторизации:", err);
    //             // alert("Произошла неизвестная ошибка при авторизации. Пожалуйста, попробуйте снова.");
    //         }

            
    //         // const statusCode = err.statusCode;
    //         // const errorMessage = err.data?.message || err.message;
    //         //  
            
    //         // console.error("Ошибка при авторизации:", err);
    //         // console.log("Код ошибки:", statusCode);
    //         // console.log("Текст ошибки:", errorMessage);
    //         // alert(err.statusCode || "Произошла ошибка при авторизации. Пожалуйста, попробуйте снова.");
    //         // console.error("Ошибка при авторизации:", err);
    //         // error.value = "Произошла ошибка при авторизации. Пожалуйста, попробуйте снова.";
                
    //     } finally {
    //         isLoadingStore.set(false)
    //     }
    // }


    

    const authUser = async () => {
        try {
            const result = await login({
                name: userName.value,
                login: userLogin.value,
                email: userEmail.value,
                password: passwordRef.value,
                sessionId: uuidv4() // Генерируем уникальный sessionId для текущей сессии
            });
            if(result.success) {
                await refreshSession();
                console.log('Успешный вход:', result);
                navigateTo('/edit'); // Перенаправляем на защищенную страницу после успешного входа
            } else {
                const result = await Swal.fire({
                    title: 'Пользователь не найден',
                    text: 'Зарегистрировать нового пользователя?',
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: 'Зарегистрировать',
                    cancelButtonText: 'Отмена'
                });

                if (result.isConfirmed) {
                    newUser();                    
                } else if (result.isDismissed) {
                    console.log('Отмена')
                }

            }
            // ✅ refreshSession() обновляет клиентскую сессию после успешного входа
            
            
        } catch (err) {
            // Здесь можно обработать ошибку, например, показать уведомление пользователю
        }
    }

    const newUser = async () => {
        try {
            const result = await register({
                name: userName.value,
                login: userLogin.value,
                email: userEmail.value,
                password: passwordRef.value,
                sessionId: uuidv4() // Генерируем уникальный sessionId для текущей сессии
            });
            console.log('Успешная регистрация:', result);
            navigateTo('/edit'); // Перенаправляем на защищенную страницу после успешной регистрации
            // console.log('Зарегистрировать')
        } catch (error) {
            console.error("Ошибка при регистрации:", error);
        }
        // console.log('Зарегистрировать')
        
    }
</script>