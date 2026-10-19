import { prisma } from '../../../utils/prisma';
import { libraryReader, libraryAdmin } from '../../../services/library/access';
import { positiveId } from '../../../services/library/input';
import { videoDto } from '../../../services/library-video/core';
export default defineEventHandler(async event => {
  const user = await libraryReader(event);
  const q = getQuery(event); let manage = false;
  try { await libraryAdmin(event, false); manage = true; } catch (e: any) { if (e.statusCode !== 403) throw e; }
  const trash = q.trash === '1'; if (trash && !manage) throw createError({ statusCode: 403 });
  const page = q.page ? positiveId(q.page) : 1, search = String(q.q || '').trim().slice(0,200);
  const where: any = { deletedAt: trash ? { not: null } : null, ...(!manage ? { status: 'READY' } : {}) };
  if (q.category) { const id = positiveId(q.category); where.categories = { some: { category: { OR: [{ id }, { parentId: id }] } } }; }
  if (search) where.OR = ['title','author','description'].map(key => ({ [key]: { contains: search, mode: 'insensitive' } }));
  const [rows, total] = await Promise.all([
    prisma.libraryVideo.findMany({ where, include: { categories: true }, orderBy: [{ title: 'asc' },{ id: 'asc' }], take: 24, skip: (page-1)*24 }),
    prisma.libraryVideo.count({ where }),
  ]);
  return { videos: rows.map(v => ({ ...videoDto(v), canResume: v.createdBy === user.id })), total, page };
});
