import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { setUserSession } from '#imports';
import ActiveDirectory from 'activedirectory2';
import CryptoJS from 'crypto-js';
import { securePW } from '@@/app/composables/securePW';
// import  setUserSession  from 'nuxt-auth-utils';
const { encryptPassword, decryptPassword } = securePW();

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  // 1. Получаем логин и пароль из тела запроса
  const body = await readBody(event);
  let password_: any;
  console.log('Получен запрос на авторизацию:', body);
  // console.log('Полученные данные:', body);
  // console.log('Тип данных:', typeof body);
  // console.log('Ключи объекта:', Object.keys(body || {}));

  const { login, password, sessionId, encrypted } = body;
  // ✅ Если пароль пришёл зашифрованным — расшифровываем
});
