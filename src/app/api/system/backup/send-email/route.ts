import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { readFile } from "fs/promises";
import path from "path";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";

/**
 * Envia backup por email
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const filename = typeof body.filename === "string" ? body.filename : null;
    const recipients = Array.isArray(body.recipients) 
      ? body.recipients.filter((e: any) => typeof e === "string" && e.includes("@"))
      : [];

    if (!filename) {
      return NextResponse.json({ error: "Nome do arquivo é obrigatório" }, { status: 400 });
    }

    if (!recipients || recipients.length === 0) {
      return NextResponse.json({ error: "Pelo menos um email destinatário é obrigatório" }, { status: 400 });
    }

    // Validar nome do arquivo
    if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return NextResponse.json({ error: "Nome de arquivo inválido" }, { status: 400 });
    }

    if (!filename.endsWith(".sql")) {
      return NextResponse.json({ error: "Tipo de arquivo inválido" }, { status: 400 });
    }

    const backupsDir = path.join(process.cwd(), "backups");
    const filePath = path.join(backupsDir, filename);

    // Ler arquivo
    let fileBuffer: Buffer;
    try {
      fileBuffer = await readFile(filePath);
    } catch {
      return NextResponse.json({ error: "Arquivo de backup não encontrado" }, { status: 404 });
    }

    // Verificar se email está habilitado
    const emailEnabled = process.env.EMAIL_ENABLED === "true";
    if (!emailEnabled) {
      return NextResponse.json(
        { error: "Envio de email não está habilitado. Configure EMAIL_ENABLED=true no .env" },
        { status: 400 }
      );
    }

    // Validar emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = recipients.filter((email) => !emailRegex.test(email));
    if (invalidEmails.length > 0) {
      return NextResponse.json(
        { error: `Emails inválidos: ${invalidEmails.join(", ")}` },
        { status: 400 }
      );
    }

    // Enviar email com anexo
    try {
      const emailSubject = `Backup RootDesk - ${filename}`;
      const emailText = `
Olá,

Este é um backup automático do sistema RootDesk.

Arquivo: ${filename}
Data: ${new Date().toLocaleString("pt-BR")}
Tamanho: ${formatBytes(fileBuffer.length)}

Este é um email automático, por favor não responda.
      `.trim();

      // Importar nodemailer dinamicamente
      const nodemailer = await import("nodemailer");
      
      // Configurar transportador
      const transporter = nodemailer.default.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });

      // Enviar para cada destinatário
      const sendPromises = recipients.map((recipient: string) =>
        transporter.sendMail({
          from: `${process.env.EMAIL_FROM_NAME || "RootDesk"} <${process.env.EMAIL_FROM}>`,
          to: recipient,
          subject: emailSubject,
          text: emailText,
          attachments: [
            {
              filename,
              content: fileBuffer,
              contentType: "application/sql",
            },
          ],
        })
      );

      await Promise.all(sendPromises);

      return NextResponse.json({
        success: true,
        message: `Backup enviado para ${recipients.length} destinatário(s)`,
        recipients,
      });
    } catch (error: any) {
      console.error("[backup:send-email] Erro ao enviar email:", error);
      return NextResponse.json(
        { error: `Erro ao enviar email: ${error.message || "Erro desconhecido"}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("[backup:send-email]", error);
    return NextResponse.json(
      { error: "Erro ao processar envio de backup por email" },
      { status: 500 }
    );
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
}

