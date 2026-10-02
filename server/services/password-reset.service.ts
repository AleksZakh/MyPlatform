import { createHash, randomBytes } from 'node:crypto';
import { createError, type H3Event } from 'h3';
import { prisma } from '~~/server/utils/prisma';
import { hashSpacePassword } from '~~/server/utils/password';
import { writeAuditEvent } from '~~/server/utils/auditLog';
import { sendPasswordResetEmail } from '~~/server/utils/password-reset-mail';

export const RESET_REPLY = 'Если указанный email принадлежит активной внешней учётной записи, письмо с инструкцией будет отправлено. Проверьте почту и папку «Спам».';
const digest = (s: string) => createHash('sha256').update(s).digest('hex');
function invalidLink(): never {
  throw createError({ statusCode: 400, statusMessage: 'INVALID_RESET_LINK', message: 'Ссылка недействительна или истекла. Запросите новую.' });
}
/** Общий для всех процессов лимит в PostgreSQL. IP и proxy-заголовкам не доверяем. */
async function allowRequest(key: string, maximum: number, minutes: number): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ count: number }>>`
    INSERT INTO "password_reset_limits" ("key", "startedAt", "count") VALUES (${key}, NOW(), 1)
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "password_reset_limits"."startedAt" < NOW() - ${minutes} * INTERVAL '1 minute'
        THEN 1 ELSE LEAST("password_reset_limits"."count" + 1, ${maximum + 1}) END,
      "startedAt" = CASE WHEN "password_reset_limits"."startedAt" < NOW() - ${minutes} * INTERVAL '1 minute'
        THEN NOW() ELSE "password_reset_limits"."startedAt" END
    RETURNING "count"`;
  return (rows[0]?.count ?? maximum + 1) <= maximum;
}
export async function requestPasswordReset(event: H3Event, input: unknown) {
  const email = typeof input === 'string' ? input.trim().toLowerCase() : '';
  if (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({ statusCode: 400, message: 'Укажите корректный email.' });
  }
  const response = { success: true, message: RESET_REPLY };
  if (!await allowRequest('request:global', 100, 60)) return response;
  if (!await allowRequest(`email:${digest(email)}`, 3, 60)) return response;
  // Очистка только старых служебных счётчиков, без удаления пользовательских событий.
  await prisma.$executeRaw`DELETE FROM "password_reset_limits" WHERE "startedAt" < NOW() - INTERVAL '2 days'`;
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, authType: true, status: true } });
  if (!user || user.authType !== 'EXTERNAL' || user.status !== 'ACTIVE' || !user.email) return response;
  const token = randomBytes(32).toString('hex');
  const tokenHash = digest(token);
  const now = new Date();
  const issued = await prisma.$transaction(async tx => {
    const changed = await tx.user.updateMany({ where: { id: user.id, email, authType: 'EXTERNAL', status: 'ACTIVE',
      OR: [{ passwordResetRequestedAt: null }, { passwordResetRequestedAt: { lt: new Date(now.getTime() - 60_000) } }],
    }, data: { passwordResetTokenHash: tokenHash, passwordResetExpiresAt: new Date(now.getTime() + 30 * 60_000), passwordResetRequestedAt: now } });
    if (!changed.count) return false;
    await writeAuditEvent({ event, db: tx, category: 'AUTH', action: 'RESET_REQUEST', result: 'SUCCESS',
      entityType: 'User', entityId: user.id, targetUserId: user.id, actorEmail: 'anonymous',
      note: 'Запрошена ссылка восстановления пароля внешнего пользователя. Владение email ещё не подтверждено.' });
    return true;
  }, { maxWait: 10_000, timeout: 30_000 });
  if (!issued) return response;
  try { await sendPasswordResetEmail(email, token); }
  catch {
    // Не выводим SMTP-ошибку целиком: она может содержать письмо/ссылку.
    console.error('[password-reset] SMTP delivery failed');
    await prisma.$transaction(async tx => {
      await tx.user.updateMany({ where: { id: user.id, passwordResetTokenHash: tokenHash },
        data: { passwordResetTokenHash: null, passwordResetExpiresAt: null } });
      await writeAuditEvent({ event, db: tx, category: 'AUTH', action: 'RESET_MAIL', result: 'FAILED',
        entityType: 'User', entityId: user.id, targetUserId: user.id, actorEmail: 'system', note: 'Не удалось отправить письмо восстановления пароля.' });
    });
  }
  return response;
}
export async function completePasswordReset(event: H3Event, input: unknown) {
  const body = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  const token = typeof body.token === 'string' ? body.token : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!/^[a-f0-9]{64}$/.test(token)) invalidLink();
  if (password.length < 12 || password.length > 128) throw createError({ statusCode: 400, message: 'Пароль должен содержать от 12 до 128 символов.' });
  if (!await allowRequest('complete:global', 1000, 15)) throw createError({ statusCode: 429, message: 'Слишком много запросов. Повторите позже.' });
  const tokenHash = digest(token);
  const user = await prisma.user.findUnique({ where: { passwordResetTokenHash: tokenHash },
    select: { id: true, email: true, authType: true, status: true, passwordResetExpiresAt: true } });
  if (!user || user.authType !== 'EXTERNAL' || user.status !== 'ACTIVE' || !user.passwordResetExpiresAt || user.passwordResetExpiresAt <= new Date()) invalidLink();
  // Дорогую операцию выполняем после проверки токена, вне транзакции.
  const passwordHash = await hashSpacePassword(password);
  await prisma.$transaction(async tx => {
    const changed = await tx.user.updateMany({ where: { id: user.id, authType: 'EXTERNAL', status: 'ACTIVE',
      passwordResetTokenHash: tokenHash, passwordResetExpiresAt: { gt: new Date() },
    }, data: { passwordHash, passwordResetTokenHash: null, passwordResetExpiresAt: null,
      externalSessionVersion: { increment: 1 } } });
    if (changed.count !== 1) invalidLink();
    await writeAuditEvent({ event, db: tx, category: 'AUTH', action: 'PASSWORD_RESET', result: 'SUCCESS',
      entityType: 'User', entityId: user.id, targetUserId: user.id, actorUserId: user.id,
      actorEmail: user.email || `user:${user.id}`, actorAuthType: 'EXTERNAL',
      note: 'Пароль изменён по одноразовой ссылке. Прежние сессии отозваны.' });
  }, { maxWait: 10_000, timeout: 30_000 });
  return { success: true, message: 'Пароль изменён. Войдите с новым паролем.' };
}
