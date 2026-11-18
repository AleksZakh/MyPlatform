import { createError, defineEventHandler, getRouterParam, readBody } from 'h3';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { adCache } from '../../utils/adCache';
import { directoryEditor, directoryKey, mayEditContact } from '../../utils/phoneDirectory';

const schema = z.object({
  city: z.string().trim().max(120),
  address: z.string().trim().max(500),
  room: z.string().trim().max(100),
  mobilePhone: z.string().trim().max(50),
}).strict();

export default defineEventHandler(async event => {
  const key = getRouterParam(event, 'key');
  if (!key || key.length > 300) throw createError({ statusCode: 400, message: 'Некорректный идентификатор сотрудника' });
  const actor = await directoryEditor(event);
  const cache = await adCache.get();
  const contact = cache?.users.find(user => !user.accountDisabled && directoryKey(user) === key);
  if (!contact) throw createError({ statusCode: 404, message: 'Сотрудник не найден в AD' });
  if (!mayEditContact(actor, contact)) throw createError({ statusCode: 403, message: 'Редактировать можно только свою карточку' });
  const body = schema.safeParse(await readBody(event));
  if (!body.success) throw createError({ statusCode: 400, message: 'Недопустимые данные карточки' });
  return prisma.phoneDirectoryDetails.upsert({
    where: { directoryKey: key },
    create: { directoryKey: key, ...body.data, updatedByUserId: actor.user.id },
    update: { ...body.data, updatedByUserId: actor.user.id },
    select: { city: true, address: true, room: true, mobilePhone: true },
  });
});
