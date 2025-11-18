import nodemailer from "nodemailer";

const isEmailEnabled = process.env.EMAIL_ENABLED === "true";

let transporter: nodemailer.Transporter | null = null;

if (isEmailEnabled) {
  const port = parseInt(process.env.SMTP_PORT || "587");
  const secure = process.env.SMTP_SECURE === "true";
  
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: port,
    secure: secure, // true para porta 465, false para outras portas
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    // Configurações adicionais para compatibilidade com cPanel
    tls: {
      // Não rejeitar certificados não autorizados (útil para desenvolvimento)
      rejectUnauthorized: process.env.NODE_ENV === "production",
    },
  });
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  if (!isEmailEnabled || !transporter) {
    console.warn("Email não está habilitado. Configure EMAIL_ENABLED=true no .env");
    return false;
  }

  try {
    const from = process.env.EMAIL_FROM || process.env.SMTP_USER || "noreply@witchdesk.com";
    const fromName = process.env.EMAIL_FROM_NAME || "WitchDesk";

    await transporter.sendMail({
      from: `"${fromName}" <${from}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ""),
    });

    return true;
  } catch (error) {
    console.error("Erro ao enviar email:", error);
    return false;
  }
}

export function generateCode(length: number = 6): string {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join("");
}

export async function sendPasswordResetEmail(email: string, token: string, userName?: string | null): Promise<boolean> {
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>WitchDesk</h1>
        </div>
        <div class="content">
          <h2>Recuperação de Senha</h2>
          <p>Olá${userName ? `, ${userName}` : ""},</p>
          <p>Recebemos uma solicitação para redefinir a senha da sua conta no WitchDesk.</p>
          <p>Clique no botão abaixo para criar uma nova senha:</p>
          <p style="text-align: center;">
            <a href="${resetUrl}" class="button">Redefinir Senha</a>
          </p>
          <p>Ou copie e cole o link abaixo no seu navegador:</p>
          <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
          <p><strong>Este link expira em 1 hora.</strong></p>
          <p>Se você não solicitou esta recuperação de senha, ignore este email.</p>
        </div>
        <div class="footer">
          <p>Este é um email automático, por favor não responda.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: "Recuperação de Senha - WitchDesk",
    html,
  });
}

export async function sendEmailVerificationEmail(email: string, token: string, userName?: string): Promise<boolean> {
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const verifyUrl = `${appUrl}/api/profile/email/verify?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>WitchDesk</h1>
        </div>
        <div class="content">
          <h2>Verificação de E-mail</h2>
          <p>Olá${userName ? `, ${userName}` : ""},</p>
          <p>Você solicitou a alteração do seu endereço de e-mail no WitchDesk.</p>
          <p>Clique no botão abaixo para confirmar o novo e-mail:</p>
          <p style="text-align: center;">
            <a href="${verifyUrl}" class="button">Confirmar E-mail</a>
          </p>
          <p>Ou copie e cole o link abaixo no seu navegador:</p>
          <p style="word-break: break-all; color: #667eea;">${verifyUrl}</p>
          <p><strong>Este link expira em 24 horas.</strong></p>
          <p>Se você não solicitou esta alteração, ignore este email.</p>
        </div>
        <div class="footer">
          <p>Este é um email automático, por favor não responda.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: "Verificação de E-mail - WitchDesk",
    html,
  });
}

export async function sendTwoFactorCodeEmail(email: string, code: string, userName?: string): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .code { font-size: 32px; font-weight: bold; text-align: center; letter-spacing: 8px; color: #667eea; background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px dashed #667eea; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>WitchDesk</h1>
        </div>
        <div class="content">
          <h2>Código de Verificação</h2>
          <p>Olá${userName ? `, ${userName}` : ""},</p>
          <p>Você está tentando fazer login no WitchDesk. Use o código abaixo para completar a autenticação:</p>
          <div class="code">${code}</div>
          <p><strong>Este código expira em 10 minutos.</strong></p>
          <p>Se você não tentou fazer login, ignore este email e considere alterar sua senha.</p>
        </div>
        <div class="footer">
          <p>Este é um email automático, por favor não responda.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: "Código de Verificação - WitchDesk",
    html,
  });
}

export async function sendNotificationEmail(
  email: string,
  title: string,
  message: string,
  type: "ticket" | "approval" | "event",
  link?: string,
  userName?: string | null
): Promise<boolean> {
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const actionUrl = link || appUrl;

  const icons: Record<string, string> = {
    ticket: "🎫",
    approval: "✅",
    event: "📅",
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        .message { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${icons[type]} WitchDesk</h1>
        </div>
        <div class="content">
          <h2>${title}</h2>
          <p>Olá${userName ? `, ${userName}` : ""},</p>
          <div class="message">
            ${message.split("\n").map((line) => `<p>${line}</p>`).join("")}
          </div>
          ${link ? `
          <p style="text-align: center;">
            <a href="${actionUrl}" class="button">Ver Detalhes</a>
          </p>
          ` : ""}
        </div>
        <div class="footer">
          <p>Este é um email automático, por favor não responda.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `${title} - WitchDesk`,
    html,
  });
}

export async function sendEventNotificationEmail(
  email: string,
  event: { title: string; description?: string | null; startDate: Date | string; endDate: Date | string; location?: string | null },
  userName?: string | null
): Promise<boolean> {
  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);
  const dateStr = startDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const timeStr = startDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const message = `
    Um novo evento foi adicionado à agenda:<br><br>
    <strong>${event.title}</strong><br>
    ${event.description ? `<br>${event.description}<br>` : ""}
    <br>
    📅 Data: ${dateStr}<br>
    ⏰ Horário: ${timeStr}<br>
    ${event.location ? `📍 Local: ${event.location}<br>` : ""}
  `;

  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return sendNotificationEmail(email, "Novo Evento na Agenda", message, "event", `${appUrl}/agenda`, userName);
}

export async function sendApprovalNotificationEmail(
  email: string,
  approval: { formTitle: string; submissionId: number; status: "APPROVED" | "REJECTED" },
  userName?: string | null
): Promise<boolean> {
  const statusText = approval.status === "APPROVED" ? "aprovado" : "rejeitado";
  const message = `
    Uma aprovação foi processada:<br><br>
    <strong>Formulário: ${approval.formTitle}</strong><br>
    Status: ${statusText === "aprovado" ? "✅ Aprovado" : "❌ Rejeitado"}<br>
    ID da Submissão: #${approval.submissionId}
  `;

  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return sendNotificationEmail(email, `Aprovação ${statusText}`, message, "approval", `${appUrl}/aprovacoes`, userName);
}

export async function sendTicketNotificationEmail(
  email: string,
  ticket: { id: number; title: string; status?: string; assignedTo?: string | null },
  type: "created" | "assigned" | "updated",
  userName?: string | null
): Promise<boolean> {
  let title = "";
  let message = "";

  switch (type) {
    case "created":
      title = "Novo Ticket Criado";
      message = `Um novo ticket foi criado no sistema:<br><br><strong>${ticket.title}</strong><br>ID: #${ticket.id}`;
      break;
    case "assigned":
      title = "Ticket Atribuído";
      message = `Um ticket foi atribuído a você:<br><br><strong>${ticket.title}</strong><br>ID: #${ticket.id}`;
      break;
    case "updated":
      title = "Ticket Atualizado";
      message = `Um ticket foi atualizado:<br><br><strong>${ticket.title}</strong><br>ID: #${ticket.id}${ticket.status ? `<br>Status: ${ticket.status}` : ""}`;
      break;
  }

  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return sendNotificationEmail(email, title, message, "ticket", `${appUrl}/tickets`, userName);
}

