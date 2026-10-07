import { prisma } from '../../utils/prisma';
import { secret } from '../../realtime/token';
import { signNotification } from '../../realtime/notification';
export async function notifyDialog(conversationId: number) {
  // Best effort after commit. HTTP polling/reconnect recovers missed invalidations from DB.
  try {
    const members = await prisma.chatMember.findMany({ where: { conversationId }, select: { user: { select: { id: true, authType: true } } } });
    const body = JSON.stringify({ conversationId, recipients: members.map(m => `${m.user.authType}:${m.user.id}`) });
    const timestamp = String(Date.now());
    const response = await fetch(`http://127.0.0.1:${Number(process.env.WS_PORT || 5050)}/internal/chat`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-space-time': timestamp, 'x-space-signature': signNotification(body, secret(), timestamp) },
      body, signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) console.warn('[chat] realtime notification rejected; clients will synchronize');
  } catch { console.warn('[chat] realtime unavailable; message remains saved'); }
}
