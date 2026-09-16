// app/composables/useAuth.ts

import axios, {
  isAxiosError,
} from 'axios';


export const useAuth = () => {

  const isLoading =
    ref(false);

  const error =
    ref<string | null>(null);


  /**
   * ==========================================================
   * LOGIN
   * ==========================================================
   */

  const login = async (
    credentials: {
      login: string;
      password: string;
      sessionId: string;
      encrypted?: boolean;
    },
  ) => {

    isLoading.value = true;
    error.value = null;


    try {

      const response =
        await axios.post(
          '/api/auth/login',

          {
            login:
              credentials.login,

            password:
              credentials.password,

            sessionId:
              credentials.sessionId,
          },
        );


      /**
       * Дополнительно убеждаемся,
       * что сервер действительно сообщил об успехе.
       */

      if (!response.data?.success) {

        return {
          success: false,

          error:
            'LOGIN_FAILED',

          message:
            'Не удалось выполнить авторизацию.',
        };
      }


      return {
        success: true,

        data:
          response.data,
      };

    }
    catch (err) {

      if (isAxiosError(err)) {

        const status =
          err.response?.status;


        /**
         * Неверный login/password.
         */

        if (status === 401) {

          const message =
            err.response?.data?.message ||
            'Неверный логин или пароль';


          error.value =
            message;


          return {
            success: false,

            error:
              'INVALID_CREDENTIALS',

            message,
          };
        }


        /**
         * Пользователь прошёл аутентификацию,
         * но доступ запрещён.
         */

        if (status === 403) {

          const message =
            err.response?.data?.message ||
            'Доступ запрещён';


          error.value =
            message;


          return {
            success: false,

            error:
              'ACCESS_DENIED',

            message,
          };
        }


        /**
         * Active Directory недоступен.
         */

        if (status === 503) {

          const message =
            err.response?.data?.message ||
            'Служба авторизации временно недоступна';


          error.value =
            message;


          return {
            success: false,

            error:
              'AD_UNAVAILABLE',

            message,
          };
        }
      }


      console.error(
        'Ошибка login:',
        err,
      );


      error.value =
        'Ошибка при входе';


      return {
        success: false,

        error:
          'LOGIN_ERROR',

        message:
          'Не удалось выполнить авторизацию.',
      };

    }
    finally {

      isLoading.value =
        false;
    }
  };


  /**
   * ==========================================================
   * REGISTER
   * ==========================================================
   */

  const register = async (
    userData: {
      name: string;
      login: string;
      email: string;
      password: string;
      sessionId: string;
    },
  ) => {

    isLoading.value = true;
    error.value = null;


    try {

      const response =
        await axios.post(
          '/api/auth/register',
          userData,
        );


      return {
        success: true,
        data: response.data,
      };

    }
    catch (err) {

      if (
        isAxiosError(err) &&
        err.response?.status === 409
      ) {

        error.value =
          'Пользователь с таким email или логином уже существует';

      }
      else {

        error.value =
          'Ошибка при регистрации';
      }


      return {
        success: false,
        error: error.value,
      };

    }
    finally {

      isLoading.value =
        false;
    }
  };


  return {
    isLoading,
    error,
    login,
    register,
  };
};