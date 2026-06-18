import { b as defineEventHandler, u as useRuntimeConfig } from '../../../nitro/nitro.mjs';
import ActiveDirectory from 'activedirectory2';
import 'node:http';
import 'node:https';
import 'node:crypto';
import 'stream';
import 'events';
import 'http';
import 'crypto';
import 'buffer';
import 'zlib';
import 'https';
import 'net';
import 'tls';
import 'url';
import 'node:events';
import 'node:buffer';
import 'ioredis';
import 'node:fs';
import 'node:path';
import 'node:url';
import '@iconify/utils';
import 'consola';
import 'ipx';

const getUsers_get = defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const adConfig = {
    url: config.ad.url,
    baseDN: config.ad.baseDN,
    username: config.ad.username,
    password: config.ad.password,
    timeout: config.ad.timeout
  };
  const ad = new ActiveDirectory(adConfig);
  return new Promise((resolve, reject) => {
    const searchOptions = {
      filter: "(objectClass=user)",
      // Только объекты пользователей
      scope: "sub",
      // Поиск во всех подразделениях
      sizeLimit: 500,
      // Ограничиваем количество
      timeLimit: 30,
      // Таймаут в секундах
      attributes: [],
      // attributes: ['cn', 'sn', 'givenName', 'mail', 'sAMAccountName', 'department', 'telephoneNumber', 'title', 'l'],
      includeMembership: [],
      // Обязательное поле
      includeDeleted: false,
      // Обязательное поле
      includeDerivedMembership: []
      // Обязательное поле
    };
    ad.findUsers(searchOptions, (err, users) => {
      if (err) {
        const error = err;
        console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u043E\u0438\u0441\u043A\u0430:", error.message);
        reject({ success: false, error: error.message });
      } else {
        console.log(`\u041D\u0430\u0439\u0434\u0435\u043D\u043E \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u0439: ${(users == null ? void 0 : users.length) || 0}`);
        resolve({
          success: true,
          count: (users == null ? void 0 : users.length) || 0,
          users: users || []
        });
      }
    });
  });
});

export { getUsers_get as default };
//# sourceMappingURL=get-users.get.mjs.map
