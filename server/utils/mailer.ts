import nodemailer from 'nodemailer';

type SendVerificationEmailParams = {
  email: string;
  fullName: string;
  token: string;
};

type SendActivationEmailParams = {
  email: string;
  fullName: string;
  token: string;
};

export const sendActivationEmail = async ({
  email,
  fullName,
  token,
}: SendActivationEmailParams) => {
  const config = useRuntimeConfig();

  const host = String(config.smtp.host || '');
  const port = Number(config.smtp.port || 587);
  const secure = Boolean(config.smtp.secure);

  const user = String(config.smtp.user || '');
  const password = String(config.smtp.password || '');
  const from = String(config.smtp.from || '');

  const siteUrl = String(
    config.siteUrl || '',
  ).replace(/\/$/, '');

  if (!host) {
    throw new Error(
      'SMTP host is not configured',
    );
  }

  if (!from) {
    throw new Error(
      'SMTP sender address is not configured',
    );
  }

  if (!siteUrl) {
    throw new Error(
      'Application site URL is not configured',
    );
  }

  const transporter =
    nodemailer.createTransport({
      host,
      port,
      secure,

      ...(user && password
        ? {
            auth: {
              user,
              pass: password,
            },
          }
        : {}),
    });

  const activationUrl =
    `${siteUrl}/activate-account?token=${encodeURIComponent(token)}`;

  await transporter.sendMail({
    from,
    to: email,

    subject:
      'Space — активация учётной записи',

    text: [
      `Здравствуйте, ${fullName}!`,
      '',
      'Ваша заявка на доступ к Space одобрена.',
      '',
      'Для активации учётной записи и установки пароля перейдите по ссылке:',
      activationUrl,
      '',
      'Ссылка действует 24 часа.',
      '',
      `Ваш логин: ${email}`,
      '',
      'Если вы не подавали заявку на доступ, обратитесь к администратору.',
    ].join('\n'),

    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2>Активация учётной записи Space</h2>

        <p>
          Здравствуйте, ${escapeHtml(fullName)}!
        </p>

        <p>
          Ваша заявка на доступ к
          <strong>Space</strong> одобрена.
        </p>

        <p>
          Для активации учётной записи
          и установки пароля нажмите кнопку:
        </p>

        <p style="margin: 28px 0;">
          <a
            href="${activationUrl}"
            style="
              background: #0ea5e9;
              color: white;
              padding: 12px 20px;
              text-decoration: none;
              border-radius: 6px;
              display: inline-block;
            "
          >
            Активировать учётную запись
          </a>
        </p>

        <p>
          Ваш логин:
          <strong>${escapeHtml(email)}</strong>
        </p>

        <p>
          Ссылка действует 24 часа.
        </p>

        <p style="color: #666; font-size: 13px;">
          Если вы не подавали заявку на доступ,
          обратитесь к администратору.
        </p>
      </div>
    `,
  });
};

export const sendVerificationEmail = async ({
  email,
  fullName,
  token,
}: SendVerificationEmailParams) => {
  const config = useRuntimeConfig();
  // console.log('[sendVerificationEmail] config:', config)

  const host = String(config.smtp.host || '');
  const port = Number(config.smtp.port || 587);
  const secure = Boolean(config.smtp.secure);

  const user = String(config.smtp.user || '');
  const password = String(config.smtp.password || '');
  const from = String(config.smtp.from || '');

  const appBaseUrl = String(
    config.siteUrl || '',
  ).replace(/\/$/, '');

  // console.log('[sendVerificationEmail] config:', appBaseUrl)
  if (!host) {
    throw new Error(
      'SMTP host is not configured',
    );
  }

  if (!from) {
    throw new Error(
      'SMTP sender address is not configured',
    );
  }

  if (!appBaseUrl) {
    throw new Error(
      'Application base URL is not configured',
    );
  }

  const transporter =
    nodemailer.createTransport({
      host,
      port,
      secure,

      ...(user && password
        ? {
            auth: {
              user,
              pass: password,
            },
          }
        : {}),
    });

  const verificationUrl =
    `${appBaseUrl}/verify-email?token=${encodeURIComponent(token)}`;

  await transporter.sendMail({
    from,
    to: email,

    subject:
      'Space — подтверждение электронной почты',

    text: [
      `Здравствуйте, ${fullName}!`,
      '',
      'Вы отправили заявку на регистрацию в Space.',
      '',
      'Для подтверждения электронной почты перейдите по ссылке:',
      verificationUrl,
      '',
      'Ссылка действует 24 часа.',
      '',
      'Если вы не отправляли заявку, просто проигнорируйте это письмо.',
    ].join('\n'),

    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2>Подтверждение электронной почты</h2>

        <p>
          Здравствуйте, ${escapeHtml(fullName)}!
        </p>

        <p>
          Вы отправили заявку на регистрацию
          в рабочем пространстве <strong>Space</strong>.
        </p>

        <p>
          Для подтверждения электронной почты
          нажмите кнопку:
        </p>

        <p style="margin: 28px 0;">
          <a
            href="${verificationUrl}"
            style="
              background: #0ea5e9;
              color: white;
              padding: 12px 20px;
              text-decoration: none;
              border-radius: 6px;
              display: inline-block;
            "
          >
            Подтвердить email
          </a>
        </p>

        <p>
          Ссылка действует 24 часа.
        </p>

        <p style="color: #666; font-size: 13px;">
          Если вы не отправляли заявку,
          просто проигнорируйте это письмо.
        </p>
      </div>
    `,
  });
};


const escapeHtml = (
  value: string,
): string => {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
};