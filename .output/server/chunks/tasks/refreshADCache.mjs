import { d as defineTask, u as useRuntimeConfig, a as adCache } from '../nitro/nitro.mjs';
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

const refreshADCache = defineTask({
  meta: {
    name: "refresh-ad-cache",
    description: "\u041E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0435 \u043A\u044D\u0448\u0430 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u0439 AD"
  },
  async run() {
    console.log("[TASK] \u041D\u0430\u0447\u0430\u043B\u043E \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F \u043A\u044D\u0448\u0430 AD...");
    const config = useRuntimeConfig();
    const ad = new ActiveDirectory({
      url: config.ad.url,
      baseDN: config.ad.baseDN,
      username: config.ad.username,
      password: config.ad.password
    });
    return new Promise((resolve) => {
      const searchOptions = {
        filter: "(objectClass=user)",
        scope: "sub",
        sizeLimit: 2e3,
        timeLimit: 60,
        attributes: []
      };
      ad.findUsers(searchOptions, async (err, users) => {
        if (err) {
          console.error("[TASK] \u041E\u0448\u0438\u0431\u043A\u0430 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F \u043A\u044D\u0448\u0430:", err);
          const errorMessage = err instanceof Error ? err.message : String(err);
          resolve({ result: "error", message: errorMessage });
        } else {
          await adCache.set(users || []);
          console.log(`[TASK] \u041A\u044D\u0448 \u043E\u0431\u043D\u043E\u0432\u043B\u0451\u043D: ${users == null ? void 0 : users.length} \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u0439`);
          resolve({ result: "success", userCount: users == null ? void 0 : users.length });
        }
      });
    });
  }
});

export { refreshADCache as default };
//# sourceMappingURL=refreshADCache.mjs.map
