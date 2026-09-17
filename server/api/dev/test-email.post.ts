import { sendVerificationEmail } from '../../utils/mailer';

type TestEmailBody = {
  email?: unknown;
};

export default defineEventHandler(async (event) => {
  // Этот endpoint разрешаем использовать только в development.
  if (!import.meta.dev) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not found',
    });
  }

  const body =
    await readBody<TestEmailBody>(event);

  if (
    typeof body?.email !== 'string' ||
    !body.email.trim()
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation error',
      message:
        'Необходимо указать email для тестовой отправки.',
    });
  }

  const email =
    body.email.trim().toLowerCase();

  const testToken =
    'test-email-verification-token';

  try {
    await sendVerificationEmail({
      email,
      fullName: 'Тестовый пользователь',
      token: testToken,
    });

    return {
      success: true,
      email,
      message:
        'Тестовое письмо успешно отправлено.',
    };
  }
  catch (error) {
    console.error(
      'Ошибка тестовой отправки email:',
      error,
    );

    throw createError({
      statusCode: 500,
      statusMessage: 'Email sending error',
      message:
        'Не удалось отправить тестовое письмо.',
    });
  }
});