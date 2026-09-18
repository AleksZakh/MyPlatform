import {
  Prisma,
  UserAuthType,
  UserStatus,
  type User,
} from '@prisma/client';

import { createError } from 'h3';

import {
  type DirectoryUser,
} from './ad-directory.service';

// Если ваш singleton Prisma импортируется по другому пути,
// поправьте только эту строку.
import { prisma } from '../utils/prisma';


type DatabaseClient =
  typeof prisma |
  Prisma.TransactionClient;


/**
 * Приводим login к единому виду.
 */
function normalizeLogin(
  login: string,
): string {
  return login
    .trim()
    .toLowerCase();
}


/**
 * Email из AD уже нормализуется в directory service,
 * но здесь оставляем защитный слой.
 */
function normalizeEmail(
  email: string | null,
): string | null {
  if (!email) {
    return null;
  }

  const normalized =
    email
      .trim()
      .toLowerCase();

  return normalized || null;
}


/**
 * Создаёт локального DOMAIN-пользователя
 * либо синхронизирует его профиль с Active Directory.
 *
 * ВАЖНО:
 *
 * AD управляет:
 * - login
 * - directoryObjectId
 * - email
 * - fullName
 * - position
 *
 * Space управляет:
 * - status
 * - departmentId
 * - permissions
 *
 * Поэтому status / departmentId / permissions
 * здесь никогда не изменяются.
 */
export async function ensureDomainUser(
  directoryUser: DirectoryUser,
  db: DatabaseClient = prisma,
): Promise<User> {
  const login =
    normalizeLogin(
      directoryUser.login,
    );

  const directoryObjectId =
    directoryUser.directoryObjectId
      ?.trim()
      .toLowerCase();


  if (!login) {
    throw createError({
      statusCode: 500,
      statusMessage:
        'DOMAIN user has no login',
    });
  }


  if (!directoryObjectId) {
    throw createError({
      statusCode: 500,
      statusMessage:
        `DOMAIN user "${login}" has no directoryObjectId`,
    });
  }


  const email =
    normalizeEmail(
      directoryUser.email,
    );

  const fullName =
    directoryUser.fullName
      ?.trim() ||
    null;

  const position =
    directoryUser.position
      ?.trim() ||
    null;


  /**
   * --------------------------------------------------------
   * 1. Ищем пользователя по objectGUID и login независимо.
   * --------------------------------------------------------
   *
   * Нельзя просто сделать OR + findFirst(),
   * потому что теоретически objectGUID и login
   * могут указывать на две разные локальные записи.
   */
  const [
    userByDirectoryObjectId,
    userByLogin,
  ] =
    await Promise.all([
      db.user.findUnique({
        where: {
          directoryObjectId,
        },
      }),

      db.user.findUnique({
        where: {
          login,
        },
      }),
    ]);


  /**
   * --------------------------------------------------------
   * 2. Защита от конфликта идентичности.
   * --------------------------------------------------------
   */
  if (
    userByDirectoryObjectId &&
    userByLogin &&
    userByDirectoryObjectId.id !==
      userByLogin.id
  ) {
    throw createError({
      statusCode: 409,
      statusMessage:
        `DOMAIN identity conflict for "${login}"`,
    });
  }


  const existingUser =
    userByDirectoryObjectId ??
    userByLogin;


  /**
   * --------------------------------------------------------
   * 3. Проверяем уникальность email.
   * --------------------------------------------------------
   *
   * Это особенно важно, поскольку email общий
   * и для DOMAIN, и для EXTERNAL пользователей.
   */
  if (email) {
    const userByEmail =
      await db.user.findUnique({
        where: {
          email,
        },
      });


    if (
      userByEmail &&
      userByEmail.id !==
        existingUser?.id
    ) {
      throw createError({
        statusCode: 409,
        statusMessage:
          `Email "${email}" already belongs to another user`,
      });
    }
  }


  try {
    /**
     * ------------------------------------------------------
     * 4. Пользователь уже существует.
     * ------------------------------------------------------
     */
    if (existingUser) {
      if (
        existingUser.authType !==
        UserAuthType.DOMAIN
      ) {
        throw createError({
          statusCode: 409,
          statusMessage:
            `Login "${login}" belongs to a non-DOMAIN user`,
        });
      }


      /**
       * Если пользователь был найден по login,
       * но уже имеет другой objectGUID,
       * автоматически перепривязывать его нельзя.
       */
      if (
        existingUser.directoryObjectId &&
        existingUser.directoryObjectId !==
          directoryObjectId
      ) {
        throw createError({
          statusCode: 409,
          statusMessage:
            `directoryObjectId conflict for "${login}"`,
        });
      }


      /**
       * Не делаем UPDATE при каждом логине,
       * если профиль фактически не изменился.
       */
      const profileChanged =
        existingUser.login !== login ||
        existingUser.directoryObjectId !==
          directoryObjectId ||
        existingUser.email !== email ||
        existingUser.fullName !==
          fullName ||
        existingUser.position !==
          position;


      if (!profileChanged) {
        return existingUser;
      }


      return await db.user.update({
        where: {
          id: existingUser.id,
        },

        data: {
          login,
          directoryObjectId,
          email,
          fullName,
          position,

          /**
           * Здесь намеренно НЕТ:
           *
           * status
           * departmentId
           * permissions
           */
        },
      });
    }


    /**
     * ------------------------------------------------------
     * 5. Первый вход DOMAIN-пользователя.
     * ------------------------------------------------------
     */
    return await db.user.create({
      data: {
        authType:
          UserAuthType.DOMAIN,

        status:
          UserStatus.ACTIVE,

        login,

        directoryObjectId,

        email,

        fullName,

        position,

        /**
         * departmentId пока не определяем автоматически.
         *
         * AD.department ещё предстоит связать
         * с нашими Department через mapping.
         */
      },
    });
  }
  catch (error) {
    /**
     * Prisma unique constraint.
     *
     * Оставляем последнюю защиту от race condition:
     * например два одновременных первых входа
     * одного DOMAIN-пользователя.
     */
    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw createError({
        statusCode: 409,
        statusMessage:
          `DOMAIN user "${login}" conflicts with an existing account`,
      });
    }

    throw error;
  }
}


/**
 * Проверка, разрешён ли DOMAIN-пользователю вход в Space.
 *
 * Эта функция НЕ изменяет статус пользователя.
 */
export function assertDomainUserCanLogin(
  directoryUser: DirectoryUser,
  appUser: User,
): void {
  /**
   * Пользователь отключён непосредственно в AD.
   */
  if (
    directoryUser.accountDisabled
  ) {
    throw createError({
      statusCode: 403,
      statusMessage:
        'Active Directory account is disabled',
    });
  }


  /**
   * Пользователь заблокирован средствами Space.
   *
   * ВАЖНО:
   * успешная авторизация в AD НЕ должна
   * автоматически возвращать ему ACTIVE.
   */
  if (
    appUser.status !==
    UserStatus.ACTIVE
  ) {
    throw createError({
      statusCode: 403,
      statusMessage:
        'User account is not active',
    });
  }
}