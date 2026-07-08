
<template>
    <div v-if="!adUserLogin" class="mx-auto w-1/2 p-4 ">
        <div class="flex flex-col gap-2 bg-white w-full p-4 border border-gray-200 rounded-lg mb-4">
            <!-- <div class="">
                <input v-model="userName" type="text" placeholder="name" class="border border-gray-200 p-4 rounded-lg w-full">
            </div> -->
            <div class="">
                <input v-model="userLogin" type="text" placeholder="login" class="border border-gray-200 p-4 rounded-lg w-full">
            </div>
            <!-- <div class="">
                <input v-model="userEmail" placeholder="email" class="border border-gray-200 rounded-lg w-full p-4">
            </div> -->
            <div class="mb-4">
                <input v-model="passwordRef" type="password" placeholder="password" class="border border-gray-200 p-4 rounded-lg w-full">
            </div>
            <div class="flex justify-between">
                <a @click="authUser" href="#" class="inline-block text-sm text-white px-3 py-2 bg-emerald-400 border border-emerald-700 rounded-sm hover:shadow-lg active:shadow-sm">Войти</a>
                <a  href="#" class=" isDisabled inline-block text-sm text-gray-200 px-3 py-2 bg-sky-500 border border-emerald-700 rounded-sm">Зарегистрироваться</a>
            </div>
        </div>

    </div>

</template>

<script lang="ts" setup>
    import { v4 as uuidv4 } from "uuid";
    import Swal from 'sweetalert2';
    import { ref } from 'vue';
    import { useToastStore } from "../stores/toast.store";
    import bcrypt from "bcryptjs";
    // import  showToast  from "../../utils/showToast";
    import axios, { AxiosError } from 'axios';
    import { el } from "zod/v4/locales";

    const { encryptPassword } = securePW();
    const userName = ref('');
    const userLogin = ref('');
    const userEmail = ref('');
    const adUserLogin = ref('');
    


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
    
//    const { data: user, error } = await useFetch<{ name?: string }>('/api/auth/me')
    // console.log(user.value?.username, error)
    
    const toastStore = useToastStore();
    const toastId = Math.random().toString();

    const router = useRouter();
    // 1. Создаем реактивные переменные для полей ввода
    
    const passwordRef = ref('');
    const sessionId = ref('');
    const adUsers = ref([]);
    const { findUser,isUserExists } = useADUsers();

    // Composables
    const { login, register, isLoading, error: authError } = useAuth(); // ✅ Импортируем функцию login и register из композабла
    const { data: user, error } = await useFetch('/api/auth/me')
    adUserLogin.value = user.value?.username

    let encrypted = false // Флаг, что пароль зашифрован. По умолчанию выключен.

    // const error = ref<string | null>(null);
    // const isLoading = isLoadingStore.isLoading;
    // const showRegistrationPrompt = ref(false);
    // const registrationPromptMessage = ref('');

    // =================== Функция для отображения уведомлений
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

    //================ 2. Следим за изменениями в полях ввода и проверяем, готовы ли мы к авторизации
    watch([userLogin, userEmail, passwordRef], () => {
        if (userLogin.value && passwordRef.value) {
            // console.log("Пользователь готов к авторизации");
            // userData = useCookie('user_data', {
            //     default: () => ({}),
            //     maxAge: 60 * 60 * 24 * 7, // Кука будет жить 1 неделю
            //     sameSite: 'lax', // Защита от CSRF
            // });            
        } else {
            // console.log("Пожалуйста, заполните все поля");
        }
    });    
    

    // =================== 3. Функция для авторизации пользователя
    const authUser = async (adUserLogin: any = '') => {
        const sessionId = uuidv4(); // Генерируем уникальный sessionId для текущей сессии
        console.log('adUserLogin == ', adUserLogin.type, "; ", 'userLogin.value == ', userLogin.value)
        

        const loginValue = adUserLogin.type !='click' ? adUserLogin.value :  loginNormal(userLogin.value); // Получаем часть до '@' для поиска в AD
        // console.log('Авторизация пользователя = ', loginValue)
        
        const exists = isUserExists(adUsers.value, loginValue); // Проверяем, существует ли пользователь в списке сользователей, полученном из AD

        const user = findUser(adUsers.value, loginValue);// Ищем информацию о пользователе в списке пользователей, полученном из AD

        // console.log(`Пользователь ${user.user?.sAMAccountName || loginValue} ${exists ? 'найден' : 'не найден'}`, user.user?.cn);
        if(exists && Object.keys(user).length) {

            let passwordValue = ''
            if(passwordRef.value == ''){
                passwordValue = 'adPassword';
            }  else {
                passwordValue = encryptPassword(passwordRef.value);
                encrypted = true
            }

            let result:any =''
            try {
                // if(!adUserLogin && passwordValue != 'adPassword'){
                    result = await login({
                        login: loginValue,
                        password: passwordValue,
                        sessionId: sessionId,
                        encrypted: encrypted
                    });
                    // console.log('---result : ',result)
                // }
                
                if(result.success || adUserLogin) {
                    await refreshSession();
                    console.log('Успешный вход:', user);//result.data.user.name
                    authStore.set({
                        fName: user.user?.name || '',
                        dep: user.user?.department || '',
                        email: user.user?.mail || '',
                        name: loginValue,
                        sessionId: sessionId,
                        status: true // Устанавливаем статус в true, чтобы isAuth стал истиной
                    });
                    // Добавьте небольшую задержку для обновления состояния
                    setTimeout(async () => {
                        await nextTick();
                        await router.push('/'); // Используйте router.push вместо navigateTo
                        
                        showToast(`Пользователь ${user.user?.cn} - авторизован`, "success");
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
        } else {
            console.log('Пользователь не авторизован, необходимо авторизоваться.');
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
                // authStore.set({
                //     email: userEmail.value,
                //     name: userName.value,
                //     sessionId: sessionId,
                //     status: true // Устанавливаем статус в true, чтобы isAuth стал истиной
                // });
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
    onMounted(async () => {
        const response = await fetch('/api/ad/get-users-shared');
        console.log('###---> response ===== ', response)
        const data = await response.json();
        
        if(user.value != null){        
            adUserLogin.value = user.value?.username;
            setTimeout(() => {
                authUser(adUserLogin);
            }, 2000);
            
        };
        adUsers.value = data.users; // Сохраняем пользователей в реактивной переменной
        // console.log('Загружено:', adUsers.value)
    });
</script>

<style scoped>
    .isDisabled{
        pointer-events: none;
        opacity: 0.5;
        cursor: not-allowed;
    }
</style>


