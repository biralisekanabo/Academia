import 'server-only';

import nodemailer from 'nodemailer';

type SendMailParams = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
};

function buildTransport() {
  const host = process.env.MAIL_HOST;
  const port = process.env.MAIL_PORT ? Number(process.env.MAIL_PORT) : undefined;
  const user = process.env.MAIL_USERNAME;
  const pass = process.env.MAIL_PASSWORD;
  const secure = process.env.MAIL_ENCRYPTION === 'ssl' || process.env.MAIL_ENCRYPTION === 'tls' || port === 465;

  if (host && port && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }

  return nodemailer.createTransport({
    host: 'localhost',
    port: 1025,
    secure: false,
    ignoreTLS: true,
  });
}

export async function envoyerMail(params: SendMailParams) {
  const transport = buildTransport();
  const from = process.env.MAIL_FROM_ADDRESS || process.env.MAIL_USERNAME || 'no-reply@academia.local';
  const fromName = process.env.MAIL_FROM_NAME || 'Academia';

  await transport.sendMail({
    from: `${fromName} <${from}>`,
    to: params.to,
    subject: params.subject,
    text: params.text,
    html: params.html,
  });
}

