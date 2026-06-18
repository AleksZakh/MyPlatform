import { b as defineEventHandler, e as deleteCookie } from '../../../nitro/nitro.mjs';
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

const logout_post = defineEventHandler((event) => {
  deleteCookie(event, "user_data", {
    httpOnly: true,
    secure: true,
    sameSite: "lax"
  });
  return { success: true };
});

export { logout_post as default };
//# sourceMappingURL=logout.post.mjs.map
