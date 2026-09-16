<template>
  <div class="mx-auto w-1/2 p-4">

    <!-- =====================================================
         Проверяем возможность автоматического Kerberos-входа
         ===================================================== -->

    <div
      v-if="isKerberosChecking"
      class="flex flex-col gap-3 bg-white w-full p-6 border border-gray-200 rounded-lg"
    >
      <div class="text-gray-700">
        Выполняется проверка доменной авторизации...
      </div>

      <div class="text-sm text-gray-400">
        Если вы авторизованы в домене, вход будет выполнен автоматически.
      </div>
    </div>


    <!-- =====================================================
         Обычная авторизация login/password
         ===================================================== -->

    <form
      v-else
      class="flex flex-col gap-2 bg-white w-full p-4 border border-gray-200 rounded-lg mb-4"
      @submit.prevent="authUser"
    >

      <div>
        <input
          v-model.trim="userLogin"
          type="text"
          autocomplete="username"
          placeholder="Логин"
          class="border border-gray-200 p-4 rounded-lg w-full"
        />
      </div>


      <div class="mb-2">
        <input
          v-model="password"
          type="password"
          autocomplete="current-password"
          placeholder="Пароль"
          class="border border-gray-200 p-4 rounded-lg w-full"
        />
      </div>


      <!-- Ошибка обычной авторизации -->

      <div
        v-if="loginError"
        class="text-sm text-red-600 mb-2"
      >
        {{ loginError }}
      </div>


      <div class="flex justify-between">

        <button
          type="submit"
          :disabled="isSubmitting"
          class="
            inline-block
            text-sm
            text-white
            px-3
            py-2
            bg-emerald-400
            border
            border-emerald-700
            rounded-sm
            hover:shadow-lg
            active:shadow-sm
            disabled:opacity-50
            disabled:cursor-not-allowed
          "
        >
          {{ isSubmitting ? 'Вход...' : 'Войти' }}
        </button>


        <button
          type="button"
          disabled
          class="
            inline-block
            text-sm
            text-gray-200
            px-3
            py-2
            bg-sky-500
            border
            border-emerald-700
            rounded-sm
            opacity-50
            cursor-not-allowed
          "
        >
          Зарегистрироваться
        </button>

      </div>

    </form>

  </div>
</template>


<script setup lang="ts">

import { computed, nextTick, onMounted, ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';


/**
 * ============================================================
 * Страница публичная
 * ============================================================
 */

definePageMeta({
  public: true,
});


useSeoMeta({
  title: 'Авторизация',
  description: 'Страница авторизации для доступа к системе.',
});


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

const tryKerberosLogin = async () => {

  isKerberosChecking.value = true;


  try {

    /**
     * ========================================================
     * ВОТ ЗДЕСЬ происходит обращение к:
     *
     * server/api/auth/kerberos.post.ts
     * ========================================================
     *
     * Но сначала запрос проходит через nginx:
     *
     * location = /api/auth/kerberos {
     *
     *     auth_gss on;
     *
     *     ...
     *
     * }
     *
     *
     * Если Kerberos успешен:
     *
     * nginx
     *   ↓
     * X-Remote-User
     *   ↓
     * kerberos.post.ts
     *   ↓
     * AD
     *   ↓
     * setUserSession()
     *
     *
     * Если Kerberos неуспешен:
     *
     * nginx
     *   ↓
     * 401 / 403
     *
     * kerberos.post.ts в таком случае
     * может вообще НЕ выполниться.
     */

    const result =
      await $fetch<{
        success: boolean;
        user?: any;
      }>(
        '/api/auth/kerberos',
        {
          method: 'POST',
          credentials: 'include',
        },
      );


    /**
     * Endpoint отработал,
     * но почему-то не сообщил success.
     */
    if (!result?.success) {

      throw new Error(
        'Kerberos authentication failed',
      );
    }


    /**
     * Kerberos endpoint уже создал session.
     */
    await finishLogin(
      'kerberos',
      result.user,
    );


    showToast(
      `Пользователь ${result.user?.name || result.user?.username || ''} авторизован через доменную учётную запись`,
      'success',
    );

  }
  catch (error: any) {

    /**
     * --------------------------------------------------------
     * Это НОРМАЛЬНЫЙ сценарий для недоменного пользователя.
     * --------------------------------------------------------
     *
     * Если Kerberos не сработал, мы ничего больше автоматически
     * не делаем.
     *
     * Просто завершаем проверку и показываем форму login/password.
     */

    const status =
      error?.statusCode ||
      error?.status ||
      error?.response?.status;


    if (
      status !== 401 &&
      status !== 403
    ) {

      /**
       * 401/403 ожидаемы.
       *
       * Остальные ошибки полезно видеть в console.
       */
      console.error(
        'Ошибка Kerberos-авторизации:',
        error,
      );
    }

  }
  finally {

    /**
     * После этого v-if переключит страницу
     * с сообщения "Проверка..."
     * на обычную форму.
     */
    isKerberosChecking.value =
      false;
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