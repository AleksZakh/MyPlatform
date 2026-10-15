import test from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile, unlink, mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { build } from "esbuild";
import { PrismaClient } from "@prisma/client";
import * as h3 from "h3";
import { createServer } from "node:http";
import { once } from "node:events";
const url = process.env.LIBRARY_TEST_DATABASE_URL || "";
if (!new URL(url).pathname.endsWith("_library_test"))
  throw new Error("Disposable *_library_test database required");
const db = new PrismaClient({ datasources: { db: { url } } });
Object.assign(globalThis, h3, { libraryTestDb: db });
const generated: string[] = [];
async function handler(file: string) {
  const out = await build({
    entryPoints: [file],
    bundle: true,
    write: false,
    format: "esm",
    platform: "node",
    packages: "external",
    plugins: [
      {
        name: "session",
        setup(b) {
          b.onResolve({ filter: /access-control.service$/ }, () => ({
            path: "auth",
            namespace: "test",
          }));
          b.onResolve({ filter: /utils\/prisma$/ }, () => ({
            path: "db",
            namespace: "test",
          }));
          b.onLoad({ filter: /.*/, namespace: "test" }, (args) => ({
            loader: "js",
            contents:
              args.path === "db"
                ? "export const prisma=globalThis.libraryTestDb;"
                : `
   export async function getAccessActor(e){ const id=Number(e.node.req.headers['x-test-user']); if(!id)throw Object.assign(new Error('auth'),{statusCode:401}); const user=await globalThis.libraryTestDb.user.findUnique({where:{id}}); if(!user||user.status!=='ACTIVE')throw Object.assign(new Error('blocked'),{statusCode:403}); return {user,isSystemAdmin:id===1}; }
   export async function requirePermission(e,key,action){const a=await getAccessActor(e);if(a.user.id!==1)throw Object.assign(new Error('denied'),{statusCode:403});return {userId:a.user.id};}
  `,
          }));
        },
      },
    ],
  });
  const p = resolve(`tests/library/.generated-${generated.length}.mjs`);
  generated.push(p);
  await writeFile(p, out.outputFiles[0]!.text);
  return (await import(pathToFileURL(p).href)).default;
}
test("library: authorization, file delivery, editing conflicts, multi-category, trash, restore, catalogue moves and audit", async () => {
  const app = h3.createApp({ debug: false });
  const router = h3.createRouter();
  const server = createServer(h3.toNodeListener(app));
  try {
    await db.user.createMany({
      data: [
        { id: 1, authType: "DOMAIN", status: "ACTIVE", login: "librarian" },
        {
          id: 2,
          authType: "EXTERNAL",
          status: "ACTIVE",
          email: "reader@example.org",
        },
        { id: 3, authType: "DOMAIN", status: "BLOCKED", login: "blocked" },
      ],
    });
    for (const [route, file, method] of [
      ["/catalog", "catalog.get", "get"],
      ["/books", "books/index.get", "get"],
      ["/books", "books/index.post", "post"],
      ["/books/:id", "books/[id].put", "put"],
      ["/books/:id", "books/[id].delete", "delete"],
      ["/books/:id/restore", "books/[id]/restore.post", "post"],
      ["/categories", "categories/index.post", "post"],
      ["/categories/:id", "categories/[id].put", "put"],
      ["/categories/:id", "categories/[id].delete", "delete"],
      ["/assets", "assets/index.post", "post"],
      ["/assets/:id", "assets/[id].get", "get"],
    ])
      (router as any)[method!](
        route,
        await handler("server/api/library/" + file + ".ts"),
      );
    app.use(router);
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const port = (server.address() as any).port;
    const call = (
      path: string,
      method = "GET",
      body?: any,
      user = "1",
      headers: Record<string, string> = {},
    ) =>
      fetch(`http://127.0.0.1:${port}${path}`, {
        method,
        headers: {
          "x-test-user": user,
          "x-space-library": "1",
          ...(!Buffer.isBuffer(body) && body
            ? { "content-type": "application/json" }
            : {}),
          ...headers,
        },
        body: body
          ? Buffer.isBuffer(body)
            ? body
            : JSON.stringify(body)
          : undefined,
      });
    assert.equal((await call("/books", "GET", undefined, "")).status, 401);
    assert.equal((await call("/books", "GET", undefined, "3")).status, 403);
    assert.equal(
      (
        await call(
          "/categories",
          "POST",
          { name: "Denied", parentId: null },
          "2",
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await call(
          "/categories",
          "POST",
          { name: "CSRF", parentId: null },
          "1",
          { "x-space-library": "" },
        )
      ).status,
      403,
    );
    const root = await (
      await call("/categories", "POST", { name: "Дисциплины", parentId: null })
    ).json();
    assert.ok(root.id, JSON.stringify(root));
    const other = await (
      await call("/categories", "POST", { name: "Материалы", parentId: null })
    ).json();
    const child = await (
      await call("/categories", "POST", { name: "Геология", parentId: root.id })
    ).json();
    assert.equal(
      (
        await call("/categories", "POST", {
          name: "Too deep",
          parentId: child.id,
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await call(`/categories/${root.id}`, "PUT", {
          name: "Дисциплины",
          parentId: child.id,
        })
      ).status,
      400,
    );
    assert.equal(
      (await call("/assets?kind=pdf", "POST", Buffer.from("not pdf"))).status,
      400,
    );
    const pdf = Buffer.from("%PDF-1.4\nexample-test-content\n%%EOF");
    const asset = await (await call("/assets?kind=pdf", "POST", pdf)).json();
    assert.ok(asset.id, JSON.stringify(asset));
    assert.equal(
      (await call(`/assets/${asset.id}`, "GET", undefined, "2")).status,
      403,
    );
    const b = {
      clientKey: "6b9e0b70-1111-4111-a111-111111111111",
      title: "Основания и фундаменты",
      author: "Автор",
      pdfId: asset.id,
      categoryIds: [child.id, other.id],
    };
    const created = await (await call("/books", "POST", b)).json();
    assert.ok(created.id, JSON.stringify(created));
    const retry = await (await call("/books", "POST", b)).json();
    assert.equal(retry.id, created.id);
    const read = await call(`/assets/${asset.id}`, "GET", undefined, "2", {
      range: "bytes=0-4",
    });
    assert.equal(read.status, 206);
    assert.equal(await read.text(), "%PDF-");
    assert.equal(
      (
        await call(`/assets/${asset.id}`, "GET", undefined, "2", {
          range: "bytes=999-1000",
        })
      ).status,
      416,
    );
    const found = await (
      await call(
        "/books?q=" + encodeURIComponent("фундам"),
        "GET",
        undefined,
        "2",
      )
    ).json();
    assert.equal(found.total, 1);
    assert.equal(found.books[0].categories.length, 2);
    assert.equal(
      (
        await call(
          `/books/${created.id}`,
          "PUT",
          { ...b, version: 1, title: "Новая редакция" },
          "2",
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await call(`/books/${created.id}`, "PUT", {
          ...b,
          version: 1,
          title: "Новая редакция",
        })
      ).status,
      200,
    );
    assert.equal(
      (await call(`/books/${created.id}`, "PUT", { ...b, version: 1 })).status,
      409,
    );
    assert.equal(
      (await call(`/categories/${root.id}`, "DELETE", {})).status,
      409,
    );
    assert.equal(
      (await call(`/categories/${root.id}`, "DELETE", { targetId: other.id }))
        .status,
      200,
    );
    assert.equal(
      (await db.libraryCategory.findUnique({ where: { id: child.id } }))
        ?.parentId,
      other.id,
    );
    assert.equal(
      (await call(`/books/${created.id}`, "DELETE", { version: 2 })).status,
      200,
    );
    assert.equal(
      (await (await call("/books", "GET", undefined, "2")).json()).total,
      0,
    );
    assert.equal(
      (await call("/books?trash=1", "GET", undefined, "2")).status,
      403,
    );
    assert.equal(
      (await call(`/assets/${asset.id}`, "GET", undefined, "2")).status,
      403,
    );
    assert.equal(
      (await call(`/books/${created.id}/restore`, "POST", { version: 3 }))
        .status,
      200,
    );
    assert.equal(
      (await (await call("/books", "GET", undefined, "2")).json()).total,
      1,
    );
    assert.equal(
      (await call(`/assets/${asset.id}`, "GET", undefined, "2")).status,
      200,
    );
    const events = await db.auditLog.findMany({
      where: { resourceKey: "library.manage" },
    });
    assert.ok(events.some((e) => e.action === "RESTORE"));
    assert.ok(
      events.some(
        (e) => e.entityType === "LibraryCategory" && e.action === "DELETE",
      ),
    );
    assert.ok(events.every((e) => e.actorUserId === 1));
  } finally {
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
    await db.$disconnect();
    await Promise.all(generated.map((p) => unlink(p)));
  }
});
