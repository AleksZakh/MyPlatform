import { d as defineTask, u as useRuntimeConfig } from '../nitro/nitro.mjs';
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

const refreshAdCache = defineTask({
  meta: {
    name: "ad:refresh-ad-cache",
    description: "\u041E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0435 \u043A\u044D\u0448\u0430 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u0439 Active Directory"
    // removed unsupported "version" property — TaskMeta does not include it
  },
  async run(payload) {
    const startTime = Date.now();
    console.log(`\u{1F504} [TASK] \u0417\u0430\u043F\u0443\u0441\u043A \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F \u043A\u044D\u0448\u0430 AD \u0432 ${(/* @__PURE__ */ new Date()).toISOString()}`);
    try {
      const config = useRuntimeConfig();
      const adConfig = {
        url: config.ad.url,
        baseDN: config.ad.baseDN,
        username: config.ad.username,
        password: config.ad.password,
        timeout: config.ad.timeout || 3e4
      };
      const ad = new ActiveDirectory(adConfig);
      const users = await new Promise((resolve, reject) => {
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
        ad.findUsers(searchOptions, (err, users2) => {
          if (err) reject(err);
          else resolve(users2 || []);
        });
      });
      const { adCache } = await import('../nitro/nitro.mjs').then(function (n) { return n.U; });
      await adCache.set(users);
      const duration = Date.now() - startTime;
      console.log(`\u2705 [TASK] \u041A\u044D\u0448 AD \u043E\u0431\u043D\u043E\u0432\u043B\u0451\u043D: ${users.length} \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u0439 \u0437\u0430 ${duration}ms`);
      return {
        result: "success",
        data: {
          userCount: users.length,
          durationMs: duration,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`\u274C [TASK] \u041E\u0448\u0438\u0431\u043A\u0430 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F \u043A\u044D\u0448\u0430 AD: ${error.message}`);
      return {
        result: "error",
        error: error.message,
        durationMs: duration
      };
    }
  }
});

export { refreshAdCache as default };
//# sourceMappingURL=refresh-ad-cache.mjs.map
