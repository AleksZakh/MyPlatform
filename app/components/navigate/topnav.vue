<template>
    <nav class="flex  bg-sky-100 ">
        <div class="flex items-center px-5 w-fit">
            <div class="flex justify-center m-auto ">
                <NuxtImg src="/logo_eng.svg" width="200" height="40" alt="Logo" />
            </div>
        </div>
        <div class="p-5 grid items-center gap-1">
            
            <div>
                <NuxtLink to="/">
                    <Icon name="line-md:home" /> Главная
                </NuxtLink>
            </div>
            <div>
                <NuxtLink to="/edit">
                    <Icon name="line-md:edit" /> Изменить
                </NuxtLink>
            </div>
        </div>
        <div class="flex ml-auto items-center">
            <!-- <a @click="logout" class="flex items-center px-2 transition-colors hover:text-red-500" href="#">
                <Icon name="line-md:logout" /> 
            </a> -->
            <AuthState v-slot="{ loggedIn, clear }" >
                <div class="flex items-center px-2 transition-colors hover:text-red-500">
                    <button v-if="loggedIn" @click="logout"><Icon name="line-md:logout" /> </button>
                    <NuxtLink v-else to="/login"><Icon name="line-md:login" /></NuxtLink>
                </div>
            </AuthState>
        </div>
    </nav>
</template>

<script setup lang="ts">
// import  showToast  from "../../../utils/showToast";
    const logout = async () => {
        const authStore = useAuthStore();
        const isLoggedIn = useIsLoadingStore();
        const router = useRouter();
        const { clear } = useUserSession();
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

        try {
            // 1. Говорим серверу удалить куки
            // await $fetch('/api/auth/logout', { method: 'POST' })

            // 2. Очищаем локальное состояние в Pinia
            authStore.clear()
            isLoggedIn.set(false)
            
            clear()
            

            // 3. Редиректим на главную или страницу логина
            setTimeout(() => {
                showToast(`Вы успешно вышли из системы`, "inform");
                router.push('/login');                
            }, 500);
            
        } catch (error) {
            console.error('Ошибка при выходе:', error)
        }
        }

</script>


<style scoped>
    .grid{
        display: grid;
        grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr 1fr;
    }
</style>