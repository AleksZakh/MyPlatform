// server/services/ad-directory.service.ts

import ActiveDirectory from 'activedirectory2';

import {
  createError,
  type H3Event,
} from 'h3';

import {
  useRuntimeConfig,
} from '#imports';


/**
 * ============================================================
 * Единый сервис работы с Active Directory
 * ============================================================
 *
 * Его задачи:
 *
 * 1. Создавать настроенный AD client.
 * 2. Проверять DOMAIN login/password.
 * 3. Получать одного пользователя из AD.
 * 4. Получать каталог пользователей.
 * 5. Приводить "сырой" LDAP-объект к единой модели DirectoryUser.
 *
 *
 * ВАЖНО:
 *
 * Этот сервис НЕ:
 *
 * - создаёт User в БД;
 * - назначает permissions;
 * - создаёт Nuxt session;
 * - принимает решения об авторизации в Space.
 *
 * За это отвечают другие уровни:
 *
 * AD
 *   ↓
 * ad-directory.service.ts
 *   ↓
 * ensureDomainUser()
 *   ↓
 * app_users
 *   ↓
 * session / permissions
 */


/**
 * ============================================================
 * Атрибуты пользователя AD, необходимые Space
 * ============================================================
 *
 * Один и тот же набор используется:
 *
 * - Kerberos login;
 * - password login;
 * - обновление AD cache;
 * - Admin Center.
 */
export const DIRECTORY_USER_ATTRIBUTES = [
  'objectGUID',

  'dn',
  'distinguishedName',

  'userPrincipalName',
  'sAMAccountName',

  'cn',
  'displayName',
  'givenName',
  'sn',

  'mail',

  'department',
  'title',

  'telephoneNumber',

  /**
   * Пригодится позже для определения
   * отключённых DOMAIN-учёток.
   */
  'userAccountControl',
] as const;


/**
 * ============================================================
 * Сырой объект из activedirectory2
 * ============================================================
 *
 * Тип намеренно достаточно свободный.
 *
 * LDAP/activedirectory2 может возвращать некоторые
 * атрибуты в разных представлениях.
 */
export interface RawDirectoryUser {
  objectGUID?: unknown;

  dn?: unknown;
  distinguishedName?: unknown;

  userPrincipalName?: unknown;
  sAMAccountName?: unknown;

  cn?: unknown;
  displayName?: unknown;
  givenName?: unknown;
  sn?: unknown;

  mail?: unknown;

  department?: unknown;
  title?: unknown;

  telephoneNumber?: unknown;

  userAccountControl?: unknown;

  [key: string]: unknown;
}


/**
 * ============================================================
 * Нормализованный пользователь Directory
 * ============================================================
 *
 * Именно с этой структурой дальше должен работать Space.
 *
 * Остальной код приложения не должен знать,
 * как именно activedirectory2 вернул поля LDAP.
 */
export interface DirectoryUser {
  /**
   * Стабильный ID объекта Active Directory.
   *
   * В идеальном случае — canonical objectGUID:
   *
   * xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   */
  directoryObjectId: string | null;

  /**
   * sAMAccountName.
   *
   * Например:
   *
   * ivanov_ii
   */
  login: string;

  /**
   * Например:
   *
   * ivanov_ii@corp.example.ru
   */
  userPrincipalName: string | null;

  /**
   * CN / displayName / givenName + sn.
   */
  fullName: string;

  email: string | null;

  department: string | null;

  position: string | null;

  telephoneNumber: string | null;

  distinguishedName: string | null;

  /**
   * AD userAccountControl.
   *
   * Пока просто сохраняем значение.
   * В будущем можно использовать для Admin Center.
   */
  userAccountControl: number | null;

  /**
   * Вычисляется из USER_ACCOUNT_DISABLED flag.
   */
  accountDisabled: boolean;
}


/**
 * ============================================================
 * Конфигурация AD
 * ============================================================
 */

interface DirectoryConfig {
  url: string;

  baseDN: string;

  username: string;

  password: string;

  timeout: number;

  /**
   * Опционально.
   *
   * Если позже появится:
   *
   * runtimeConfig.ad.userPrincipalSuffix
   *
   * используем его.
   *
   * Иначе получаем suffix из baseDN.
   */
  userPrincipalSuffix: string;
}


/**
 * ============================================================
 * normalizeText()
 * ============================================================
 */

const normalizeText = (
  value: unknown,
): string | null => {
  if (typeof value === 'string') {
    const normalized =
      value.trim();

    return normalized || null;
  }

  /**
   * Некоторые LDAP-атрибуты теоретически
   * могут приходить массивом.
   */
  if (Array.isArray(value)) {
    for (const item of value) {
      const normalized =
        normalizeText(item);

      if (normalized) {
        return normalized;
      }
    }
  }

  return null;
};


/**
 * ============================================================
 * normalizeLogin()
 * ============================================================
 *
 * Поддерживаем:
 *
 * ivanov
 * ivanov@corp.example.ru
 * CORP\ivanov
 *
 * Результат:
 *
 * ivanov
 */
export const normalizeDomainLogin = (
  value: unknown,
): string => {
  if (typeof value !== 'string') {
    return '';
  }

  let login =
    value.trim();

  if (login.includes('\\')) {
    const parts =
      login.split('\\');

    login =
      parts[parts.length - 1] ||
      '';
  }

  if (login.includes('@')) {
    login =
      login.split('@')[0] ||
      '';
  }

  return login
    .trim()
    .toLowerCase();
};


/**
 * ============================================================
 * normalizeEmail()
 * ============================================================
 */

const normalizeEmail = (
  value: unknown,
): string | null => {
  const email =
    normalizeText(value);

  return email
    ? email.toLowerCase()
    : null;
};


/**
 * ============================================================
 * parseUserAccountControl()
 * ============================================================
 */

const parseUserAccountControl = (
  value: unknown,
): number | null => {
  if (
    typeof value === 'number' &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed =
      Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};


/**
 * ============================================================
 * objectGUID helpers
 * ============================================================
 *
 * objectGUID в LDAP является бинарным 16-byte значением.
 *
 * Преобразуем его в обычный GUID:
 *
 * xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 */

const bufferToGuid = (
  buffer: Buffer,
): string | null => {
  if (buffer.length !== 16) {
    return null;
  }

  const hex = (
    indexes: number[],
  ): string => {
    return indexes
      .map(
        (index) =>
          buffer[index]!
            .toString(16)
            .padStart(2, '0'),
      )
      .join('');
  };

  return [
    hex([3, 2, 1, 0]),

    hex([5, 4]),

    hex([7, 6]),

    hex([8, 9]),

    hex([
      10,
      11,
      12,
      13,
      14,
      15,
    ]),
  ].join('-');
};


/**
 * Приводим objectGUID к стабильной строке.
 */
export const normalizeDirectoryObjectId = (
  value: unknown,
): string | null => {
  if (!value) {
    return null;
  }

  /**
   * activedirectory2 / ldapjs может вернуть Buffer.
   */
  if (Buffer.isBuffer(value)) {
    return (
      bufferToGuid(value) ??
      `b64:${value.toString('base64')}`
    );
  }

  /**
   * Uint8Array.
   */
  if (value instanceof Uint8Array) {
    const buffer =
      Buffer.from(value);

    return (
      bufferToGuid(buffer) ??
      `b64:${buffer.toString('base64')}`
    );
  }

  /**
   * Иногда сериализованный Buffer может иметь вид:
   *
   * {
   *   type: "Buffer",
   *   data: [...]
   * }
   */
  if (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    'data' in value
  ) {
    const candidate =
      value as {
        type?: unknown;
        data?: unknown;
      };

    if (
      candidate.type === 'Buffer' &&
      Array.isArray(candidate.data)
    ) {
      try {
        const buffer =
          Buffer.from(
            candidate.data as number[],
          );

        return (
          bufferToGuid(buffer) ??
          `b64:${buffer.toString('base64')}`
        );
      }
      catch {
        return null;
      }
    }
  }

  /**
   * Возможно библиотека уже преобразовала GUID в строку.
   */
  if (typeof value === 'string') {
    const normalized =
      value
        .trim()
        .replace(/[{}]/g, '')
        .toLowerCase();

    return normalized || null;
  }

  return null;
};


/**
 * ============================================================
 * normalizeDirectoryUser()
 * ============================================================
 */

export const normalizeDirectoryUser = (
  rawUser: RawDirectoryUser,
): DirectoryUser | null => {
  const login =
    normalizeDomainLogin(
      rawUser.sAMAccountName,
    );

  /**
   * Без sAMAccountName пользователь
   * для нашей системы бесполезен.
   */
  if (!login) {
    return null;
  }

  const givenName =
    normalizeText(
      rawUser.givenName,
    );

  const surname =
    normalizeText(
      rawUser.sn,
    );

  const generatedFullName =
    [
      givenName,
      surname,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

  const fullName =
    (
      normalizeText(rawUser.displayName) ??
      normalizeText(rawUser.cn) ??
      generatedFullName
    ) ||
    login;

  const userAccountControl =
    parseUserAccountControl(
      rawUser.userAccountControl,
    );

  /**
   * ADS_UF_ACCOUNTDISABLE = 0x0002
   */
  const accountDisabled =
    userAccountControl !== null
      ? (
          userAccountControl &
          0x0002
        ) !== 0
      : false;

  return {
    directoryObjectId:
      normalizeDirectoryObjectId(
        rawUser.objectGUID,
      ),

    login,

    userPrincipalName:
      normalizeText(
        rawUser.userPrincipalName,
      ),

    fullName,

    email:
      normalizeEmail(
        rawUser.mail,
      ),

    department:
      normalizeText(
        rawUser.department,
      ),

    position:
      normalizeText(
        rawUser.title,
      ),

    telephoneNumber:
      normalizeText(
        rawUser.telephoneNumber,
      ),

    distinguishedName:
      normalizeText(
        rawUser.distinguishedName,
      ) ??
      normalizeText(
        rawUser.dn,
      ),

    userAccountControl,

    accountDisabled,
  };
};


/**
 * ============================================================
 * domainFromBaseDN()
 * ============================================================
 *
 * DC=corp,DC=example,DC=ru
 *
 * ->
 *
 * corp.example.ru
 */
const domainFromBaseDN = (
  baseDN: string,
): string => {
  return baseDN
    .split(',')
    .map(
      (part) =>
        part.trim(),
    )
    .filter(
      (part) =>
        /^DC=/i.test(part),
    )
    .map(
      (part) =>
        part.replace(
          /^DC=/i,
          '',
        ),
    )
    .filter(Boolean)
    .join('.');
};


/**
 * ============================================================
 * getDirectoryConfig()
 * ============================================================
 */

const getDirectoryConfig = (
  event?: H3Event,
): DirectoryConfig => {
  const config =
    event
      ? useRuntimeConfig(event)
      : useRuntimeConfig();

  const adConfig =
    config.ad as {
      url?: unknown;

      baseDN?: unknown;

      username?: unknown;

      password?: unknown;

      timeout?: unknown;

      userPrincipalSuffix?: unknown;
    };

  const url =
    normalizeText(
      adConfig?.url,
    );

  const baseDN =
    normalizeText(
      adConfig?.baseDN,
    );

  const username =
    normalizeText(
      adConfig?.username,
    );

  const password =
  typeof adConfig?.password === 'string'
    ? adConfig.password
    : '';

  if (
    !url ||
    !baseDN ||
    !username ||
    !password
  ) {
    throw createError({
      statusCode: 500,

      statusMessage:
        'Active Directory configuration error',

      message:
        'Не заполнена конфигурация Active Directory.',
    });
  }

  const rawTimeout =
    Number(
      adConfig?.timeout ??
      5000,
    );

  const timeout =
    Number.isFinite(rawTimeout) &&
    rawTimeout > 0
      ? rawTimeout
      : 5000;

  const configuredSuffix =
    normalizeText(
      adConfig?.userPrincipalSuffix,
    );

  const userPrincipalSuffix =
    configuredSuffix ??
    domainFromBaseDN(baseDN);

  if (!userPrincipalSuffix) {
    throw createError({
      statusCode: 500,

      statusMessage:
        'Active Directory domain configuration error',

      message:
        'Не удалось определить DNS-домен Active Directory.',
    });
  }

  return {
    url,
    baseDN,
    username,
    password,
    timeout,
    userPrincipalSuffix,
  };
};


/**
 * ============================================================
 * createAdClient()
 * ============================================================
 *
 * Все места приложения создают AD client одинаково.
 */
export const createAdClient = (
  event?: H3Event,
): ActiveDirectory => {
  const config =
    getDirectoryConfig(event);

  return new ActiveDirectory({
    url:
      config.url,

    baseDN:
      config.baseDN,

    username:
      config.username,

    password:
      config.password,

    timeout:
      config.timeout,

    attributes: {
      user: [
        ...DIRECTORY_USER_ATTRIBUTES,
      ],

      group: [
        'dn',
        'cn',
        'description',
        'distinguishedName',
        'objectCategory',
      ],
    },
  } as any);
};


/**
 * ============================================================
 * buildBindUsername()
 * ============================================================
 *
 * Вход:
 *
 * ivanov
 *
 * ->
 *
 * ivanov@corp.example.ru
 *
 *
 * Если пользователь уже передал:
 *
 * CORP\ivanov
 *
 * или:
 *
 * ivanov@corp.example.ru
 *
 * ничего не меняем.
 */
const buildBindUsername = (
  rawLogin: string,
  event?: H3Event,
): string => {
  const login =
    rawLogin.trim();

  if (
    login.includes('@') ||
    login.includes('\\')
  ) {
    return login;
  }

  const normalizedLogin =
    normalizeDomainLogin(login);

    if (!normalizedLogin) {
    return '';
    }

  const config =
    getDirectoryConfig(event);

  return (
    `${normalizedLogin}@` +
    config.userPrincipalSuffix
  );
};


/**
 * ============================================================
 * isInvalidCredentialsError()
 * ============================================================
 */

const isInvalidCredentialsError = (
  error: any,
): boolean => {
  return (
    error?.code === 49 ||
    error?.name ===
      'InvalidCredentialsError' ||
    String(
      error?.message || '',
    )
      .toLowerCase()
      .includes(
        'invalid credentials',
      )
  );
};


/**
 * ============================================================
 * authenticateDomainUser()
 * ============================================================
 *
 * Проверяет пароль непосредственно в AD.
 *
 * КЭШ ЗДЕСЬ НЕ ИСПОЛЬЗУЕМ.
 */
export const authenticateDomainUser =
  async (
    rawLogin: string,
    password: string,
    event?: H3Event,
  ): Promise<boolean> => {
    if (
      !rawLogin?.trim() ||
      !password
    ) {
      return false;
    }

    const ad =
      createAdClient(event);

    const bindUsername =
      buildBindUsername(
        rawLogin,
        event,
      );

    return await new Promise<boolean>(
      (
        resolve,
        reject,
      ) => {
        ad.authenticate(
          bindUsername,
          password,

          (
            error: any,
            authenticated: boolean,
          ) => {
            if (error) {
              /**
               * Неверный пароль —
               * штатный отрицательный ответ.
               */
              if (
                isInvalidCredentialsError(
                  error,
                )
              ) {
                resolve(false);

                return;
              }

              /**
               * LDAP / сеть / AD error.
               *
               * Не маскируем под
               * "неправильный пароль".
               */
              reject(error);

              return;
            }

            resolve(
              Boolean(
                authenticated,
              ),
            );
          },
        );
      },
    );
  };


/**
 * ============================================================
 * findDomainUser()
 * ============================================================
 *
 * Получаем одного пользователя из AD.
 */
export const findDomainUser =
  async (
    rawLogin: string,
    event?: H3Event,
  ): Promise<DirectoryUser | null> => {
    const login =
      normalizeDomainLogin(
        rawLogin,
      );

    if (!login) {
      return null;
    }

    const ad =
      createAdClient(event);

    const rawUser =
      await new Promise<
        RawDirectoryUser | null
      >(
        (
          resolve,
          reject,
        ) => {
          ad.findUser(
                login,

                (
                    error: any,
                    user: object,
                ) => {
                    if (error) {
                    reject(error);

                    return;
                    }

                    resolve(
                    user
                        ? user as RawDirectoryUser
                        : null,
                    );
                },
                );
        },
      );

    if (!rawUser) {
      return null;
    }

    return normalizeDirectoryUser(
      rawUser,
    );
  };


/**
 * ============================================================
 * listDomainUsers()
 * ============================================================
 *
 * Получаем каталог пользователей,
 * который затем можно:
 *
 * - положить в AD cache;
 * - использовать в Admin Center.
 *
 *
 * ВАЖНО:
 *
 * baseDN уже ограничивает область поиска каталогом
 * сотрудников компании.
 *
 * Поэтому технические учётные записи из другого OU
 * сюда попадать не должны.
 */
export const listDomainUsers =
  async (
    event?: H3Event,
  ): Promise<DirectoryUser[]> => {
    const ad =
      createAdClient(event);

    const rawUsers =
      await new Promise<
        RawDirectoryUser[]
      >(
        (
          resolve,
          reject,
        ) => {
          const searchOptions = {
            /**
             * Не просто objectClass=user.
             *
             * objectCategory=person дополнительно
             * ограничивает выборку пользовательскими
             * объектами.
             */
            filter:
              '(&(objectCategory=person)(objectClass=user))',

            scope:
              'sub' as const,

            /**
             * Намеренно НЕ устанавливаем
             * sizeLimit: 2000.
             *
             * Не хотим зашивать количество
             * сотрудников в код приложения.
             */
            timeLimit:
              60,

            attributes: [
              ...DIRECTORY_USER_ATTRIBUTES,
            ],

            includeMembership:
              [],

            includeDeleted:
              false,

            includeDerivedMembership:
              [],
          };

          ad.findUsers(
            searchOptions as any,

            (
                error: any,
                users: object[],
            ) => {
                if (error) {
                reject(error);

                return;
                }

                resolve(
                (users ?? []) as RawDirectoryUser[],
                );
            },
            );
        },
      );

    /**
     * Нормализуем пользователей.
     */
    const normalizedUsers =
      rawUsers
        .map(
          (user) =>
            normalizeDirectoryUser(
              user,
            ),
        )
        .filter(
          (
            user,
          ): user is DirectoryUser =>
            user !== null,
        );

    /**
     * На всякий случай удаляем возможные
     * дубликаты.
     *
     * Сначала используем objectGUID,
     * если его нет — login.
     */
    const uniqueUsers =
      new Map<
        string,
        DirectoryUser
      >();

    for (
      const user
      of normalizedUsers
    ) {
      const key =
        user.directoryObjectId
          ? (
              'id:' +
              user.directoryObjectId
            )
          : (
              'login:' +
              user.login
            );

      uniqueUsers.set(
        key,
        user,
      );
    }

    return [
      ...uniqueUsers.values(),
    ];
  };