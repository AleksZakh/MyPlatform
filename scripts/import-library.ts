/** Offline import: plan never writes DB; apply only copies files, never moves originals. */
import {
  readFile,
  writeFile,
  mkdir,
  copyFile,
  stat,
  realpath,
} from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { PrismaClient, type Prisma } from "@prisma/client";
import sharp from "sharp";
const [mode, input, rootArg, planArg] = process.argv.slice(2);
const normalized = (v: unknown) =>
  String(v ?? "")
    .trim()
    .replace(/\s+/g, " ");
const uuid = (s: string) => {
  const h = createHash("sha256")
    .update("space-library-v1:" + s)
    .digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
async function source(root: string, relative: unknown) {
  const p = String(relative || "")
    .replace(/^\.\//, "")
    .replace(/^(\.\.\/)+/, "");
  if (!p) return null;
  const candidate = path.resolve(root, p);
  if (!candidate.startsWith(root + path.sep))
    throw new Error("Unsafe path: " + p);
  try {
    const resolved = await realpath(candidate);
    if (!resolved.startsWith(root + path.sep))
      throw new Error("Symlink escapes root: " + p);
    if (!(await stat(resolved)).isFile()) return null;
    return resolved;
  } catch (e: any) {
    if (e.code === "ENOENT") return null;
    throw e;
  }
}
if (mode === "plan") {
  if (!input || !rootArg || !planArg)
    throw new Error(
      "plan library-legacy.json /absolute/legacy-site-root library-plan.json",
    );
  const old = JSON.parse(await readFile(input, "utf8"));
  if (old.format !== 1) throw new Error("Unsupported format");
  const root = await realpath(rootArg);
  const warnings: string[] = [];
  const errors: string[] = [];
  const categories = old.categories.map((c: any, i: number) => ({
    legacyId: c.id,
    name: normalized(c.name),
    parentName: normalized(c.parent),
    position: i,
    iconSource: c.icon,
  }));
  const roots = categories.filter((c: any) => !c.parentName);
  for (const c of categories) {
    const parents = roots.filter((p: any) => p.name === c.parentName);
    if (c.parentName && parents.length !== 1)
      errors.push(
        `Category ${c.legacyId}: ambiguous/missing parent ${c.parentName}`,
      );
    c.parentLegacyId = c.parentName ? parents[0]?.legacyId : null;
    c.iconPath = await source(root, c.iconSource);
    if (!c.iconPath)
      warnings.push(
        `Category ${c.legacyId}: icon missing; standard icon will be used`,
      );
  }
  const lookup = (main: string, sub: string) =>
    categories.filter((c: any) =>
      sub
        ? c.name === sub && c.parentName === main
        : !c.parentName && c.name === main,
    );
  const books = [];
  for (const b of old.books) {
    const matches = lookup(
      normalized(b.main_section),
      normalized(b.subsection),
    );
    if (matches.length !== 1)
      errors.push(
        `Book ${b.id}: main category missing/ambiguous (${b.main_section} → ${b.subsection})`,
      );
    const categoryLegacyIds = matches.map((c: any) => c.legacyId);
    for (const extra of String(b.other_sections || "")
      .split(";")
      .filter((s) => s.trim())) {
      const [m, s] = extra.split("->").map(normalized);
      const options = lookup(m || normalized(b.main_section), s || "");
      if (options.length === 1) categoryLegacyIds.push(options[0].legacyId);
      else
        warnings.push(`Book ${b.id}: unresolved additional category ${extra}`);
    }
    const pdfPath = await source(root, b.book_scan_path);
    const coverPath = await source(root, b.book_img_path);
    if (!pdfPath) errors.push(`Book ${b.id}: missing PDF ${b.book_scan_path}`);
    if (!coverPath) warnings.push(`Book ${b.id}: missing cover`);
    books.push({
      legacyId: b.id,
      title: String(b.book_name || "").trim(),
      author: String(b.book_autor || "").trim(),
      publisher: String(b.book_publisher || "").trim(),
      year: String(b.year_pablish || "").trim(),
      city: String(b.book_town || "").trim(),
      keywords: String(b.key_words_list || "").trim(),
      note: String(b.book_note || "").trim(),
      series: "",
      issue: "",
      categoryLegacyIds: [...new Set(categoryLegacyIds)],
      pdfPath,
      coverPath,
      legacyData: b,
    });
  }
  const plan = {
    format: 1,
    createdAt: new Date().toISOString(),
    root,
    categories,
    books,
    errors,
    warnings,
  };
  await writeFile(planArg, JSON.stringify(plan, null, 2));
  console.log(
    `Plan ${planArg}: categories=${categories.length}; books=${books.length}; errors=${errors.length}; warnings=${warnings.length}`,
  );
  console.log(
    "Review errors and warnings, correct source data/files, then create a fresh plan. No changes made.",
  );
} else if (mode === "apply") {
  if (!input) throw new Error("apply library-plan.json");
  const plan = JSON.parse(await readFile(input, "utf8"));
  if (plan.format !== 1 || plan.errors.length)
    throw new Error("Resolve plan errors and create a new plan before apply.");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const db = new PrismaClient();
  const storage = path.resolve(
    process.env.LIBRARY_FILES_ROOT ||
      path.join(
        process.env.LAB_FILES_ROOT || "/var/www/uploads-storage/files",
        "..",
        "library",
      ),
  );
  await mkdir(storage, { recursive: true, mode: 0o750 });
  let created = 0,
    skipped = 0;
  try {
    const actorId = Number(process.env.LIBRARY_IMPORT_ACTOR_ID);
    if (!Number.isSafeInteger(actorId) || actorId < 1)
      throw new Error(
        "Set LIBRARY_IMPORT_ACTOR_ID to the administrator user ID for audit attribution.",
      );
    const actor = await db.user.findUnique({ where: { id: actorId } });
    if (!actor || actor.status !== "ACTIVE")
      throw new Error("Active import actor required");
    async function asset(sourceFile: string | null, kind: string, key: string) {
      if (!sourceFile) return null;
      const resolved = await realpath(sourceFile);
      if (!resolved.startsWith(plan.root + path.sep))
        throw new Error("File is outside planned source root");
      const id = uuid(key);
      if (await db.libraryAsset.findUnique({ where: { id } })) {
        await stat(path.join(storage, id));
        return id;
      }
      const bytes = await readFile(resolved);
      if (kind === "pdf") {
        if (bytes.subarray(0, 5).toString() !== "%PDF-")
          throw new Error("Invalid PDF: " + sourceFile);
        await writeFile(path.join(storage, id), bytes, { mode: 0o640 });
      } else {
        await sharp(bytes, { limitInputPixels: 16000000 })
          .rotate()
          .resize(600, 800, { fit: "inside", withoutEnlargement: true })
          .png()
          .toFile(path.join(storage, id));
      }
      await db.libraryAsset.create({
        data: {
          id,
          kind,
          filename: path.basename(sourceFile).slice(0, 255),
          size: (await stat(path.join(storage, id))).size,
          ownerId: actorId,
        },
      });
      return id;
    }
    const map = new Map<number, number>();
    for (const c of [
      ...plan.categories.filter((c: any) => !c.parentLegacyId),
      ...plan.categories.filter((c: any) => c.parentLegacyId),
    ]) {
      let entry = await db.libraryCategory.findUnique({
        where: { legacyId: c.legacyId },
      });
      if (!entry) {
        const iconAssetId = await asset(
          c.iconPath,
          "image",
          "category:" + c.legacyId,
        );
        entry = await db.$transaction(
          async (tx) => {
            const category = await tx.libraryCategory.create({
              data: {
                legacyId: c.legacyId,
                name: c.name,
                parentId: c.parentLegacyId ? map.get(c.parentLegacyId) : null,
                position: c.position,
                iconAssetId,
              },
            });
            await tx.auditLog.create({
              data: {
                category: "SYSTEM",
                action: "IMPORT",
                result: "SUCCESS",
                resourceKey: "library.manage",
                entityType: "LibraryCategory",
                entityId: category.id,
                actorUserId: actorId,
                actorEmail: actor.email || actor.login || `user:${actorId}`,
                note: `Импорт раздела, legacyId=${c.legacyId}`,
              },
            });
            return category;
          },
          { timeout: 15000 },
        );
      }
      map.set(c.legacyId, entry.id);
    }
    for (const b of plan.books) {
      if (
        await db.libraryBook.findUnique({ where: { legacyId: b.legacyId } })
      ) {
        skipped++;
        continue;
      }
      const pdfId = await asset(b.pdfPath, "pdf", "pdf:" + b.legacyId);
      if (!pdfId) throw new Error("Missing PDF: " + b.legacyId);
      const coverId = await asset(b.coverPath, "image", "cover:" + b.legacyId);
      const categoryIds = b.categoryLegacyIds.map((id: number) => map.get(id));
      if (!categoryIds.length || categoryIds.some((id: any) => !id))
        throw new Error("Missing category mapping");
      await db.$transaction(
        async (tx) => {
          const book = await tx.libraryBook.create({
            data: {
              legacyId: b.legacyId,
              title: b.title,
              author: b.author,
              publisher: b.publisher,
              year: b.year,
              city: b.city,
              keywords: b.keywords,
              note: b.note,
              series: b.series || "",
              issue: b.issue || "",
              pdfId,
              coverId,
              createdBy: actorId,
              legacyData: b.legacyData,
              categories: {
                create: categoryIds.map((categoryId: number) => ({
                  categoryId,
                })),
              },
            },
          });
          await tx.auditLog.create({
            data: {
              category: "SYSTEM",
              action: "IMPORT",
              result: "SUCCESS",
              resourceKey: "library.manage",
              entityType: "LibraryBook",
              entityId: book.id,
              actorUserId: actorId,
              actorEmail: actor.email || actor.login || `user:${actorId}`,
              note: `Импорт библиотеки, legacyId=${b.legacyId}`,
            },
          });
        },
        { timeout: 15000 },
      );
      created++;
    }
    console.log(
      `Imported=${created}; already imported=${skipped}. Source files unchanged.`,
    );
  } finally {
    await db.$disconnect();
  }
} else throw new Error("Usage: plan INPUT ROOT PLAN | apply PLAN");
