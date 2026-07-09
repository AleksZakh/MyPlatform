export const useADUsers = () => {
  /**
   * Проверяет наличие пользователя в списке AD и возвращает информацию о нём
   * @param users - массив пользователей из AD
   * @param login - логин пользователя
   * @returns объект с результатом проверки и данными пользователя
   */
  const findUser = (
    users: any[],
    login: string
  ): {
    exists: boolean;
    user: any | null;
    message: string;
  } => {
    if (!users?.length || !login) {
      return {
        exists: false,
        user: null,
        message: !users?.length
          ? 'Список пользователей пуст'
          : 'Логин не указан',
      };
    }

    const searchLogin = login.toLowerCase().trim();

    const foundUser = users.find(
      (user) => user.sAMAccountName?.toLowerCase() === searchLogin
    );

    return {
      exists: !!foundUser,
      user: foundUser || null,
      message: foundUser
        ? `Пользователь ${foundUser.sAMAccountName} найден`
        : `Пользователь с логином "${login}" не найден`,
    };
  };

  // Короткая версия для простой проверки
  const isUserExists = (users: any[], login: string): boolean => {
    return findUser(users, login).exists;
  };

  return { findUser, isUserExists };
};
