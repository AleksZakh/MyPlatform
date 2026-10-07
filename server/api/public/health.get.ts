import { prisma } from '../../utils/prisma';
export default defineEventHandler(async event => {
  setHeader(event, 'Cache-Control', 'no-store');
  try {
    await prisma.chatConversation.findFirst({ select: { id: true } });
    return { ok: true, release: process.env.SPACE_RELEASE_ID || 'development' };
  } catch { throw createError({ statusCode: 503, statusMessage: 'Not ready' }); }
});
