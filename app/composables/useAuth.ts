
import axios, { isAxiosError } from 'axios';
import { v4 as uuidv4 } from "uuid";

export const useAuth = () => {
    // Состояния
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    // Функция входа
    const login = async (credentials: {
        login: string;
        password: string;
        sessionId: string;
        encrypted: boolean;
    }) => {
        isLoading.value = true;
        error.value = null;
        
        try {
            // console.log('Попытка входа с данными:', credentials.login);
            const response = await axios.post('/api/auth/login', credentials);
            // console.log('response: ', response)
            return { success: true, data: response.data };
        } catch (err) {
            if (isAxiosError(err) && err.response?.status === 404) {
                // Пользователь не найден в БД
                return { success: false, error: 'USER_NOT_FOUND' };
            }
            error.value = 'Ошибка при входе';
            return { success: false, error: 'LOGIN_ERROR' };
        } finally {
            isLoading.value = false;
        }
    };

    const register = async (userData: {
        name: string;
        login: string;
        email: string;
        password: string;
        sessionId: string;
    }) => {
        isLoading.value = true;
        error.value = null;
        console.log('Попытка регистрации с данными:', userData.login);
        try {
            const response = await axios.post('/api/auth/register', userData);
            return { success: true, data: response.data };
        } catch (err) {
            if (isAxiosError(err) && err.response?.status === 409) {
                error.value = 'Пользователь с таким email или логином уже существует';
            } else {
                error.value = 'Ошибка при регистрации';
            }
            return { success: false, error: error.value };
        } finally {
            isLoading.value = false;
        }
    };


    return { isLoading, error, login, register };
}

