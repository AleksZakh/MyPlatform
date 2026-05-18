
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
    import { useToastStore } from "../stores/toast.store";
    // import  showToast  from "../../utils/showToast";
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
    const { fetch: refreshSession } = useUserSession();
    const toastStore = useToastStore();
    const toastId = Math.random().toString();

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

    const showToast = (content: string, typeMsg: string) => {
        const toastStore = useToastStore();
        const toastId = Math.random().toString();
        toastStore.addToast({
            id: toastId,
            title: "Уведомление!",
            description: content,
            type: typeMsg,
        });
    };

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
    
    


    const authUser = async () => {
        const sessionId = uuidv4(); // Генерируем уникальный sessionId для текущей сессии
        try {
            const result = await login({
                name: userName.value,
                login: userLogin.value,
                email: userEmail.value,
                password: passwordRef.value,
                sessionId: sessionId
            });
            if(result.success) {
                await refreshSession();
                authStore.set({
                    email: userEmail.value,
                    name: userName.value,
                    sessionId: sessionId,
                    status: true // Устанавливаем статус в true, чтобы isAuth стал истиной
                });
                // Добавьте небольшую задержку для обновления состояния
                setTimeout(async () => {
                    await nextTick();
                    await router.push('/'); // Используйте router.push вместо navigateTo
                    console.log('Успешный вход:', result);
                    showToast(`Пользователь ${userName.value} - авторизован`, "success");
                }, 300);
                // await refreshSession();
                // console.log('Успешный вход:', result);
                // navigateTo('/edit'); // Перенаправляем на защищенную страницу после успешного входа
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
            console.error("Ошибка при входе:", err);
            // Здесь можно обработать ошибку, например, показать уведомление пользователю
        }
    }

    const newUser = async () => {
        const sessionId = uuidv4(); // Генерируем уникальный sessionId для текущей сессии
        try {
            const result = await register({
                name: userName.value,
                login: userLogin.value,
                email: userEmail.value,
                password: passwordRef.value,
                sessionId: uuidv4() // Генерируем уникальный sessionId для текущей сессии
            });
            if(result.success) {
                console.log('Успешная регистрация:', result);
                await refreshSession();
                authStore.set({
                    email: userEmail.value,
                    name: userName.value,
                    sessionId: sessionId,
                    status: true // Устанавливаем статус в true, чтобы isAuth стал истиной
                });
                await nextTick();
                await router.push('/');
                showToast(`Пользователь ${userName.value} - зарегистрирован`, "success");
            }
            // console.log('Успешная регистрация:', result);
            // navigateTo('/edit'); // Перенаправляем на защищенную страницу после успешной регистрации
            // console.log('Зарегистрировать')
        } catch (error) {
            console.error("Ошибка при регистрации:", error);
        }
        // console.log('Зарегистрировать')
        
    }
</script>

