import { z } from 'zod';
import { prisma } from '../../../utils/prisma';
import { libraryAdmin } from '../../../services/library/access';
import { parse } from '../../../services/library/input';
import { audit } from '../../../services/library-video/core';
export default defineEventHandler(async event => {
  const actor = await libraryAdmin(event);
  const v = parse(z.object({ maxMiB: z.number().int().min(100).max(10240) }).strict(), await readBody(event));
  const maxBytes = v.maxMiB * 1024 * 1024;
  await prisma.$transaction(async tx => {
    await tx.libraryVideoSettings.upsert({ where: { id: 1 }, create: { id: 1, maxBytes }, update: { maxBytes } });
    await audit(event, tx, actor.userId, 'VIDEO_LIMIT', 'settings', v);
  });
  return { maxBytes };
});
