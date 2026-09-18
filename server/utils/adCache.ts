// server/utils/adCache.ts

import { useStorage } from 'nitropack/runtime';

import type {
  DirectoryUser,
} from '../services/ad-directory.service';


interface ADCache {
  users: DirectoryUser[];

  lastUpdated: string;

  totalCount: number;

  version: number;
}


class ADUserCache {
  private static instance:
    ADUserCache;

  private readonly cacheKey =
    'ad:users:global';


  static getInstance(): ADUserCache {
    if (!ADUserCache.instance) {
      ADUserCache.instance =
        new ADUserCache();
    }

    return ADUserCache.instance;
  }


  /**
   * Получить текущий кэш пользователей AD.
   */
  async get(): Promise<ADCache | null> {
    try {
      const cached =
        await useStorage()
          .getItem<ADCache>(
            this.cacheKey,
          );

      return cached ?? null;
    }
    catch (error) {
      console.error(
        'Ошибка чтения кэша AD:',
        error,
      );

      return null;
    }
  }


  /**
   * Полностью заменить содержимое кэша.
   *
   * ВАЖНО:
   * сюда уже приходит готовый DirectoryUser[].
   *
   * Никакой повторной нормализации
   * LDAP-данных здесь больше нет.
   */
  async set(
    users: DirectoryUser[],
  ): Promise<void> {
    const cache: ADCache = {
      users,

      lastUpdated:
        new Date().toISOString(),

      totalCount:
        users.length,

      version:
        2,
    };


    await useStorage()
      .setItem(
        this.cacheKey,
        cache,
      );


    console.log(
      `[КЭШ] Сохранено ${users.length} пользователей AD`,
    );
  }


  /**
   * Проверяем, устарел ли кэш.
   *
   * Сейчас считаем кэш устаревшим,
   * если ему больше одного часа.
   */
  async isExpired(): Promise<boolean> {
    const cache =
      await this.get();


    if (!cache) {
      return true;
    }


    const lastUpdated =
      new Date(
        cache.lastUpdated,
      );


    if (
      Number.isNaN(
        lastUpdated.getTime(),
      )
    ) {
      return true;
    }


    const ageMs =
      Date.now() -
      lastUpdated.getTime();


    const oneHourMs =
      60 *
      60 *
      1000;


    return (
      ageMs >
      oneHourMs
    );
  }


  /**
   * Полностью очистить кэш.
   */
  async invalidate(): Promise<void> {
    await useStorage()
      .removeItem(
        this.cacheKey,
      );


    console.log(
      '[КЭШ] Кэш AD очищен',
    );
  }


  /**
   * Получить только список пользователей.
   *
   * Удобно для Admin Center.
   */
  async getUsers(): Promise<
    DirectoryUser[]
  > {
    const cache =
      await this.get();


    return (
      cache?.users ??
      []
    );
  }


  /**
   * Найти пользователя в кэше по login.
   *
   * Важно:
   * это только Directory lookup.
   *
   * Для authentication этот метод
   * использовать нельзя.
   */
  async findByLogin(
    login: string,
  ): Promise<
    DirectoryUser | null
  > {
    const normalizedLogin =
      login
        .trim()
        .toLowerCase();


    if (!normalizedLogin) {
      return null;
    }


    const users =
      await this.getUsers();


    return (
      users.find(
        (user) =>
          user.login ===
          normalizedLogin,
      ) ??
      null
    );
  }


  /**
   * Найти пользователя
   * по стабильному objectGUID.
   */
  async findByDirectoryObjectId(
    directoryObjectId: string,
  ): Promise<
    DirectoryUser | null
  > {
    const normalizedId =
      directoryObjectId
        .trim()
        .toLowerCase();


    if (!normalizedId) {
      return null;
    }


    const users =
      await this.getUsers();


    return (
      users.find(
        (user) =>
          user.directoryObjectId ===
          normalizedId,
      ) ??
      null
    );
  }
}


export const adCache =
  ADUserCache.getInstance();