// composables/useCrypto.ts
import CryptoJS from 'crypto-js';

export const securePW = () => {
  const config = useRuntimeConfig();
  const SECRET_KEY = config.public.cryptoKey;

  const encryptPassword = (password: string): string => {
    // 1. Шифруем пароль в объект
    const encrypted = CryptoJS.AES.encrypt(password, SECRET_KEY);
    // 2. Превращаем в чистую Base64 строку и кодируем для URL-безопасности
    const base64Str = encrypted.toString();
    return btoa(base64Str); // btoa безопасно пакует строку для сети
  };

  const decryptPassword = (encryptedPassword: string): string => {
    // Этот метод на фронтенде обычно не нужен, но исправим для порядка
    const base64Str = atob(encryptedPassword);
    const bytes = CryptoJS.AES.decrypt(base64Str, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  };

  return { encryptPassword, decryptPassword };
};
