import nodemailer from 'nodemailer';

/** Send a delivery test through the same SMTP configuration as other Space mail. */
export async function sendProfileTestMail(to: string): Promise<void> {
  const { smtp } = useRuntimeConfig();
  if (!smtp.host || !smtp.from) {
    throw new Error('SMTP_NOT_CONFIGURED');
  }

  const transport = nodemailer.createTransport({
    host: String(smtp.host),
    port: Number(smtp.port || 587),
    secure: smtp.secure === true || String(smtp.secure) === 'true',
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    ...(smtp.user && smtp.password
      ? { auth: { user: String(smtp.user), pass: String(smtp.password) } }
      : {}),
  });

  try {
    const info = await transport.sendMail({
      from: String(smtp.from),
      to,
      subject: 'Space — тестовое уведомление',
      text: [
        'Здравствуйте!',
        '',
        'Это тестовое письмо из личного кабинета Space.',
        'Если вы получили его, почтовый сервер успешно доставил уведомление.',
        '',
        'Никаких действий предпринимать не нужно.',
        'Корпоративный портал Space',
      ].join('\n'),
    });
    if (!info.accepted?.length) throw new Error('SMTP_RECIPIENT_REJECTED');
  } finally {
    transport.close();
  }
}
