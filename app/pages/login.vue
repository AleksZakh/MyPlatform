<template>
  <div class="min-h-screen bg-slate-950 px-4 py-6 sm:px-6 lg:px-8">
    <div
      class="
        mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden
        rounded-3xl border border-white/10 bg-white shadow-2xl
        lg:grid-cols-[1.05fr_0.95fr]
      "
    >
      <!-- =====================================================
           Левая информационная часть
           ===================================================== -->
      <section
        class="
          relative hidden overflow-hidden bg-slate-950 p-10 text-white
          lg:flex lg:flex-col lg:justify-between xl:p-14
        "
      >
        <div
          class="
            pointer-events-none absolute -left-20 top-12 h-72 w-72
            rounded-full bg-sky-500/20 blur-3xl
          "
        />
        <div
          class="
            pointer-events-none absolute -bottom-24 -right-20 h-96 w-96
            rounded-full bg-indigo-500/20 blur-3xl
          "
        />

        <div class="relative">
          <div class="mb-10 flex items-center gap-3">
            <div
              class="
                flex h-11 w-11 items-center justify-center rounded-2xl
                border border-white/15 bg-white/10 text-lg font-semibold
                shadow-lg backdrop-blur
              "
            >
              S
            </div>

            <div>
              <div class="text-lg font-semibold tracking-wide">
                Space
              </div>
              <div class="text-xs text-slate-400">
                Corporate workspace
              </div>
            </div>
          </div>

          <div class="max-w-lg">
            <p
              class="
                mb-4 text-xs font-semibold uppercase tracking-[0.28em]
                text-sky-300
              "
            >
              Единая рабочая среда
            </p>

            <h1
              class="
                text-4xl font-semibold leading-tight tracking-tight
                xl:text-5xl
              "
            >
              Данные, процессы и доступы —
              <span class="text-slate-400">
                в одном пространстве.
              </span>
            </h1>

            <p class="mt-6 max-w-md text-base leading-7 text-slate-300">
              Авторизуйтесь с доменной учётной записью или используйте
              внешний аккаунт, выданный администратором Space.
            </p>
          </div>
        </div>

        <div class="relative grid gap-3 text-sm text-slate-300">
          <div
            class="
              flex items-center gap-3 rounded-2xl border border-white/10
              bg-white/5 px-4 py-3 backdrop-blur
            "
          >
            <span
              class="
                flex h-8 w-8 items-center justify-center rounded-xl
                bg-emerald-400/10 text-emerald-300
              "
            >
              ✓
            </span>

            <span>
              Защищённый вход для сотрудников компании
            </span>
          </div>

          <div
            class="
              flex items-center gap-3 rounded-2xl border border-white/10
              bg-white/5 px-4 py-3 backdrop-blur
            "
          >
            <span
              class="
                flex h-8 w-8 items-center justify-center rounded-xl
                bg-sky-400/10 text-sky-300
              "
            >
              ↗
            </span>

            <span>
              Отдельный доступ для внешних пользователей
            </span>
          </div>
        </div>
      </section>

      <!-- =====================================================
           Правая часть / формы
           ===================================================== -->
      <section
        class="
          flex items-center justify-center bg-slate-50 px-5 py-10
          sm:px-10 lg:px-12 xl:px-16
        "
      >
        <div class="w-full max-w-md">
          <!-- Мобильный логотип -->
          <div class="mb-8 flex items-center gap-3 lg:hidden">
            <div
              class="
                flex h-10 w-10 items-center justify-center rounded-2xl
                bg-slate-950 font-semibold text-white
              "
            >
              S
            </div>

            <div>
              <div class="font-semibold text-slate-950">
                Space
              </div>
              <div class="text-xs text-slate-500">
                Corporate workspace
              </div>
            </div>
          </div>

          <!-- =================================================
               Регистрация
               ================================================= -->
          <template v-if="mode === 'register'">
            <button
              type="button"
              class="
                mb-6 inline-flex items-center gap-2 text-sm font-medium
                text-slate-500 transition hover:text-slate-950
              "
              @click="closeRegistration"
            >
              <span aria-hidden="true">←</span>
              Назад ко входу
            </button>

            <div class="mb-7">
              <p
                class="
                  mb-2 text-xs font-semibold uppercase tracking-[0.2em]
                  text-sky-600
                "
              >
                Новый доступ
              </p>

              <h2 class="text-3xl font-semibold tracking-tight text-slate-950">
                Заявка на регистрацию
              </h2>

              <p class="mt-3 text-sm leading-6 text-slate-500">
                Заполните данные и выберите ресурсы, к которым требуется
                доступ. После проверки заявки вы получите письмо.
              </p>
            </div>

            <div
              class="
                rounded-2xl border border-slate-200 bg-white p-5
                shadow-sm sm:p-6
              "
            >
              <RegistrationRequestForm />
            </div>
          </template>

          <!-- =================================================
               Авторизация
               ================================================= -->
          <template v-else>
            <div class="mb-7">
              <p
                class="
                  mb-2 text-xs font-semibold uppercase tracking-[0.2em]
                  text-sky-600
                "
              >
                Добро пожаловать
              </p>

              <h2 class="text-3xl font-semibold tracking-tight text-slate-950">
                Вход в Space
              </h2>

              <p class="mt-3 text-sm leading-6 text-slate-500">
                Выберите тип учётной записи и продолжите авторизацию.
              </p>
            </div>

            <!-- Переключатель типа пользователя -->
            <div
              class="
                mb-6 grid grid-cols-2 rounded-2xl bg-slate-200/70 p-1
              "
            >
              <button
                type="button"
                class="
                  rounded-xl px-3 py-2.5 text-sm font-medium transition
                "
                :class="
                  loginMode === 'domain'
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                "
                @click="loginMode = 'domain'"
              >
                Сотрудник
              </button>

              <button
                type="button"
                class="
                  rounded-xl px-3 py-2.5 text-sm font-medium transition
                "
                :class="
                  loginMode === 'external'
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                "
                @click="loginMode = 'external'"
              >
                Внешний пользователь
              </button>
            </div>

            <!-- =================================================
                 DOMAIN
                 ================================================= -->
            <div v-if="loginMode === 'domain'">
              <!-- Проверка Kerberos -->
              <div
                v-if="isKerberosChecking"
                class="
                  rounded-2xl border border-sky-100 bg-sky-50 p-5
                "
              >
                <div class="flex items-start gap-4">
                  <span
                    class="
                      mt-0.5 h-5 w-5 shrink-0 animate-spin rounded-full
                      border-2 border-sky-200 border-t-sky-600
                    "
                    aria-hidden="true"
                  />

                  <div>
                    <p class="font-medium text-slate-900">
                      Проверяем доменную авторизацию
                    </p>

                    <p class="mt-1 text-sm leading-6 text-slate-500">
                      Если компьютер находится в домене, вход будет
                      выполнен автоматически.
                    </p>
                  </div>
                </div>
              </div>

              <!-- Ручной доменный вход -->
              <form
                v-else
                class="space-y-4"
                @submit.prevent="authUser"
              >
                <div class="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
                  <p v-if="kerberosDiagnostic" role="status">{{ kerberosDiagnostic }}</p>
                  <p v-else>Можно войти с текущей доменной учётной записью без ввода пароля.</p>
                  <button type="button" class="mt-2 font-semibold text-sky-700" :disabled="isSubmitting" @click="tryKerberosLogin">Повторить доменный вход</button>
                </div>
                <label class="block">
                  <span class="mb-2 block text-sm font-medium text-slate-700">
                    Доменный логин
                  </span>

                  <input
                    v-model.trim="userLogin"
                    type="text"
                    autocomplete="username"
                    placeholder="ivanov"
                    class="
                      w-full rounded-xl border border-slate-300 bg-white
                      px-4 py-3 text-slate-950 outline-none transition
                      placeholder:text-slate-400
                      focus:border-sky-500 focus:ring-4 focus:ring-sky-100
                    "
                  >
                </label>

                <label class="block">
                  <span class="mb-2 block text-sm font-medium text-slate-700">
                    Пароль
                  </span>

                  <input
                    v-model="password"
                    type="password"
                    autocomplete="current-password"
                    placeholder="Введите пароль"
                    class="
                      w-full rounded-xl border border-slate-300 bg-white
                      px-4 py-3 text-slate-950 outline-none transition
                      placeholder:text-slate-400
                      focus:border-sky-500 focus:ring-4 focus:ring-sky-100
                    "
                  >
                </label>

                <div
                  v-if="loginError"
                  class="
                    rounded-xl border border-red-200 bg-red-50
                    px-4 py-3 text-sm text-red-700
                  "
                >
                  {{ loginError }}
                </div>

                <button
                  type="submit"
                  :disabled="isSubmitting"
                  class="
                    flex w-full items-center justify-center rounded-xl
                    bg-slate-950 px-4 py-3 font-medium text-white
                    shadow-sm transition
                    hover:bg-slate-800
                    focus:outline-none focus:ring-4 focus:ring-slate-200
                    disabled:cursor-not-allowed disabled:opacity-50
                  "
                >
                  {{ isSubmitting ? 'Выполняется вход...' : 'Войти' }}
                </button>

                <div
                  class="
                    rounded-xl border border-slate-200 bg-white
                    px-4 py-3 text-xs leading-5 text-slate-500
                  "
                >
                  На доменном компьютере ручной ввод обычно не требуется:
                  Space сначала пытается выполнить Kerberos-вход автоматически.
                </div>
              </form>
            </div>

            <!-- =================================================
                 EXTERNAL
                 ================================================= -->
            <form
              v-else
              class="space-y-4"
              @submit.prevent="loginExternalUser"
            >
              <label class="block">
                <span class="mb-2 block text-sm font-medium text-slate-700">
                  Email
                </span>

                <input
                  v-model="externalEmail"
                  type="email"
                  autocomplete="username"
                  placeholder="name@company.com"
                  required
                  class="
                    w-full rounded-xl border border-slate-300 bg-white
                    px-4 py-3 text-slate-950 outline-none transition
                    placeholder:text-slate-400
                    focus:border-sky-500 focus:ring-4 focus:ring-sky-100
                  "
                >
              </label>

              <label class="block">
                <span class="mb-2 block text-sm font-medium text-slate-700">
                  Пароль
                </span>

                <input
                  v-model="externalPassword"
                  type="password"
                  autocomplete="current-password"
                  placeholder="Введите пароль"
                  required
                  class="
                    w-full rounded-xl border border-slate-300 bg-white
                    px-4 py-3 text-slate-950 outline-none transition
                    placeholder:text-slate-400
                    focus:border-sky-500 focus:ring-4 focus:ring-sky-100
                  "
                >
              </label>

              <div
                v-if="externalError"
                class="
                  rounded-xl border border-red-200 bg-red-50
                  px-4 py-3 text-sm text-red-700
                "
              >
                {{ externalError }}
              </div>

              <button
                type="submit"
                :disabled="externalLoading"
                class="
                  flex w-full items-center justify-center rounded-xl
                  bg-sky-600 px-4 py-3 font-medium text-white shadow-sm
                  transition hover:bg-sky-700
                  focus:outline-none focus:ring-4 focus:ring-sky-100
                  disabled:cursor-not-allowed disabled:opacity-50
                "
              >
                {{
                  externalLoading
                    ? 'Выполняется вход...'
                    : 'Войти как внешний пользователь'
                }}
              </button>

              <div
                class="
                  rounded-xl border border-slate-200 bg-white
                  px-4 py-3 text-xs leading-5 text-slate-500
                "
              >
                Используйте email, указанный при регистрации, и пароль,
                созданный по ссылке активации.
              </div>
            </form>

            <!-- Регистрация -->
            <div class="mt-7 border-t border-slate-200 pt-6 text-center">
              <p class="text-sm text-slate-500">
                Нет внешней учётной записи?
              </p>

              <button
                type="button"
                class="
                  mt-2 text-sm font-semibold text-sky-700 transition
                  hover:text-sky-900
                "
                @click="openRegistration"
              >
                Подать заявку на доступ
              </button>
            </div>

            <p class="mt-8 text-center text-xs text-slate-400">
              Доступ к системе предоставляется в соответствии
              с назначенными правами пользователя.
            </p>
          </template>
        </div>
      </section>
    </div>
  </div>
</template>


<script setup lang="ts">

import { computed, nextTick, onMounted, ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import RegistrationRequestForm
  from '~/components/auth/RegistrationRequestForm.vue';


/**
 * ============================================================
 * Страница публичная
 * ============================================================
 */

definePageMeta({
  public: true,
  layout: 'auth',
});


useSeoMeta({
  title: 'Авторизация',
  description: 'Страница авторизации для доступа к системе.',
});

type LoginMode =
  | 'domain'
  | 'external';

const loginMode =
  ref<LoginMode>('domain');

const mode =
  ref<'login' | 'register'>('login');

const openRegistration = () => {
  loginError.value = '';
  mode.value = 'register';
};

const closeRegistration = () => {
  mode.value = 'login';
};

const externalEmail =
  ref('');

const externalPassword =
  ref('');

const externalLoading =
  ref(false);

const externalError =
  ref('');


/**
 * ============================================================
 * Router
 * ============================================================
 */

const router = useRouter();
const route = useRoute();


/**
 * ============================================================
 * Stores / composables
 * ============================================================
 */

const authStore = useAuthStore();
const toastStore = useToastStore();


/**
 * Ваш существующий composable обычной авторизации.
 *
 * login() должен обращаться к /api/auth/login,
 * проверять login/password и на сервере вызывать
 * setUserSession().
 */
const {
  login,
} = useAuth();


/**
 * nuxt-auth-utils
 */
const {
  loggedIn,
  user,
  fetch: refreshSession,
} = useUserSession();


/**
 * ============================================================
 * State
 * ============================================================
 */

const userLogin = ref('');
const password = ref('');

const isKerberosChecking = ref(true);
const isSubmitting = ref(false);

const loginError = ref('');


/**
 * ============================================================
 * Toast
 * ============================================================
 */

const showToast = (
  content: string,
  typeMsg: string,
) => {

  toastStore.addToast({
    id: crypto.randomUUID(),
    title: 'Уведомление!',
    description: content,
    type: typeMsg,
  });
};


/**
 * ============================================================
 * Куда отправить пользователя после авторизации
 * ============================================================
 *
 * Например:
 *
 * /login?redirect=/documents/125
 *
 * После входа:
 *
 * /documents/125
 */

const redirectAfterLogin = computed(() => {

  const redirect =
    route.query.redirect;


  if (
    typeof redirect === 'string' &&
    redirect.startsWith('/') &&
    !redirect.startsWith('//') &&
    !redirect.startsWith('/login')
  ) {
    return redirect;
  }


  return '/';
});

const loginExternalUser =
  async () => {
    externalError.value = '';

    const email =
      externalEmail.value
        .trim()
        .toLowerCase();

    if (
      !email ||
      !externalPassword.value
    ) {
      externalError.value =
        'Введите email и пароль.';

      return;
    }

    externalLoading.value = true;

    try {
      await $fetch(
        '/api/auth/external-login',
        {
          method: 'POST',

          body: {
            email,

            password:
              externalPassword.value,
          },
        },
      );

      /*
       * Endpoint уже создал session-cookie.
       * Обновляем client-side состояние
       * nuxt-auth-utils.
       */
      await refreshSession();

      externalPassword.value = '';

      /*
       * Если пользователь изначально пытался
       * открыть защищённую страницу —
       * возвращаем его туда.
       */
      const redirect =
        typeof route.query.redirect ===
          'string' &&
        route.query.redirect.startsWith('/') &&
        !route.query.redirect.startsWith('//')
          ? route.query.redirect
          : '/';

      await navigateTo(redirect);
    }
    catch (error: any) {
      externalError.value =
        error?.data?.message ||
        error?.statusMessage ||
        'Не удалось выполнить вход.';
    }
    finally {
      externalLoading.value = false;
    }
  };

/**
 * ============================================================
 * Завершение авторизации
 * ============================================================
 *
 * Общая функция для:
 *
 *   Kerberos
 *
 * и
 *
 *   login/password
 *
 *
 * К моменту её вызова SERVER уже должен создать session
 * посредством setUserSession().
 */

const finishLogin = async (
  authMethod: 'kerberos' | 'password',
  profile?: any,
) => {

  /**
   * Получаем свежую session с сервера.
   */
  await refreshSession();


  /**
   * Session должна существовать.
   */
  if (!loggedIn.value) {

    throw new Error(
      'После авторизации пользовательская сессия не была создана.',
    );
  }


  const sessionUser: any =
    user.value;


  /**
   * Заполняем ваш существующий Pinia authStore.
   *
   * В дальнейшем его можно будет упростить,
   * поскольку большая часть информации уже находится
   * в useUserSession().
   */
  authStore.set({

    fName:
      profile?.name ||
      sessionUser?.name ||
      '',

    dep:
      profile?.department ||
      sessionUser?.department ||
      '',

    email:
      profile?.email ||
      profile?.mail ||
      sessionUser?.email ||
      '',

    name:
      profile?.username ||
      profile?.login ||
      sessionUser?.username ||
      sessionUser?.login ||
      userLogin.value,

    sessionId:
      uuidv4(),

    status:
      true,

    /**
     * Оставляю ваше существующее название поля.
     */
    authMetod:
      authMethod as any,
  });


  await nextTick();


  /**
   * replace(), а не push().
   *
   * Чтобы кнопка браузера "Назад"
   * не возвращала пользователя снова на /login.
   */
  await router.replace(
    redirectAfterLogin.value,
  );
};


/**
 * ============================================================
 * KERBEROS LOGIN
 * ============================================================
 *
 * Эта функция вызывается автоматически ОДИН РАЗ
 * после открытия /login.
 */

const kerberosDiagnostic = ref('');
const tryKerberosLogin = async () => {
  if (isSubmitting.value) return;
  isKerberosChecking.value = true;
  kerberosDiagnostic.value = '';
  let phase = 'negotiate';
  let requestId = '';
  try {
    const result = await $fetch<{ success: boolean; user?: any; requestId?: string }>(
      '/api/auth/kerberos', { method: 'POST', credentials: 'include', retry: 0, timeout: 15000 },
    );
    requestId = result.requestId || '';
    if (!result.success) throw new Error('KERBEROS_RESPONSE_INVALID');
    phase = 'session-check';
    await finishLogin('kerberos', result.user);
    showToast('Вход через доменную учётную запись выполнен', 'success');
  } catch (error: any) {
    const data = error?.data?.data;
    const stage = data?.stage || error?.response?.headers?.get('x-space-auth-stage') || phase;
    const status = error?.statusCode || error?.response?.status || '—';
    const id = data?.requestId || error?.response?.headers?.get('x-space-auth-request') || requestId;
    const messages: Record<string, string> = {
      negotiate: 'Браузер или nginx не завершили автоматический доменный вход.',
      proxy: 'Приложение не получило подтверждённое имя пользователя от nginx.',
      directory: 'Не удалось получить профиль из Active Directory.',
      account: 'Не удалось подготовить учётную запись Space или вход для неё запрещён.',
      session: 'Сервер не смог создать сессию Space.',
      'session-check': 'Сессия после входа не подтвердилась. Проверьте cookie и настройки сервера.',
    };
    kerberosDiagnostic.value = `${messages[stage] || 'Доменный вход не завершён.'} Этап: ${stage}; HTTP: ${status}${id ? `; запрос: ${id}` : ''}.`;
  } finally {
    isKerberosChecking.value = false;
  }
};


/**
 * ============================================================
 * LOGIN + PASSWORD
 * ============================================================
 *
 * Эту функцию пользователь вызывает вручную
 * нажатием кнопки "Войти".
 *
 * Она НЕ обращается к kerberos.post.ts.
 */

const authUser = async () => {

  loginError.value = '';


  /**
   * Проверяем форму.
   */

  if (!userLogin.value) {

    loginError.value =
      'Введите логин';

    return;
  }


  if (!password.value) {

    loginError.value =
      'Введите пароль';

    return;
  }


  isSubmitting.value = true;


  try {

    const sessionId =
      uuidv4();


    /**
     * ========================================================
     * ОБЫЧНАЯ АВТОРИЗАЦИЯ
     * ========================================================
     *
     * Этот login() должен обращаться к:
     *
     *     /api/auth/login
     *
     * а НЕ:
     *
     *     /api/auth/kerberos
     *
     *
     * Именно /api/auth/login должен проверить пароль
     * и вызвать:
     *
     *     setUserSession()
     */

    const result: any =
      await login({

        login:
          loginNormal(
            userLogin.value,
          ),

        password:
          password.value,

        sessionId,

        encrypted:
          false,
      });


    /**
     * Авторизация неуспешна.
     */
    if (!result?.success) {

      loginError.value =
        result?.message ||
        'Неверный логин или пароль';

      return;
    }


    /**
     * /api/auth/login уже создал Nuxt session.
     */

    const profile =
      result?.data?.user ||
      result?.user;


    await finishLogin(
      'password',
      profile,
    );


    showToast(
      `Пользователь ${profile?.name || userLogin.value} авторизован`,
      'success',
    );

  }
  catch (error: any) {

    console.error(
      'Ошибка обычной авторизации:',
      error,
    );


    const status =
      error?.statusCode ||
      error?.status ||
      error?.response?.status;


    if (
      status === 401 ||
      status === 403
    ) {

      loginError.value =
        'Неверный логин или пароль';

    }
    else {

      loginError.value =
        'Не удалось выполнить авторизацию. Попробуйте ещё раз.';
    }

  }
  finally {

    isSubmitting.value =
      false;
  }
};


/**
 * ============================================================
 * ИНИЦИАЛИЗАЦИЯ /login
 * ============================================================
 */

onMounted(async () => {

  try {

    /**
     * --------------------------------------------------------
     * ШАГ 1
     *
     * Сначала проверяем, нет ли уже готовой Nuxt session.
     * --------------------------------------------------------
     *
     * Например пользователь уже авторизован,
     * но вручную открыл:
     *
     * /login
     */

    await refreshSession();


    if (loggedIn.value) {

      /**
       * Пользователь уже авторизован.
       *
       * Kerberos повторно НЕ вызываем.
       */

      await router.replace(
        redirectAfterLogin.value,
      );

      return;
    }


    /**
     * --------------------------------------------------------
     * ШАГ 2
     *
     * Session нет.
     *
     * Только теперь ОДИН РАЗ пробуем Kerberos.
     * --------------------------------------------------------
     */
    /**
     * Если пользователь только что сам нажал Logout,
     * автоматический Kerberos-login НЕ выполняем.
     *
     * Иначе доменный пользователь сразу войдёт обратно.
     */

    if (route.query.logout === '1') {

      isKerberosChecking.value = false;

      return;
    }

    await tryKerberosLogin();

  }
  catch (error) {

    console.error(
      'Ошибка инициализации страницы авторизации:',
      error,
    );


    /**
     * В любом случае пользователь должен получить
     * возможность войти вручную.
     */

    isKerberosChecking.value =
      false;
  }
});

</script>