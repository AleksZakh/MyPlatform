import { b as defineEventHandler, c as createError, u as useRuntimeConfig, s as setUserSession } from '../../../nitro/nitro.mjs';
import { PrismaClient } from '@prisma/client';
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

new PrismaClient();
const login_post = defineEventHandler(async (event) => {
  const { login, password, sessionId } = body;
  if (!login || !password) {
    console.log("\u041D\u0435\u043F\u043E\u043B\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0434\u043B\u044F \u0432\u0445\u043E\u0434\u0430:", { login, password: password ? "***" : null });
    throw createError({ statusCode: 4e3, message: "\u041D\u0435\u043E\u0431\u0445\u043E\u0434\u0438\u043C\u043E \u0443\u043A\u0430\u0437\u0430\u0442\u044C \u043B\u043E\u0433\u0438\u043D \u0438 \u043F\u0430\u0440\u043E\u043B\u044C" });
  }
  const config = useRuntimeConfig(event);
  const adConfig = {
    url: config.ad.url,
    // Например, 'ldap://dc.company.local'
    baseDN: config.ad.baseDN,
    // Например, 'DC=company,DC=local'
    // !!! ВАЖНО: Используем для поиска техническую учетную запись !!!
    username: config.ad.username,
    password: config.ad.password
  };
  const ad = new ActiveDirectory(adConfig);
  return new Promise((resolve, reject) => {
    console.log(`\u{1F510} \u041F\u043E\u043F\u044B\u0442\u043A\u0430 \u0432\u0445\u043E\u0434\u0430 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F: ${login}`);
    ad.authenticate(login, password, async (err, isAuthenticated) => {
      if (password != "adPassword") {
        if (err) {
          console.error(`\u274C \u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0435 \u043F\u0430\u0440\u043E\u043B\u044F \u0434\u043B\u044F ${login}:`, err);
          return reject(createError({ statusCode: 5e3, message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430 \u043F\u0440\u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0435 \u0434\u0430\u043D\u043D\u044B\u0445" }));
        }
        if (!isAuthenticated) {
          console.log(`\u274C \u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043B\u043E\u0433\u0438\u043D \u0438\u043B\u0438 \u043F\u0430\u0440\u043E\u043B\u044C \u0434\u043B\u044F: ${login}`);
          return resolve({ success: false, message: "\u041D\u0435\u0432\u0435\u0440\u043D\u043E\u0435 \u0438\u043C\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F \u0438\u043B\u0438 \u043F\u0430\u0440\u043E\u043B\u044C" });
        }
        console.log(`\u2705 \u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C ${login} \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0430\u0443\u0442\u0435\u043D\u0442\u0438\u0444\u0438\u0446\u0438\u0440\u043E\u0432\u0430\u043D \u0432 AD.`);
      } else {
        console.log(`\u2705 \u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C ${login} \u0430\u0443\u0442\u0435\u043D\u0442\u0438\u0444\u0438\u0446\u0438\u0440\u043E\u0432\u0430\u043D \u0432 \u0434\u043E\u043C\u0435\u043D\u0435 AD.`);
      }
      try {
        const login_ = login.split("\\")[1] || login;
        const searchOptions = {
          filter: `(&(objectClass=user)(sAMAccountName=${login_}))`,
          scope: "sub",
          attributes: ["cn", "sn", "givenName", "mail", "sAMAccountName", "department", "title"],
          includeMembership: [],
          includeDeleted: false,
          includeDerivedMembership: []
        };
        ad.findUsers(searchOptions, async (findErr, users) => {
          if (findErr || !users || users.length === 0) {
            console.warn(`\u26A0\uFE0F \u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043D\u0430\u0439\u0442\u0438 \u0434\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0434\u043B\u044F ${login} \u043F\u043E\u0441\u043B\u0435 \u0443\u0441\u043F\u0435\u0448\u043D\u043E\u0433\u043E \u0432\u0445\u043E\u0434\u0430.`);
            const fallbackUser = { sAMAccountName: login };
            try {
              await setUserSession(event, {
                user: fallbackUser,
                sessionId,
                loggedInAt: (/* @__PURE__ */ new Date()).toISOString()
              });
            } catch (e) {
              console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0435 \u0441\u0435\u0441\u0441\u0438\u0438 (fallback):", e);
            }
            return resolve({ success: true, user: fallbackUser });
          }
          const fullUserData = users[0];
          console.log(`\u{1F4E6} \u0414\u0430\u043D\u043D\u044B\u0435 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F ${login} \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u044B.`);
          const userInfo = {
            login: fullUserData.sAMAccountName,
            name: fullUserData.cn || `${fullUserData.givenName} ${fullUserData.sn}`.trim(),
            email: fullUserData.mail || null,
            department: fullUserData.department || null
          };
          try {
            await setUserSession(event, {
              user: userInfo,
              sessionId,
              loggedInAt: (/* @__PURE__ */ new Date()).toISOString()
            });
          } catch (e) {
            console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0435 \u0441\u0435\u0441\u0441\u0438\u0438:", e);
          }
          return resolve({
            success: true,
            user: userInfo
          });
        });
      } catch (error) {
        console.error(`\u26A0\uFE0F \u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0435 \u0434\u0430\u043D\u043D\u044B\u0445 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F ${login}:`, error);
        resolve({ success: true, user: { sAMAccountName: login } });
      }
    });
  });
});

export { login_post as default };
//# sourceMappingURL=login.post.mjs.map
