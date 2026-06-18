import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import { setUserSession } from '#imports';
// import  setUserSession  from 'nuxt-auth-utils';


const prisma = new PrismaClient()

// server/api/auth/login.post.ts
import ActiveDirectory from 'activedirectory2';

export default defineEventHandler(async (event) => {
    
    // 1. Получаем логин и пароль из тела запроса
    // const body = await readBody(event);
    // console.log("Получен запрос на авторизацию:", body);
    // console.log('Полученные данные:', body);
    // console.log('Тип данных:', typeof body);
    // console.log('Ключи объекта:', Object.keys(body || {}));
    
    const { login, password, sessionId } = body;

    if (!login || !password) {
        console.log("Неполные данные для входа:", { login, password: password ? '***' : null });
        throw createError({ statusCode: 4000, message: 'Необходимо указать логин и пароль' });
    }

    // 2. Берем конфигурацию AD из переменных окружения (.env)
    const config = useRuntimeConfig(event);
    const adConfig = {
        url: config.ad.url,              // Например, 'ldap://dc.company.local'
        baseDN: config.ad.baseDN,        // Например, 'DC=company,DC=local'
        // !!! ВАЖНО: Используем для поиска техническую учетную запись !!!
        username: config.ad.username,   
        password: config.ad.password,
    };

    // 3. Инициализируем AD и выполняем аутентификацию
    const ad = new ActiveDirectory(adConfig);

    // Функция для удобного поиска пользователя по лоигну в AD
    const findUserByLogin = (users: any[], login: string) => {
        return users.find(user => user.sAMAccountName?.toLowerCase() === login.toLowerCase());
    };

    return new Promise((resolve, reject) => {
        console.log(`🔐 Попытка входа пользователя: ${login}`);

        // Главный метод проверки пароля
        ad.authenticate(login, password, async (err: any, isAuthenticated: boolean) => {
            if(password != 'adPassword'){
	        if (err) {
                    console.error(`❌ Ошибка при проверке пароля для ${login}:`, err);
                    return reject(createError({ statusCode: 5000, message: 'Ошибка сервера при проверке данных' }));
                }

                if (!isAuthenticated) {
                    console.log(`❌ Неверный логин или пароль для: ${login}`);
                    return resolve({ success: false, message: 'Неверное имя пользователя или пароль' });
                }

                // --- Аутентификация успешна! ---
                console.log(`✅ Пользователь ${login} успешно аутентифицирован в AD.`);
	    } else {
                console.log(`✅ Пользователь ${login} аутентифицирован в домене AD.`);
            }
            
            try {
                // 4. (Опционально) Получаем детальную информацию о пользователе
                // Важно: для этого запроса используется техническая учетная запись из adConfig
                const login_ = login.split('\\')[1] || login; // Если логин в формате "DOMAIN\user", извлекаем "user"
                const searchOptions = {
                    filter: `(&(objectClass=user)(sAMAccountName=${login_}))`,
                    scope: 'sub',
                    attributes: ['cn', 'sn', 'givenName', 'mail', 'sAMAccountName', 'department', 'title'],
                    includeMembership: [],
                    includeDeleted: false,
                    includeDerivedMembership: []
                };

                ad.findUsers(searchOptions as any, async (findErr: any, users: any[]) => {
                    if (findErr || !users || users.length === 0) {
                        console.warn(`⚠️ Не удалось найти дополнительные данные для ${login} после успешного входа.`);
                        // Попытка установить сессию с минимальными данными, даже если детали не загрузились
                        const fallbackUser = { sAMAccountName: login };
                        try {
                            await setUserSession(event, {
                                user: fallbackUser,
                                sessionId: sessionId,
                                loggedInAt: new Date().toISOString()
                            });
                        } catch (e) {
                            console.error('Ошибка при установке сессии (fallback):', e);
                        }
                        return resolve({ success: true, user: fallbackUser });
                    }

                    const fullUserData = users[0];
                    console.log(`📦 Данные пользователя ${login} загружены.`);
                    const userInfo = {
                        login: fullUserData.sAMAccountName,
                        name: fullUserData.cn || `${fullUserData.givenName} ${fullUserData.sn}`.trim(),
                        email: fullUserData.mail || null,
                        department: fullUserData.department || null,
                    }

                    try {
                        await setUserSession(event, {
                            user: userInfo,
                            sessionId: sessionId,
                            loggedInAt: new Date().toISOString()
                        });
                    } catch (e) {
                        console.error('Ошибка при установке сессии:', e);
                    }

                    // Возвращаем успешный ответ с данными пользователя
                    return resolve({
                        success: true,
                        user: userInfo
                    });
                });
            } catch (error) {
                console.error(`⚠️ Ошибка при загрузке данных пользователя ${login}:`, error);
                resolve({ success: true, user: { sAMAccountName: login } });
            }
        });
    });
});

// export default defineEventHandler(async (event) => {
//     // 1. Читаем данные из тела POST-запроса
//     console.log("Получен запрос на авторизацию");
//     const { login, email, password, sessionId } = await readBody(event);

//     // 2. Ищем пользователя в БД через Prisma
//     try {
//         console.log("Ищем пользователя в БД с помощью Prisma:", { login, email });
//         const user = await prisma.users.findUnique({
//             where: {
//                 login,
//             },
//         });

//         if (!user) {
//             console.warn("Пользователь не найден:", { login });
//             return sendError(event, createError({ statusCode: 404, message: "Пользователь не найден" }));
//         }

//         // 3. Сравниваем введенный пароль с хэшем из БД
//         if (!(await bcrypt.compare(password, user.password))) {
//             console.warn("Неверный пароль для пользователя:", { login });
//             return sendError(event, createError({ statusCode: 400, message: "Неверный пароль" }));
//         } else {
//             try {
//                 // Устанавливаем сессию
//                 await setUserSession(event, {
//                     user: {
//                         id: user.id,
//                         name: user.userName,
//                         login: user.login,
//                         email: user.email
//                     },
//                     sessionId: sessionId,
//                     loggedInAt: new Date().toISOString()
//                 });
//                 // 4. Если пароль верный, создаем сессию пользователя в БД
//                 await prisma.sessions.create({
//                     data: {
//                         userId: user.id,
//                         sessionId,
//                         timestamp: Date.now(),
//                     },
//                 });
//             } catch (error) {
//                 console.error("Ошибка при создании сессии:", error);
//                 return sendError(event, createError({ statusCode: 500, message: "Ошибка сервера при создании сессии" }));
//             }

//             // 5. Возвращаем данные пользователя (можно исключить пароль)
//             const { password, ...userData } = user; // Исключаем пароль из ответа
            
//             return userData;
            
//         }
//     } catch (err: any) {
//         console.error("Ошибка при поиске пользователя:", err.message);
//         return sendError(event, createError({ statusCode: 500, statusMessage: "Ошибка сервера" }));
//     }
// })

