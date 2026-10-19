import { z } from 'zod';
import { prisma } from '../../../utils/prisma';
import { libraryAdmin } from '../../../services/library/access';
import { parse } from '../../../services/library/input';
import { videoInput, uuid, categoriesExist, audit, videoDto } from '../../../services/library-video/core';
export default defineEventHandler(async event => {
  const actor = await libraryAdmin(event), id = uuid(getRouterParam(event, 'id'));
  const value = parse(videoInput.extend({ version: z.number().int().positive() }).strict(), await readBody(event));
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(19370014)`;
    await categoriesExist(tx, value.categoryIds);
    const { categoryIds, version, ...data } = value;
    const result = await tx.libraryVideo.updateMany({ where: { id, version, deletedAt: null }, data: { ...data, version: { increment: 1 } } });
    if (!result.count) throw createError({ statusCode: 409, message: 'Видео изменено или удалено. Обновите список.' });
    await tx.libraryVideoCategory.deleteMany({ where: { videoId: id } });
    await tx.libraryVideoCategory.createMany({ data: categoryIds.map(categoryId => ({ videoId: id, categoryId })) });
    await audit(event, tx, actor.userId, 'UPDATE', id, value);
    return videoDto((await tx.libraryVideo.findUniqueOrThrow({ where: { id }, include: { categories: true } })));
  }, { timeout: 15000 });
});
