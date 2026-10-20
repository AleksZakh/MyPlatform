import nodemailer from 'nodemailer';
export function sendChatInvitationEmail(email: string, senderName: string, project?: {id: number; name: string}) {
 return sendInvitationEmail(email, senderName, project, true);
}
export function sendProjectNotificationEmail(email: string, senderName: string, project: {id: number; name: string}) {
 return sendInvitationEmail(email, senderName, project, false);
}
async function sendInvitationEmail(email: string, senderName: string, project: {id: number; name: string} | undefined, activation: boolean) {
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
   text: !activation && project ? `${senderName} приглашает вас в проект «${project.name}» в Space.\n\nОткройте ${new URL('/projects?invitations=1', site).href}\nВойдите в свою учётную запись Space, откройте «Приглашения» и примите или отклоните приглашение. Доступ к проекту появится только после принятия.\n\nПриглашение действует 7 дней.` : `${senderName} ${project ? `приглашает вас в проект «${project.name}» в Space` : 'приглашает вас к общению в Space'}.

Откройте ${new URL(project ? '/login?redirect=' + encodeURIComponent('/projects?invitations=1') : '/login', site).href}
Войдите через корпоративную учётную запись (автоматический доменный вход или доменный логин и пароль). После проверки AD ваша ожидающая активации запись будет активирована.

${project ? 'После входа откройте «Задачи и проекты» → «Приглашения» и примите приглашение. До принятия доступ к проекту не предоставляется.\n\n' : ''}Приглашение действует 7 дней. Пароль по электронной почте передавать не нужно.`,
  });
  if (!info.accepted?.length) throw Object.assign(new Error('Recipient was not accepted'), {code:'RECIPIENT_REJECTED'});
  return { messageId: String(info.messageId || '').slice(0,500) || null };
 } finally { transport.close(); }
}
