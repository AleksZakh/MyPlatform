// composables/useCrypto.ts
import CryptoJS from 'crypto-js';

// Секретный ключ для шифрования (НЕ ХРАНИТЬ В КОДЕ!)
// В production должен загружаться из переменных окружения


export const securePW = () => {
    const config = useRuntimeConfig();

    const SECRET_KEY = config.public.cryptoKey;
    /**
     * Шифрует пароль перед отправкой на сервер
     */
    const encryptPassword = (password: string): string => {
        // Используем AES-256 шифрование
        const encrypted = CryptoJS.AES.encrypt(password, SECRET_KEY).toString();
        return encrypted;
    };

    /**
     * Расшифровывает пароль на сервере
     */
    const decryptPassword = (encryptedPassword: string): string => {
        const bytes = CryptoJS.AES.decrypt(encryptedPassword, SECRET_KEY);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        return decrypted;
    };

    return {
        encryptPassword,
        decryptPassword
    };
};