import { b as defineEventHandler, u as useRuntimeConfig, g as getQuery } from '../../../nitro/nitro.mjs';
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

const search_get = defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const query = getQuery(event);
  const searchFilter = query.filter || "(objectClass=*)";
  const searchBase = query.baseDN || config.ad.baseDN;
  const adConfig = {
    url: config.ad.url,
    baseDN: searchBase,
    username: config.ad.username,
    password: config.ad.password,
    timeout: config.ad.timeout
  };
  const ad = new ActiveDirectory(adConfig);
  return new Promise((resolve, reject) => {
    const searchOptions = {
      filter: searchFilter,
      scope: query.scope || "sub",
      sizeLimit: parseInt(query.limit) || 100,
      attributes: ["*"]
      // Все атрибуты
    };
    ad.find(searchOptions, (err, results) => {
      var _a, _b, _c;
      if (err) {
        const error = err;
        console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u043E\u0438\u0441\u043A\u0430:", error.message);
        reject({ success: false, error: error.message });
      } else {
        console.log(`\u041D\u0430\u0439\u0434\u0435\u043D\u043E \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u0432: ${((_a = results == null ? void 0 : results.users) == null ? void 0 : _a.length) || 0}`);
        console.log("\u041F\u0440\u0438\u043C\u0435\u0440 \u043F\u0435\u0440\u0432\u043E\u0433\u043E \u043E\u0431\u044A\u0435\u043A\u0442\u0430:", (_b = results == null ? void 0 : results.users) == null ? void 0 : _b[0]);
        resolve({
          success: true,
          count: ((_c = results == null ? void 0 : results.users) == null ? void 0 : _c.length) || 0,
          results: results || []
        });
      }
    });
  });
});

export { search_get as default };
//# sourceMappingURL=search.get.mjs.map
