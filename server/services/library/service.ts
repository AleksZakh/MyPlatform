import { createError, type H3Event } from "h3";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../utils/prisma";
import { writeAuditEvent, computeAuditDelta } from "../../utils/auditLog";
import { bookInput, categoryInput, parse } from "./input";
// Serialise catalogue mutations across processes, not just one Node instance.
// No filesystem or network work is done while holding this lock.
export async function mutate<T>(
  event: H3Event,
  actor: number,
  entity: string,
  action: string,
  fn: (
    tx: Prisma.TransactionClient,
  ) => Promise<{ id: number; before?: any; after: any }>,
): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(19370014)`;
      const result = await fn(tx);
      await writeAuditEvent({
        event,
        db: tx,
        category: "DATA",
        result: "SUCCESS",
        action,
        resourceKey: "library.manage",
        entityType: entity,
        entityId: result.id,
        actorUserId: actor,
        changes: computeAuditDelta(result.before || {}, result.after || {}),
        note: "Библиотека: " + action,
      });
      return result.after as T;
    },
    { timeout: 15000 },
  );
}
async function usableAsset(
  tx: Prisma.TransactionClient,
  id: string | null,
  kind: string,
  actor: number,
  existing?: string | null,
) {
  if (!id) return;
  const asset = await tx.libraryAsset.findUnique({ where: { id } });
  if (
    !asset ||
    asset.kind !== kind ||
    (id !== existing && asset.ownerId !== actor)
  )
    throw createError({
      statusCode: 400,
      message: "Файл не найден или недоступен. Загрузите его заново.",
    });
}
export async function saveBook(
  event: H3Event,
  actor: number,
  input: unknown,
  id?: number,
) {
  const value = parse(bookInput, input);
  return mutate(
    event,
    actor,
    "LibraryBook",
    id ? "UPDATE" : "CREATE",
    async (tx) => {
      if (!id && value.clientKey) {
        const previous = await tx.libraryBook.findUnique({
          where: { clientKey: value.clientKey },
          include: { categories: true },
        });
        if (previous) {
          if (previous.createdBy !== actor || previous.deletedAt)
            throw createError({ statusCode: 409 });
          return { id: previous.id, after: previous };
        }
      }
      const before = id
        ? await tx.libraryBook.findUnique({
            where: { id },
            include: { categories: true },
          })
        : null;
      if (id && (!before || before.deletedAt))
        throw createError({ statusCode: 404, message: "Книга не найдена." });
      if (before && before.version !== value.version)
        throw createError({
          statusCode: 409,
          message:
            "Книга уже изменена другим администратором. Откройте её заново.",
        });
      const { categoryIds, version, ...data } = value;
      if (id) delete data.clientKey;
      if (
        (await tx.libraryCategory.count({
          where: { id: { in: categoryIds } },
        })) !== categoryIds.length
      )
        throw createError({
          statusCode: 400,
          message: "Один из разделов удалён.",
        });
      await usableAsset(tx, data.pdfId, "pdf", actor, before?.pdfId);
      await usableAsset(tx, data.coverId, "image", actor, before?.coverId);
      const after = id
        ? await tx.libraryBook.update({
            where: { id },
            data: {
              ...data,
              version: { increment: 1 },
              categories: {
                deleteMany: {},
                create: categoryIds.map((categoryId) => ({ categoryId })),
              },
            },
            include: { categories: true },
          })
        : await tx.libraryBook.create({
            data: {
              ...data,
              createdBy: actor,
              categories: {
                create: categoryIds.map((categoryId) => ({ categoryId })),
              },
            },
            include: { categories: true },
          });
      return { id: after.id, before, after };
    },
  );
}
export async function saveCategory(
  event: H3Event,
  actor: number,
  input: unknown,
  id?: number,
) {
  const data = parse(categoryInput, input);
  return mutate(
    event,
    actor,
    "LibraryCategory",
    id ? "UPDATE" : "CREATE",
    async (tx) => {
      const before = id
        ? await tx.libraryCategory.findUnique({ where: { id } })
        : null;
      if (id && !before) throw createError({ statusCode: 404 });
      if (data.parentId) {
        const parent = await tx.libraryCategory.findUnique({
          where: { id: data.parentId },
        });
        if (
          !parent ||
          parent.parentId ||
          data.parentId === id ||
          (id && (await tx.libraryCategory.count({ where: { parentId: id } })))
        )
          throw createError({
            statusCode: 400,
            message: "Допустимы только два уровня каталога.",
          });
      }
      if (
        await tx.libraryCategory.findFirst({
          where: {
            name: { equals: data.name, mode: "insensitive" },
            parentId: data.parentId,
            ...(id ? { id: { not: id } } : {}),
          },
        })
      )
        throw createError({
          statusCode: 409,
          message: "Раздел с таким названием уже существует.",
        });
      await usableAsset(
        tx,
        data.iconAssetId,
        "image",
        actor,
        before?.iconAssetId,
      );
      const after = id
        ? await tx.libraryCategory.update({ where: { id }, data })
        : await tx.libraryCategory.create({ data });
      return { id: after.id, before, after };
    },
  );
}
export async function trashBook(
  event: H3Event,
  actor: number,
  id: number,
  version: number,
  restore: boolean,
) {
  return mutate(
    event,
    actor,
    "LibraryBook",
    restore ? "RESTORE" : "DELETE",
    async (tx) => {
      const before = await tx.libraryBook.findUnique({ where: { id } });
      if (!before) throw createError({ statusCode: 404 });
      if (before.version !== version)
        throw createError({
          statusCode: 409,
          message: "Книга уже изменена. Обновите список.",
        });
      const after = await tx.libraryBook.update({
        where: { id },
        data: {
          deletedAt: restore ? null : new Date(),
          deletedBy: restore ? null : actor,
          version: { increment: 1 },
        },
      });
      return { id, before, after };
    },
  );
}
export async function removeCategory(
  event: H3Event,
  actor: number,
  id: number,
  targetId?: number,
) {
  return mutate(event, actor, "LibraryCategory", "DELETE", async (tx) => {
    const before = await tx.libraryCategory.findUnique({ where: { id } });
    if (!before) throw createError({ statusCode: 404 });
    const children = await tx.libraryCategory.findMany({
      where: { parentId: id },
    });
    const sourceIds = [id, ...children.map((c) => c.id)];
    const links = await tx.libraryBookCategory.findMany({
      where: { categoryId: { in: sourceIds } },
    });
    if ((links.length || children.length) && !targetId)
      throw createError({
        statusCode: 409,
        message:
          "Раздел не пуст. Выберите раздел для переноса книг и подразделов.",
        data: { code: "CATEGORY_NOT_EMPTY" },
      });
    if (targetId) {
      const target = await tx.libraryCategory.findUnique({
        where: { id: targetId },
      });
      if (
        !target ||
        sourceIds.includes(targetId) ||
        (children.length && target.parentId)
      )
        throw createError({
          statusCode: 400,
          message: "Выберите другой основной раздел.",
        });
      // Child categories are preserved; books directly in the removed category move to target.
      for (const child of children) {
        if (
          await tx.libraryCategory.findFirst({
            where: {
              parentId: targetId,
              name: { equals: child.name, mode: "insensitive" },
            },
          })
        )
          throw createError({
            statusCode: 409,
            message:
              "В целевом разделе есть одноимённый подраздел. Сначала переименуйте его.",
          });
      }
      await tx.libraryCategory.updateMany({
        where: { parentId: id },
        data: { parentId: targetId },
      });
      for (const link of links.filter((l) => l.categoryId === id))
        await tx.libraryBookCategory.upsert({
          where: {
            bookId_categoryId: { bookId: link.bookId, categoryId: targetId },
          },
          create: { bookId: link.bookId, categoryId: targetId },
          update: {},
        });
      await tx.libraryBook.updateMany({
        where: { categories: { some: { categoryId: id } } },
        data: { version: { increment: 1 } },
      });
      await tx.libraryBookCategory.deleteMany({ where: { categoryId: id } });
    }
    await tx.libraryCategory.delete({ where: { id } });
    return {
      id,
      before,
      after: {
        removed: true,
        targetId: targetId ?? null,
        movedBooks: links
          .filter((l) => l.categoryId === id)
          .map((l) => l.bookId),
        movedCategories: children.map((c) => c.id),
      },
    };
  });
}
