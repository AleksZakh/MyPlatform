<!-- <template>
  <div class="p-10">
    <h1 class="text-gray-500">Добро пожаловать на главную</h1>
    <br>
    <p class="text-gray-500">Имя: {{ name }}</p>
    <p class="text-gray-500">Email: {{ email }}</p>
    <br>
    <UButton color="info">Save Changes</UButton>
    <br>
    <UButton icon="i-lucide-sun" variant="subtle">Button</UButton>    
  </div>
</template> -->

<template>
  <!-- <div v-if="session" class="main-area"> -->
    <!-- <Tabs_ui></Tabs_ui> -->
  <!-- </div> -->
  <div class="p-10">
    <h1 class="text-gray-500">Добро пожаловать на главную</h1>
    <br>
    <p class="text-gray-500">Имя: {{ name }}</p>
    <p class="text-gray-500">Email: {{ email }}</p>
    <br>
    <UButton color="info">Save Changes</UButton>
    <br>
    <UButton icon="i-lucide-sun" variant="subtle">Button</UButton>    
  </div>
</template>

<style scoped>
.main-area {
  background-color: aliceblue;
  position: absolute;
  left: 255px;
  top: 65px;
  right: 0%;
  display: flex;
  flex-direction: column;
  align-items: center;
  bottom: 50px;
}
</style>

<script setup lang="ts">
  import { useAuthStore, useIsLoadingStore } from "../stores/auth.store"
  import { useWebSocketStore } from "@/stores/websocket.store";

  // definePageMeta({ middleware: 'auth' })

  const authStorage = useAuthStore();
  const isLoadingStore = useIsLoadingStore();
  const wsStore = useWebSocketStore();
  const router = useRouter();

  
  const userStore = useUserStore();
  const name = computed(() => userStore.name);
  const email = computed(() => userStore.email);
  // console.log(window.localStorage?.length);

  // let authUser = false;
  
  // const session = useCookie('user_data');

  // console.log("session =======", session.value);


// if (typeof localStorage === "undefined") {
  // console.log("localStorage не работает!", localStorage);
// } else {
  // const local_cookie = window.localStorage.getItem("local_cookie") || "";
  // window.localStorage.removeItem("local_cookie");
  // localStorage.clear();
  // localStorage.setItem('testStore', 'test info')
  // authStorage.clear();
  // router.push("/login");
  // console.log("localCookie =======", local_cookie);
  // if (local_cookie !== "") {
    // const localCookie = JSON.parse(local_cookie);
    // authUser = await accountInfo.getAccount(protocolCfg.getProtocol + "/api/auth/getUsers", localCookie);
    // console.log("authUser ======", authUser);
    // if (authUser === "Session not found" || authUser === "User not found") {
      
    // } else {
      // await router.push("/");
    // }
    // isLoadingStore.set(false);
  // }
  // if (local_cookie == "") router.push("/login");
// }
</script>