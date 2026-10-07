import { createHmac, timingSafeEqual } from 'node:crypto';
export interface Identity { id: string; login: string; name: string }
export function secret() {
  const value = process.env.WS_AUTH_SECRET || '';
  if (value.length < 32) throw new Error('WS_AUTH_SECRET must contain at least 32 characters');
  return value;
}
export function issue(identity: Identity, key: string, now = Date.now()) {
  const body = Buffer.from(JSON.stringify({ ...identity, aud: 'space-presence', exp: Math.floor(now / 1000) + 120 })).toString('base64url');
  return body + '.' + createHmac('sha256', key).update(body).digest('base64url');
}
export function verify(token: string, key: string, now = Date.now()): Identity & { exp: number } {
  if (typeof token !== 'string' || token.length > 4096) throw new Error('Invalid ticket');
  const parts = token.split('.');
  if (parts.length !== 2) throw new Error('Invalid ticket');
  const body = parts[0]!;
  const signature = Buffer.from(parts[1]!, 'base64url');
  const expected = createHmac('sha256', key).update(body).digest();
  if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) throw new Error('Invalid ticket');
  const value = JSON.parse(Buffer.from(body, 'base64url').toString());
  if (value.aud !== 'space-presence' || !Number.isInteger(value.exp) || value.exp <= now / 1000 || value.exp > now / 1000 + 125
    || !['id', 'login', 'name'].every(k => typeof value[k] === 'string' && value[k].length > 0 && value[k].length <= 300)) throw new Error('Invalid ticket');
  return { id: value.id, login: value.login, name: value.name, exp: value.exp };
}
