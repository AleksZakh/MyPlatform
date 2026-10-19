import nodemailer from 'nodemailer';
export async function sendChatInvitationEmail(email: string, senderName: string, project?: {id: number; name: string}) {
 const config = useRuntimeConfig();
 const site = new URL(String(config.siteUrl || ''));
 if (site.protocol !== 'https:' && !(process.env.NODE_ENV === 'development' && site.hostname === 'localhost')) throw new Error('HTTPS siteUrl required');
 const smtp = config.smtp;
 if (!smtp.host || !smtp.from) throw new Error('SMTP not configured');
 const transport = nodemailer.createTransport({
  host: String(smtp.host), port: Number(smtp.port || 587), secure: smtp.secure === true || String(smtp.secure) === 'true',
  connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
  ...(smtp.user && smtp.password ? { auth: { user: String(smtp.user), pass: String(smtp.password) } } : {}),
 });
 try {
  const info = await transport.sendMail({ from: String(smtp.from), to: email, subject: project ? 'Space — приглашение в проект' : 'Space — приглашение к общению',
   text: `${senderName} ${project ? `приглашает вас в проект «${project.name}» в Space` : 'приглашает вас к общению в Space'}.

Откройте ${new URL(project ? '/login?redirect=' + encodeURIComponent('/projects?invitations=1') : '/login', site).href}
Войдите через корпоративную учётную запись (автоматический доменный вход или доменный логин и пароль). После проверки AD ваша ожидающая активации запись будет активирована.

${project ? 'После входа откройте «Задачи и проекты» → «Приглашения» и примите приглашение. До принятия доступ к проекту не предоставляется.\n\n' : ''}Приглашение действует 7 дней. Пароль по электронной почте передавать не нужно.`,
  });
  if (!info.accepted?.length) throw new Error('Recipient was not accepted');
 } finally { transport.close(); }
}
