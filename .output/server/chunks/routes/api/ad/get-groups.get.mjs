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

const getGroups_get = defineEventHandler(async (event) => {
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
    const groupOptions = {
      filter: "(objectClass=group)",
      // Только объекты групп
      scope: "sub",
      sizeLimit: 200,
      attributes: ["cn", "description", "member"]
    };
    ad.findGroups(groupOptions, (err, groups) => {
      if (err) {
        const error = err;
        reject({ success: false, error: error.message });
      } else {
        console.log(`\u041D\u0430\u0439\u0434\u0435\u043D\u043E \u0433\u0440\u0443\u043F\u043F: ${(groups == null ? void 0 : groups.length) || 0}`);
        resolve({
          success: true,
          count: (groups == null ? void 0 : groups.length) || 0,
          groups: groups || []
        });
      }
    });
  });
});

export { getGroups_get as default };
//# sourceMappingURL=get-groups.get.mjs.map
