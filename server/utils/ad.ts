import ActiveDirectory from 'activedirectory2';

//const config = {
//  url: 'ldap://your-dc.domain.local', // Адрес контроллера домена
//  baseDN: 'DC=domain,DC=local',       // Корневой DN домена
//  username: 'srv-web-auth@domain.local', // Сервисный аккаунт
//  password: 'YourServiceAccountPassword'
//};

// const ad = new ActiveDirectory(config);

const config = useRuntimeConfig();
const ad = new ActiveDirectory({
  url: config.ad.url,
  baseDN: config.ad.baseDN,
  username: config.ad.username,
  password: config.ad.password,
});

export function getUserGroups(sAMAccountName: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    // Метод возвращает массив всех групп, включая вложенные
    ad.getGroupMembershipForUser(sAMAccountName, (err, groups) => {
      if (err) return reject(err);
      if (!groups) return resolve([]);

      // Извлекаем только понятные имена групп (Common Name)
      const groupNames = groups.map((g: any) => g.cn);
      resolve(groupNames);
    });
  });
}
