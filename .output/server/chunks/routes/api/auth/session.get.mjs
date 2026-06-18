import { b as defineEventHandler, f as getUserSession, c as createError } from '../../../nitro/nitro.mjs';
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
import 'activedirectory2';
import 'node:url';
import '@iconify/utils';
import 'consola';
import 'ipx';

const session_get = defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  if (!session) {
    throw createError({ statusCode: 401, message: "No active session" });
  }
  return {
    user: session.user,
    loggedIn: true
  };
});

export { session_get as default };
//# sourceMappingURL=session.get.mjs.map
