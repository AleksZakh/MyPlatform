import { H3Event } from 'h3';
import { v4 as uuidv4 } from "uuid";

interface SessionUser {
    id: string | number;
    name: string;
    login: string;
    email: string;
}

interface SessionData {
    user: SessionUser;
    sessionId: string;
    loggedInAt: string;
    lastActivityAt?: string;
}

interface SessionConfig {
    maxAge?: number;      // Максимальное время жизни сессии в секундах
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
    path?: string;
}

// Ключ для хранения сессии в cookie
const SESSION_COOKIE_NAME = 'session-id';
const SESSION_PREFIX = 'session:';

// Получение хранилища сессий (используем Nitro storage)
const getSessionStorage = () => {
    // Используем встроенное хранилище Nitro
    const storage = useStorage();
    // Можно использовать разные драйверы: redis, memory, filesystem и т.д.
    return storage;
};

// Генерация случайного токена сессии
const generateSessionToken = (): string => {
    return uuidv4();
};

// Получение сессии из cookie и хранилища
export async function getUserSession(event: H3Event): Promise<SessionData | null> {
    try {
        // Получаем токен из cookie
        const cookieToken = getCookie(event, SESSION_COOKIE_NAME);
        
        if (!cookieToken) {
            return null;
        }
        
        // Получаем данные сессии из хранилища
        const storage = getSessionStorage();
        const sessionKey = `${SESSION_PREFIX}${cookieToken}`;
        const sessionData = await storage.getItem<SessionData>(sessionKey);
        
        if (!sessionData) {
            return null;
        }
        
        // Проверяем, не истекла ли сессия
        const maxAge = 60 * 60 * 24 * 7; // 7 дней по умолчанию
        const loggedInAt = new Date(sessionData.loggedInAt).getTime();
        const now = Date.now();
        
        if (now - loggedInAt > maxAge * 1000) {
            // Сессия истекла, удаляем её
            await storage.removeItem(sessionKey);
            deleteCookie(event, SESSION_COOKIE_NAME);
            return null;
        }
        
        // Обновляем время последней активности
        sessionData.lastActivityAt = new Date().toISOString();
        await storage.setItem(sessionKey, sessionData, {
            ttl: maxAge
        });
        
        return sessionData;
    } catch (error) {
        console.error('Error getting user session:', error);
        return null;
    }
}

// Установка сессии пользователя
export async function setUserSession(
    event: H3Event,
    sessionData: Omit<SessionData, 'lastActivityAt'>,
    config: SessionConfig = {}
): Promise<void> {
    try {
        // Генерируем новый токен сессии
        const sessionToken = generateSessionToken();
        
        // Настройки по умолчанию
        const defaultConfig: SessionConfig = {
            maxAge: 60 * 60 * 24 * 7, // 7 дней
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
        };
        
        const finalConfig = { ...defaultConfig, ...config };
        
        // Сохраняем данные в хранилище
        const storage = getSessionStorage();
        const sessionKey = `${SESSION_PREFIX}${sessionToken}`;
        const fullSessionData: SessionData = {
            ...sessionData,
            lastActivityAt: new Date().toISOString()
        };
        
        await storage.setItem(sessionKey, fullSessionData, {
            ttl: finalConfig.maxAge
        });
        
        // Устанавливаем cookie
        setCookie(event, SESSION_COOKIE_NAME, sessionToken, {
            maxAge: finalConfig.maxAge,
            httpOnly: finalConfig.httpOnly,
            secure: finalConfig.secure,
            sameSite: finalConfig.sameSite,
            path: finalConfig.path
        });
        
        // Также можно установить дополнительную cookie для клиента (без httpOnly)
        // чтобы клиент знал, что сессия существует
        setCookie(event, 'session-active', 'true', {
            maxAge: finalConfig.maxAge,
            httpOnly: false,
            secure: finalConfig.secure,
            sameSite: finalConfig.sameSite,
            path: '/'
        });
        
    } catch (error) {
        console.error('Error setting user session:', error);
        throw createError({
            statusCode: 500,
            message: 'Failed to set user session'
        });
    }
}

// Обновление существующей сессии
export async function updateUserSession(
    event: H3Event,
    updates: Partial<SessionData>
): Promise<SessionData | null> {
    try {
        const currentSession = await getUserSession(event);
        
        if (!currentSession) {
            return null;
        }
        
        // Обновляем данные
        const updatedSession = {
            ...currentSession,
            ...updates,
            lastActivityAt: new Date().toISOString()
        };
        
        // Получаем токен из cookie
        const sessionToken = getCookie(event, SESSION_COOKIE_NAME);
        
        if (sessionToken) {
            const storage = getSessionStorage();
            const sessionKey = `${SESSION_PREFIX}${sessionToken}`;
            await storage.setItem(sessionKey, updatedSession);
        }
        
        return updatedSession;
    } catch (error) {
        console.error('Error updating user session:', error);
        return null;
    }
}

// Удаление сессии (выход пользователя)
export async function clearUserSession(event: H3Event): Promise<void> {
    try {
        // Получаем токен из cookie
        const sessionToken = getCookie(event, SESSION_COOKIE_NAME);
        
        if (sessionToken) {
            // Удаляем данные из хранилища
            const storage = getSessionStorage();
            const sessionKey = `${SESSION_PREFIX}${sessionToken}`;
            await storage.removeItem(sessionKey);
        }
        
        // Удаляем cookie
        deleteCookie(event, SESSION_COOKIE_NAME);
        deleteCookie(event, 'session-active');
        
    } catch (error) {
        console.error('Error clearing user session:', error);
        throw createError({
            statusCode: 500,
            message: 'Failed to clear user session'
        });
    }
}

// Проверка, авторизован ли пользователь
export async function isAuthenticated(event: H3Event): Promise<boolean> {
    const session = await getUserSession(event);
    return session !== null && !!session.user;
}

// Получение текущего пользователя
export async function getCurrentUser(event: H3Event): Promise<SessionUser | null> {
    const session = await getUserSession(event);
    return session?.user || null;
}

// Удаление всех сессий пользователя (кроме текущей)
export async function terminateOtherSessions(
    event: H3Event,
    keepCurrent: boolean = true
): Promise<void> {
    try {
        const currentSession = await getUserSession(event);
        
        if (!currentSession) {
            return;
        }
        
        const storage = getSessionStorage();
        const currentToken = getCookie(event, SESSION_COOKIE_NAME);
        
        // Получаем все ключи сессий
        const allKeys = await storage.getKeys(`${SESSION_PREFIX}*`);
        
        // Удаляем все сессии пользователя, кроме текущей
        for (const key of allKeys) {
            const sessionData = await storage.getItem<SessionData>(key);
            
            if (sessionData && sessionData.user.id === currentSession.user.id) {
                if (keepCurrent && key === `${SESSION_PREFIX}${currentToken}`) {
                    continue; // Пропускаем текущую сессию
                }
                await storage.removeItem(key);
            }
        }
        
    } catch (error) {
        console.error('Error terminating other sessions:', error);
        throw createError({
            statusCode: 500,
            message: 'Failed to terminate other sessions'
        });
    }
}


