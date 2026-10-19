import { prisma } from '../../../../utils/prisma';
import { readVideo } from '../../../../services/library-video/core';
export default defineEventHandler(async event => {
  const { video, user } = await readVideo(event, getRouterParam(event, 'id') || '');
  const p = await prisma.libraryVideoPosition.findUnique({ where: { videoId_userId: { videoId: video.id, userId: user.id } } });
  return { seconds: p?.seconds || 0 };
});
