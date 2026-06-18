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

const domainConnection_get = defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const adConfig = {
    url: config.ad.url,
    baseDN: config.ad.baseDN,
    username: config.ad.username,
    password: config.ad.password,
    timeout: config.ad.timeout
  };
  const startTime = Date.now();
  const ad = new ActiveDirectory(adConfig);
  const result = {
    success: false,
    message: "",
    details: {},
    elapsedMs: 0,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  console.log("=== \u0422\u0415\u0421\u0422 \u041F\u041E\u0414\u041A\u041B\u042E\u0427\u0415\u041D\u0418\u042F \u041A \u0414\u041E\u041C\u0415\u041D\u0423 (activedirectory2) ===");
  console.log(`\u{1F4E1} \u0410\u0434\u0440\u0435\u0441: ${adConfig.url}`);
  console.log(`\u{1F4C1} Base DN: ${adConfig.baseDN}`);
  console.log(`\u{1F464} \u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C: ${adConfig.username}`);
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      result.message = "\u274C \u0422\u0430\u0439\u043C\u0430\u0443\u0442 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F \u043A \u0434\u043E\u043C\u0435\u043D\u0443";
      result.details = { error: "Connection timeout" };
      console.error(result.message);
      resolve(result);
    }, adConfig.timeout + 1e3);
    ad.authenticate(adConfig.username, adConfig.password, (err, isAuthenticated) => {
      clearTimeout(timeoutId);
      result.elapsedMs = Date.now() - startTime;
      const error = err;
      if (err) {
        result.success = false;
        result.message = `\u274C \u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F \u043A \u0434\u043E\u043C\u0435\u043D\u0443: ${error.message || error}`;
        result.details = {
          error: error.message || error,
          code: error.code || "UNKNOWN"
        };
        console.error(result.message);
        if (error.code === "ECONNREFUSED") {
          console.error("\u{1F4A1} \u041A\u043E\u043D\u0442\u0440\u043E\u043B\u043B\u0435\u0440 \u0434\u043E\u043C\u0435\u043D\u0430 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0438\u043B\u0438 \u043F\u043E\u0440\u0442 389 \u0437\u0430\u043A\u0440\u044B\u0442");
          console.error("   \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435: \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E\u0441\u0442\u044C \u0441\u0435\u0440\u0432\u0435\u0440\u0430, firewall, \u0441\u043B\u0443\u0436\u0431\u0443 LDAP");
        } else if (error.code === "ENOTFOUND") {
          console.error("\u{1F4A1} DNS \u0438\u043C\u044F \u043D\u0435 \u0440\u0430\u0437\u0440\u0435\u0448\u0430\u0435\u0442\u0441\u044F");
          console.error(`   \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435: \u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u043E\u0441\u0442\u044C URL "${adConfig.url}"`);
        } else if (error.code === "LDAP_INVALID_CREDENTIALS") {
          console.error("\u{1F4A1} \u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0435 \u0443\u0447\u0435\u0442\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435");
          console.error(`   \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435: AD_USERNAME="${adConfig.username}" \u0438 \u043F\u0430\u0440\u043E\u043B\u044C`);
        } else if (error.code === "ETIMEOUT") {
          console.error("\u{1F4A1} \u0422\u0430\u0439\u043C\u0430\u0443\u0442 \u0441\u043E\u0435\u0434\u0438\u043D\u0435\u043D\u0438\u044F");
          console.error("   \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435: \u0441\u0435\u0442\u0435\u0432\u0443\u044E \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E\u0441\u0442\u044C \u0438 \u0443\u0432\u0435\u043B\u0438\u0447\u044C\u0442\u0435 AD_TIMEOUT");
        }
      } else if (isAuthenticated) {
        result.success = true;
        result.message = "\u2705 \u2705 \u2705 \u0423\u0421\u041F\u0415\u0428\u041D\u041E\u0415 \u041F\u041E\u0414\u041A\u041B\u042E\u0427\u0415\u041D\u0418\u0415 \u041A \u0414\u041E\u041C\u0415\u041D\u0423!";
        result.details = {
          authenticated: true,
          baseDN: adConfig.baseDN,
          user: adConfig.username
        };
        console.log(`\u{1F389} ${result.message}`);
        console.log(`\u23F1\uFE0F \u0412\u0440\u0435\u043C\u044F \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F: ${result.elapsedMs}ms`);
        console.log(`\u{1F464} \u0410\u0443\u0442\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0446\u0438\u044F \u043F\u0440\u043E\u0439\u0434\u0435\u043D\u0430 \u0434\u043B\u044F: ${adConfig.username}`);
      } else {
        result.success = false;
        result.message = "\u274C \u041E\u0448\u0438\u0431\u043A\u0430 \u0430\u0443\u0442\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0446\u0438\u0438: \u043D\u0435\u0432\u0435\u0440\u043D\u044B\u0435 \u0443\u0447\u0435\u0442\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435";
        result.details = {
          authenticated: false,
          error: "Invalid credentials"
        };
        console.error(result.message);
      }
      console.log(`\u{1F4DD} \u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442: ${result.message}
`);
      resolve(result);
    });
  });
});

export { domainConnection_get as default };
//# sourceMappingURL=domain-connection.get.mjs.map
