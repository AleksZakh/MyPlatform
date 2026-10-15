import { createReadStream } from "node:fs";
import { prisma } from "../../../utils/prisma";
import { libraryReader, libraryAdmin } from "../../../services/library/access";
import { existingAsset } from "../../../services/library/files";
export default defineEventHandler(async (event) => {
  const user = await libraryReader(event);
  const id = getRouterParam(event, "id") || "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw createError({ statusCode: 400 });
  const asset = await prisma.libraryAsset.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          pdfBooks: { where: { deletedAt: null } },
          coverBooks: { where: { deletedAt: null } },
          categoryIcons: true,
        },
      },
    },
  });
  if (!asset) throw createError({ statusCode: 404 });
  if (
    !asset._count.pdfBooks &&
    !asset._count.coverBooks &&
    !asset._count.categoryIcons
  )
    await libraryAdmin(event, false);
  const file = await existingAsset(id);
  setHeader(event, "X-Content-Type-Options", "nosniff");
  setHeader(
    event,
    "Content-Type",
    asset.kind === "pdf" ? "application/pdf" : "image/png",
  );
  setHeader(
    event,
    "Content-Disposition",
    (getQuery(event).download === "1" ? "attachment" : "inline") +
      "; filename*=UTF-8''" +
      encodeURIComponent(
        asset.kind === "pdf" ? asset.filename : "image.png",
      ).replace(/'/g, "%27"),
  );
  setHeader(event, "Accept-Ranges", "bytes");
  const range = getHeader(event, "range");
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    let start = match?.[1]
      ? Number(match[1])
      : Math.max(0, file.size - Number(match?.[2]));
    let end =
      match?.[1] && match[2]
        ? Math.min(Number(match[2]), file.size - 1)
        : file.size - 1;
    if (
      !match ||
      (!match[1] && !match[2]) ||
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start > end ||
      start >= file.size
    ) {
      setHeader(event, "Content-Range", `bytes */${file.size}`);
      throw createError({ statusCode: 416 });
    }
    setResponseStatus(event, 206);
    setHeader(event, "Content-Range", `bytes ${start}-${end}/${file.size}`);
    setHeader(event, "Content-Length", end - start + 1);
    return sendStream(event, createReadStream(file.path, { start, end }));
  }
  setHeader(event, "Content-Length", file.size);
  return sendStream(event, createReadStream(file.path));
});
