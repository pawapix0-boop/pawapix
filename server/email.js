const nodemailer = require('nodemailer');

const sender = (process.env.EMAIL_FROM || 'agenezico12@gmail.com').trim();
const transporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || 'false') === 'true',
      pool: true,
      maxConnections: Number(process.env.SMTP_MAX_CONNECTIONS || 2),
      maxMessages: Number(process.env.SMTP_MAX_MESSAGES || 100),
      family: 4,
      connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT || 5000),
      greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT || 5000),
      socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT || 10000),
      auth: process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER.trim(), pass: process.env.SMTP_PASS.replace(/\s+/g, '') }
        : undefined
    })
  : null;

async function sendEmail({ to, subject, text, html }) {
  if (!transporter) {
    console.warn(`[email] SMTP is not configured. Intended recipient: ${to}; subject: ${subject}`);
    return { delivered: false, configured: false };
  }

  try {
    await transporter.sendMail({ from: sender, to, subject, text, html });
    return { delivered: true, configured: true };
  } catch (error) {
    console.error(`[email] Unable to send to ${to}:`, error.message);
    return { delivered: false, configured: true, error: error.message };
  }
}

module.exports = { sendEmail, sender };
