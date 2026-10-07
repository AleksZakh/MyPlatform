// A disposable database only. Do not set this to an application database.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
const url = process.env.CHAT_TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_chat_test')) throw new Error('Use CHAT_TEST_DATABASE_URL ending in _chat_test, pointing to a NEW disposable database');
process.env.DATABASE_URL = url;
const { prisma } = await import('../../server/utils/prisma');
const { openDialog, membership, saveMessage, markRead } = await import('../../server/services/chat/repository');
const { messageInput } = await import('../../server/services/chat/validation');
test('database: migration, membership, idempotence, history and read cursors', async () => {
  try {
    // No DROP statements: refuses to run on a database that already has these objects.
    await prisma.$executeRawUnsafe(`CREATE TYPE "UserStatus" AS ENUM ('ACTIVE','BLOCKED','PENDING_ACTIVATION')`);
    await prisma.$executeRawUnsafe(`CREATE TABLE app_users (id SERIAL PRIMARY KEY, status "UserStatus" NOT NULL)`);
    const migration = await readFile(new URL('../../prisma/migrations/20261007190000_personal_chat/migration.sql', import.meta.url), 'utf8');
    for (const statement of migration.split(';').filter(s => s.trim())) await prisma.$executeRawUnsafe(statement);
    await prisma.$executeRawUnsafe(`INSERT INTO app_users(id,status) VALUES(1,'ACTIVE'),(2,'ACTIVE'),(3,'ACTIVE'),(4,'BLOCKED')`);
    const a = await openDialog(1, 2), b = await openDialog(2, 1);
    assert.equal(a.id, b.id);
    assert.equal(await prisma.chatMember.count({ where: { conversationId: a.id } }), 2);
    await assert.rejects(membership(3, a.id), (e: any) => e.statusCode === 404);
    await assert.rejects(openDialog(1, 4), (e: any) => e.statusCode === 404);
    await assert.rejects(openDialog(1, 1), (e: any) => e.statusCode === 400);
    await assert.rejects(saveMessage(3, a.id, 'intrusion', randomUUID()), (e: any) => e.statusCode === 404);
    const clientId = randomUUID();
    const one = await saveMessage(1, a.id, '<script>literal text</script>', clientId);
    const retry = await saveMessage(1, a.id, one.body, clientId);
    assert.equal(one.id, retry.id); assert.equal(await prisma.chatMessage.count(), 1);
    await assert.rejects(saveMessage(1, a.id, 'changed', clientId), (e: any) => e.statusCode === 409);
    const other = await openDialog(1, 3);
    await assert.rejects(saveMessage(1, other.id, one.body, clientId), (e: any) => e.statusCode === 409);
    const two = await saveMessage(2, a.id, 'reply', randomUUID());
    await markRead(1, a.id, two.id); await markRead(1, a.id, one.id);
    assert.equal((await membership(1, a.id)).readThrough, two.id);
    await assert.rejects(markRead(3, a.id, two.id), (e: any) => e.statusCode === 404);
    await assert.rejects(markRead(1, other.id, two.id), (e: any) => e.statusCode === 400);
    assert.equal(messageInput.safeParse({ body: ' ', clientId: randomUUID() }).success, false);
    assert.equal(messageInput.safeParse({ body: 'a'.repeat(4001), clientId: randomUUID() }).success, false);
    await prisma.$executeRawUnsafe(`UPDATE app_users SET status='BLOCKED' WHERE id=2`);
    await assert.rejects(saveMessage(1, a.id, 'blocked', randomUUID()), (e: any) => e.statusCode === 403);
    assert.equal(await prisma.chatMessage.count(), 2);
  } finally { await prisma.$disconnect(); }
});
