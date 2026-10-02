import nodemailer from 'nodemailer';
export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const config = useRuntimeConfig();
  const site = new URL(String(config.siteUrl || ''));
  if (site.protocol !== 'https:' && !(process.env.NODE_ENV === 'development' && site.hostname === 'localhost')) {
    throw new Error('Password reset requires an HTTPS siteUrl');
  }
  const smtp = config.smtp;
  if (!smtp.host || !smtp.from) throw new Error('SMTP is not configured');
  // Фрагмент не передаётся серверу и не попадает в access.log при открытии страницы.
  const link = new URL('/reset-password', site);
  link.hash = `token=${token}`;
  const transport = nodemailer.createTransport({
    host: String(smtp.host), port: Number(smtp.port || 587), secure: Boolean(smtp.secure),
    connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 15_000,
    ...(smtp.user && smtp.password ? { auth: { user: String(smtp.user), pass: String(smtp.password) } } : {}),
  });
  try {
    await transport.sendMail({ from: String(smtp.from), to: email,
      subject: 'Space — восстановление пароля',
      text: `Для установки нового пароля Space перейдите по ссылке:\n\n${link.href}\n\nСсылка действует 30 минут и используется один раз.\nЕсли вы не запрашивали смену пароля, проигнорируйте письмо. Текущий пароль остаётся действующим.`,
    });
  } finally { transport.close(); }
}
