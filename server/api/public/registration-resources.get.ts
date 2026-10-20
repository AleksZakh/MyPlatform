import { prisma } from '../../utils/prisma';

// Keep the URL for compatibility with the registration page. Return groups only.
export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store');
  const groups = await prisma.spaceGroup.findMany({
    where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true },
  });
  return { success: true, data: groups };
});
