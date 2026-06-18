<!-- <script setup lang="ts">
import { v4 as uuid } from "uuid";
import { useIsLoadingStore, useAuthStore } from "@/store/auth.store";
import { protocolStore } from "@/store/config.store";
import axios from "axios";
import { useToastStore } from "@/store/toast.store";
import { useWebSocketStore } from "@/store/websocket.store";

useHead({
  title: "Login",
});

const emailRef = ref("");
const passwordRef = ref("");
const nameRef = ref("");
const protocolCfg = protocolStore();
const wsStore = useWebSocketStore();
const isLoadingStore = useIsLoadingStore();
const authStore = useAuthStore();
const router = useRouter();
isLoadingStore.set(false);
const sessionId = uuid();

const toastStore = useToastStore();
const toastId = Math.random().toString();

const showToast = (content: string, typeMsg: string) => {
  toastStore.addToast({
    id: toastId,
    title: "Уведомление!",
    description: content,
    type: typeMsg,
  });
};

const login = async (event: { type: string; key: string }) => {
  if (event.key === "Enter" || event.type === "click") {
    // console.log('event ======= ', event)
    // return
    isLoadingStore.set(true);
    const userInfo = {
      userName: nameRef.value,
      pass: passwordRef.value,
      token: "",
      sessionId: sessionId,
      userEmail: emailRef.value,
    };
    const inputUserData = userInfo;

    const registerUser = async () => {
      const response = await axios.post(protocolCfg.getProtocol + `/api/auth/login`, inputUserData);
      console.log("Пользователь авторизован");
      showToast(`Пользователь ${response.data.userName} - авторизован`, "success");
      const cookie = {
        sessionId: sessionId,
        timestamp: Date.now(),
      };
      localStorage.clear();
      if (typeof window !== "undefined" && typeof window.localStorage === "object") {
        try {
          localStorage.setItem("local_cookie", JSON.stringify(cookie));
          // console.log(`Client ${inputUserData.userName} is connected`);
        } catch (e) {
          console.error("Ошибка записи в localStorage:", e);
        }
      }
    };

    try {
      await registerUser();
      authStore.set({
        email: emailRef.value,
        name: nameRef.value,
        sessionId: sessionId,
        status: true,
      });
      console.log("newSessionId =====", sessionId);
      wsStore.connect(sessionId);
      await router.push("/");

      watch(
        () => authStore.getUserInfo.sessionId,
        (newSessionId) => {
          if (newSessionId) {
            console.log("!!!!!newSessionId =====", newSessionId);
            wsStore.connect(newSessionId);
          }
        }
      );

      isLoadingStore.set(false);
    } catch (error: any) {
      isLoadingStore.set(false);
      showToast(error.response.data.statusMessage, "error");
      console.error("Ошибка при регистрации", error);
      await router.push("/login");
      emailRef.value = "";
      passwordRef.value = "";
      nameRef.value = "";
    }
  } else {
    return;
  }
};

watch(
  () => wsStore.isConnecting,
  (newLinkStatus) => {
    console.log("Состояние подключения изменилось.", newLinkStatus);
  }
);

const register = async () => {
  if (!nameRef.value || !passwordRef.value || !sessionId) return;

  isLoadingStore.set(true);

  const inputUserData = {
    userName: nameRef.value,
    pass: passwordRef.value,
    sessionId: sessionId,
    userEmail: emailRef.value,
  };

  const signResp = await axios.post(protocolCfg.getProtocol + `/api/auth/signup`, inputUserData);
  if (signResp.data.answ === "ok") {
    showToast("Пользователь зарегистрирован", "success");
    authStore.set({
      email: emailRef.value,
      name: nameRef.value,
      sessionId: sessionId,
      status: true,
    });
    await router.push("/");
    isLoadingStore.set(false);
  } else if (signResp.data.error === "userAlreadyExists") {
    showToast("Такой пользователь уже существует", "error");
    await router.push("/login");
    isLoadingStore.set(false);
  }
};
</script> -->

<template>
  <div class="flex items-center justify-center min-h-screen w-full">
    <div class="rounded bg-sky-100 w-1/3 shadow-md p-5">
      <h1 class="text-2x1 font-bold text-center mb-5">Авторизация</h1>

      <form method="POST" id="auth-form" action="" enctype="application/x-www-form-urlencoded" > <!-- @keydown="login" -->
        <!-- <UiInput v-model="nameRef" placeholder="позывной" type="text" class="mb-3 backdrop-grayscale bg-white" /> -->
        <!-- <UiInput v-model="passwordRef" placeholder="пароль" type="password" class="mb-3 backdrop-grayscale bg-white" /> -->
        <!-- <UiInput v-model="emailRef" placeholder="email" type="email" class="mb-3 backdrop-grayscale bg-white" /> -->

        <div class="flex items-center justify-between gap-5">
          <!-- <UiButton type="button" variant="outline" @click="login">Войти</UiButton> -->
          <!-- <UiButton type="button" variant="outline" @click="register">Зарегистрироваться</UiButton> -->
        </div>
      </form>
    </div>
  </div>
</template>
