import { z } from 'zod';
import { prisma } from '../../../../utils/prisma';
import { libraryAdmin } from '../../../../services/library/access';
import { parse } from '../../../../services/library/input';
import { uuid, audit } from '../../../../services/library-video/core';
export default defineEventHandler(async event => {
  const actor = await libraryAdmin(event), id = uuid(getRouterParam(event, 'id'));
  const v = parse(z.object({ action: z.enum(['trash','restore','retry']), version: z.number().int().positive() }).strict(), await readBody(event));
  return prisma.$transaction(async tx => {
    const row = await tx.libraryVideo.findUnique({ where: { id } });
    if (!row || row.version !== v.version) throw createError({ statusCode: 409, message: 'Обновите список видео.' });
    if (v.action === 'retry' && (row.status !== 'ERROR' || row.deletedAt)) throw createError({ statusCode: 409 });
    const result = await tx.libraryVideo.updateMany({ where: { id, version: v.version }, data: {
      version: { increment: 1 },
      ...(v.action === 'trash' ? { deletedAt: new Date() } : v.action === 'restore' ? { deletedAt: null } : { status: 'QUEUED', error: null }),
    } });
    if (!result.count) throw createError({ statusCode: 409 });
    await audit(event, tx, actor.userId, v.action.toUpperCase(), id, { title: row.title });
    return { ok: true };
  });
});
