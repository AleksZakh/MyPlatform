import { profileActor } from '../../services/profile-details';
import { prisma } from '../../utils/prisma';
export default defineEventHandler(async event => {
 const actor = await profileActor(event);
 const row = await prisma.userProfile.findUnique({ where: { userId: actor.id }, select: { avatar: true } });
 if (!row?.avatar) throw createError({ statusCode: 404 });
 setHeader(event, 'Content-Type', 'image/jpeg');
 setHeader(event, 'X-Content-Type-Options', 'nosniff');
 return Buffer.from(row.avatar);
});
