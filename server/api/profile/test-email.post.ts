import { createError } from 'h3';
import { profileActor } from '../../services/profile-details';
import { sendProfileTestMail } from '../../utils/profile-test-mail';

// One SMTP delivery test per account per minute, including failed attempts.
const lastAttempt = new Map<number, number>();
const cooldown = 60_000;

export default defineEventHandler(async event => {
  const actor = await profileActor(event, true);
  const email = actor.email?.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({ statusCode: 400, message: 'В вашей учётной записи не указан корректный адрес электронной почты.' });
  }

  const now = Date.now();
  const previous = lastAttempt.get(actor.id) ?? 0;
  if (now - previous < cooldown) {
    throw createError({ statusCode: 429, message: 'Повторную отправку можно выполнить через минуту.' });
  }
  lastAttempt.set(actor.id, now);
  if (lastAttempt.size > 1000) {
    for (const [userId, time] of lastAttempt) {
      if (now - time >= cooldown) lastAttempt.delete(userId);
    }
  }

  try {
    await sendProfileTestMail(email);
  } catch (cause) {
    console.error('[PROFILE] Test email sending failed:', cause instanceof Error ? cause.message : 'unknown error');
    throw createError({ statusCode: 502, message: 'Почтовый сервер не подтвердил отправку. Проверьте настройки SMTP или повторите попытку позже.' });
  }

  return { message: 'Почтовый сервер принял тестовое письмо. Проверьте входящие сообщения и папку «Спам».' };
});
