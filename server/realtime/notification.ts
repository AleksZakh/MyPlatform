import { createHmac, timingSafeEqual } from 'node:crypto';
export function signNotification(body: string, key: string, timestamp: string) {
  return createHmac('sha256', key).update(`space-chat-notify\n${timestamp}\n${body}`).digest('hex');
}
export function verifyNotification(body: string, key: string, timestamp: string, signature: string) {
  if (!/^\d{13}$/.test(timestamp) || Math.abs(Date.now() - Number(timestamp)) > 30000 || !/^[a-f0-9]{64}$/.test(signature)) return false;
  return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(signNotification(body, key, timestamp), 'hex'));
}
