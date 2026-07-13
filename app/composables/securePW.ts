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
    console.log('Проль введённый пользователем = ', password);
    console.log('Секрет, которым будем зашифровывать = ', SECRET_KEY);
    // Используем AES-256 шифрование
    const encrypted = CryptoJS.AES.encrypt(password, SECRET_KEY).toString();
    return encrypted;
  };

  /**
   * Расшифровывает пароль на сервере
   */
  const decryptPassword = (encryptedPassword: string): string => {
    console.log('Проль пришедший на расшифровку = ', encryptedPassword);
    console.log('Секрет, которым будем расшифровывать = ', SECRET_KEY);
    const bytes = CryptoJS.AES.decrypt(encryptedPassword, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted;
  };

  return {
    encryptPassword,
    decryptPassword,
  };
};
