import { b as defineEventHandler, g as getQuery, a as adCache, u as useRuntimeConfig } from '../../../nitro/nitro.mjs';
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

const getUsersShared_get = defineEventHandler(async (event) => {
  const query = getQuery(event);
  const forceRefresh = query.refresh === "true";
  const cached = await adCache.get();
  const isExpired = await adCache.isExpired();
  if (!forceRefresh && cached && !isExpired) {
    console.log("[\u041A\u042D\u0428] \u0412\u043E\u0437\u0432\u0440\u0430\u0449\u0430\u0435\u043C \u043E\u0431\u0449\u0438\u0435 \u043A\u044D\u0448\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 AD");
    return {
      success: true,
      users: cached.users,
      count: cached.totalCount,
      fromCache: true,
      lastUpdated: cached.lastUpdated
    };
  }
  console.log("[AD] \u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0441\u0432\u0435\u0436\u0438\u0445 \u0434\u0430\u043D\u043D\u044B\u0445 \u0438\u0437 Active Directory...");
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
      scope: "sub",
      sizeLimit: 2e3,
      timeLimit: 60,
      attributes: [],
      includeMembership: [],
      includeDeleted: false,
      includeDerivedMembership: []
    };
    ad.findUsers(searchOptions, async (err, users) => {
      if (err) {
        const error = err;
        console.error("[AD] \u041E\u0448\u0438\u0431\u043A\u0430:", error.message);
        reject({ success: false, error: error.message });
      } else {
        const validUsers = (users || []).filter(
          (user) => user && (user.sAMAccountName || user.cn)
        );
        await adCache.set(validUsers);
        console.log(`[AD] \u0417\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043E ${validUsers.length} \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u0439`);
        resolve({
          success: true,
          users: validUsers,
          count: validUsers.length,
          fromCache: false,
          lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    });
  });
});

export { getUsersShared_get as default };
//# sourceMappingURL=get-users-shared.get.mjs.map
