import { b as defineEventHandler } from '../../nitro/nitro.mjs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
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
import 'activedirectory2';
import 'node:url';
import '@iconify/utils';
import 'consola';
import 'ipx';

const labTests_get = defineEventHandler(async (event) => {
  var _a;
  try {
    const csvPath = join(process.cwd(), "server", "assets", "Reestr.csv");
    const csvContent = await readFile(csvPath, "utf-8");
    const lines = csvContent.trim().split("\n");
    const headers = ((_a = lines[0]) == null ? void 0 : _a.split(";").map((h) => h.trim())) || [];
    const data = lines.slice(1).map((line) => {
      const values = line.split(";");
      const row = {};
      headers.forEach((header, idx) => {
        var _a2;
        row[header] = ((_a2 = values[idx]) == null ? void 0 : _a2.trim()) || "";
      });
      return row;
    });
    return {
      success: true,
      headers,
      data,
      total: data.length
    };
  } catch (error) {
    console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0447\u0442\u0435\u043D\u0438\u044F CSV:", error);
    return {
      success: false,
      error: error.message,
      headers: [],
      data: [],
      total: 0
    };
  }
});

export { labTests_get as default };
//# sourceMappingURL=lab-tests.get.mjs.map
