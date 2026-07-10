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
  // console.log("Получен запрос на авторизацию:", body);
  // console.log('Полученные данные:', body);
  // console.log('Тип данных:', typeof body);
  // console.log('Ключи объекта:', Object.keys(body || {}));

  const { login, password, sessionId, encrypted } = body;
  // ✅ Если пароль пришёл зашифрованным — расшифровываем

  if (!login || !password) {
    console.log('Неполные данные для входа:', {
      login,
      password: password ? '***' : null,
    });
    throw createError({
      statusCode: 4000,
      message: 'Необходимо указать логин и пароль',
    });
  }

  // 2. Берем конфигурацию AD из переменных окружения (.env)
  const config = useRuntimeConfig(event);
  const adConfig = {
    url: config.ad.url, // Например, 'ldap://dc.company.local'
    baseDN: config.ad.baseDN, // Например, 'DC=company,DC=local'
    // !!! ВАЖНО: Используем для поиска техническую учетную запись !!!
    username: config.ad.username,
    password: config.ad.password,
  };
  
  if (encrypted) {
    try {
      password_ = decryptPassword(password);
      if (!password_) {
        throw new Error('Не удалось расшифровать пароль');
      }
    } catch (error) {
      console.error('❌ Ошибка расшифровки:', error);
      throw createError({
        statusCode: 400,
        message: 'Ошибка расшифровки пароля',
      });
    }
  } else if (!encrypted && password == 'adPassword') {
    password_ = password;
  }

  // 3. Инициализируем AD и выполняем аутентификацию
  const ad = new ActiveDirectory(adConfig);

  // Функция для удобного поиска пользователя по лоигну в AD
  const findUserByLogin = (users: any[], login: string) => {
    return users.find(
      (user) => user.sAMAccountName?.toLowerCase() === login.toLowerCase()
    );
  };

  return new Promise(async (resolve, reject) => {
    console.log(`🔐 Попытка входа пользователя: ${login}`, encrypted);
    let login_ = login + '@corp.avtodor-eng.ru';

    // Главный метод проверки пароля
    ad.authenticate(
      login_,
      password_,
      async (err: any, isAuthenticated: boolean) => {
        if (password_ != 'adPassword') {
          if (err) {
            console.error(`❌ Ошибка при проверке пароля для ${login}:`, err);
            return reject(
              createError({
                statusCode: 5000,
                message: 'Ошибка сервера при проверке данных',
              })
            );
          }

          if (!isAuthenticated) {
            console.log(`❌ Неверный логин или пароль для: ${login}`);
            return resolve({
              success: false,
              message: 'Неверное имя пользователя или пароль',
            });
          }

          // --- Аутентификация успешна! ---
          console.log(
            `✅ Пользователь ${login} успешно аутентифицирован в AD.`
          );
        } else {
          console.log(`✅ Пользователь ${login} аутентифицирован в домене AD.`);
        }

        try {
          // 4. (Опционально) Получаем детальную информацию о пользователе
          // Важно: для этого запроса используется техническая учетная запись из adConfig
          const searchOptions = {
            filter: `(&(objectClass=user)(sAMAccountName=${login}))`,
            scope: 'sub',
            attributes: [
              'cn',
              'sn',
              'givenName',
              'mail',
              'sAMAccountName',
              'department',
              'title',
            ],
            includeMembership: [],
            includeDeleted: false,
            includeDerivedMembership: [],
          };

          ad.findUsers(
            searchOptions as any,
            async (findErr: any, users: any[]) => {
              if (findErr || !users || users.length === 0) {
                console.warn(
                  `⚠️ Не удалось найти дополнительные данные для ${login} после успешного входа.`
                );
                // Попытка установить сессию с минимальными данными, даже если детали не загрузились
                const fallbackUser = { sAMAccountName: login };
                try {
                  await setUserSession(event, {
                    user: fallbackUser,
                    sessionId: sessionId,
                    loggedInAt: new Date().toISOString(),
                  });
                } catch (e) {
                  console.error('Ошибка при установке сессии (fallback):', e);
                }
                return resolve({ success: true, user: fallbackUser });
              }

              // console.log('Пользователь ######$$$$$$$$$$= ', findUserByLogin(users, login))

              const fullUserData = users[0];
              console.log(`📦 Данные пользователя ${login} загружены.`);
              const userInfo = {
                login: fullUserData.sAMAccountName,
                name:
                  fullUserData.cn ||
                  `${fullUserData.givenName} ${fullUserData.sn}`.trim(),
                email: fullUserData.mail || null,
                department: fullUserData.department || null,
              };

              try {
                await setUserSession(event, {
                  user: userInfo,
                  sessionId: sessionId,
                  loggedInAt: new Date().toISOString(),
                });
              } catch (e) {
                console.error('Ошибка при установке сессии:', e);
              }

              // Возвращаем успешный ответ с данными пользователя
              return resolve({
                success: true,
                user: userInfo,
              });
            }
          );
        } catch (error) {
          console.error(
            `⚠️ Ошибка при загрузке данных пользователя ${login}:`,
            error
          );
          resolve({ success: true, user: { sAMAccountName: login } });
        }
      }
    );
  });
});
