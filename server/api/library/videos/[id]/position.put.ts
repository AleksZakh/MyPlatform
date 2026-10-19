import { z } from 'zod';
import { prisma } from '../../../../utils/prisma';
import { readVideo } from '../../../../services/library-video/core';
import { parse } from '../../../../services/library/input';
export default defineEventHandler(async event => {
  if (getHeader(event, 'x-space-library') !== '1') throw createError({ statusCode: 403 });
  const { video, user } = await readVideo(event, getRouterParam(event, 'id') || '');
  if (video.status !== 'READY') throw createError({ statusCode: 409 });
  const { seconds } = parse(z.object({ seconds: z.number().finite().min(0).max(86400) }).strict(), await readBody(event));
  const position = Math.min(seconds, video.duration || 0);
  await prisma.libraryVideoPosition.upsert({ where: { videoId_userId: { videoId: video.id, userId: user.id } },
    create: { videoId: video.id, userId: user.id, seconds: position }, update: { seconds: position } });
  return { ok: true };
});
