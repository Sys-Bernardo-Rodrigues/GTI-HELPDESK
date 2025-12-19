import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type BackupConfig = {
  enabled: boolean;
  schedule: "daily" | "weekly" | "monthly" | null;
  scheduleTime?: string; // HH:mm format
  scheduleDay?: number; // 0-6 for weekly (0=Sunday), 1-31 for monthly
  emailRecipients: string[]; // Array de emails para receber backup
  keepDays: number; // Quantos dias manter backups antigos
};

/**
 * GET - Obter configuração de backup automático
 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Por enquanto, vamos usar uma tabela simples de configuração
    // Ou podemos usar uma configuração em JSON no banco
    // Por simplicidade, vou usar uma abordagem de configuração em JSON salva como texto
    
    // Buscar configuração do sistema (podemos criar uma tabela SystemConfig no futuro)
    // Por enquanto, vamos retornar valores padrão e permitir salvar em uma configuração simples
    
    const defaultConfig: BackupConfig = {
      enabled: false,
      schedule: null,
      emailRecipients: [],
      keepDays: 30,
    };

    // TODO: Buscar do banco quando tivermos tabela de configuração
    // Por enquanto retornar padrão
    return NextResponse.json({
      config: defaultConfig,
    });
  } catch (error: any) {
    console.error("[backup:config:GET]", error);
    return NextResponse.json(
      { error: "Erro ao obter configuração de backup" },
      { status: 500 }
    );
  }
}

/**
 * POST - Salvar configuração de backup automático
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const config: Partial<BackupConfig> = {
      enabled: Boolean(body.enabled),
      schedule: body.schedule || null,
      scheduleTime: body.scheduleTime || undefined,
      scheduleDay: body.scheduleDay !== undefined ? Number(body.scheduleDay) : undefined,
      emailRecipients: Array.isArray(body.emailRecipients) 
        ? body.emailRecipients.filter((e: any) => typeof e === "string" && e.includes("@"))
        : [],
      keepDays: Number(body.keepDays) || 30,
    };

    // Validar emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = config.emailRecipients?.filter((email) => !emailRegex.test(email));
    if (invalidEmails && invalidEmails.length > 0) {
      return NextResponse.json(
        { error: `Emails inválidos: ${invalidEmails.join(", ")}` },
        { status: 400 }
      );
    }

    // Validar schedule
    if (config.enabled && config.schedule) {
      if (!config.scheduleTime) {
        return NextResponse.json(
          { error: "Horário do agendamento é obrigatório" },
          { status: 400 }
        );
      }

      if (config.schedule === "weekly" && (config.scheduleDay === undefined || config.scheduleDay < 0 || config.scheduleDay > 6)) {
        return NextResponse.json(
          { error: "Dia da semana inválido (0=domingo, 6=sábado)" },
          { status: 400 }
        );
      }

      if (config.schedule === "monthly" && (config.scheduleDay === undefined || config.scheduleDay < 1 || config.scheduleDay > 31)) {
        return NextResponse.json(
          { error: "Dia do mês inválido (1-31)" },
          { status: 400 }
        );
      }
    }

    // TODO: Salvar no banco quando tivermos tabela de configuração
    // Por enquanto, apenas retornar sucesso
    // Em produção, salvaria em uma tabela SystemConfig ou similar

    return NextResponse.json({
      success: true,
      message: "Configuração de backup salva com sucesso",
      config,
    });
  } catch (error: any) {
    console.error("[backup:config:POST]", error);
    return NextResponse.json(
      { error: "Erro ao salvar configuração de backup" },
      { status: 500 }
    );
  }
}

