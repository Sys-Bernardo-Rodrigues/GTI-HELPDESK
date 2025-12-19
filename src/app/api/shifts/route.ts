import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const searchParams = req.nextUrl.searchParams;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  try {
    const where: any = {};

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Buscar plantões que se sobrepõem ao período:
      // - Plantões que começam dentro do período
      // - Plantões que terminam dentro do período
      // - Plantões que começam antes e terminam depois do período
      where.OR = [
        {
          AND: [
            { date: { gte: start, lte: end } },
          ],
        },
        {
          AND: [
            { endDate: { gte: start, lte: end } },
          ],
        },
        {
          AND: [
            { date: { lte: start } },
            {
              OR: [
                { endDate: { gte: end } },
                { endDate: null },
              ],
            },
          ],
        },
      ];
    }

    const shifts = await prisma.shift.findMany({
      where,
      orderBy: { date: "asc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            jobTitle: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const items = shifts.map((shift) => ({
      id: shift.id,
      userId: shift.userId,
      date: shift.date,
      endDate: shift.endDate,
      startTime: shift.startTime,
      endTime: shift.endTime,
      notes: shift.notes,
      user: {
        id: shift.user.id,
        name: shift.user.name,
        email: shift.user.email,
        avatarUrl: shift.user.avatarUrl,
        jobTitle: shift.user.jobTitle,
      },
      createdBy: {
        id: shift.createdBy.id,
        name: shift.createdBy.name,
        email: shift.createdBy.email,
      },
      createdAt: shift.createdAt,
      updatedAt: shift.updatedAt,
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error("[shifts:GET]", error);
    return NextResponse.json({ error: "Erro ao buscar plantões" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

    const userId = typeof body.userId === "number" ? body.userId : Number(body.userId);
    
    // Função helper para parsear data sem problemas de timezone
    // Recebe uma string no formato "YYYY-MM-DD" e retorna uma Date no timezone local
    function parseDateWithoutTimezone(dateStr: string): Date {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day); // month é 0-indexed no Date
    }
    
    let normalizedDate: Date | null = null;
    let normalizedEndDate: Date | null = null;
    
    if (body.date) {
      const dateStr = String(body.date);
      // Se for uma string no formato YYYY-MM-DD, parsear diretamente
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        normalizedDate = parseDateWithoutTimezone(dateStr);
      } else {
        // Caso contrário, tentar usar new Date normalmente
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        }
      }
    }
    
    if (body.endDate) {
      const endDateStr = String(body.endDate);
      // Se for uma string no formato YYYY-MM-DD, parsear diretamente
      if (/^\d{4}-\d{2}-\d{2}$/.test(endDateStr)) {
        normalizedEndDate = parseDateWithoutTimezone(endDateStr);
      } else {
        // Caso contrário, tentar usar new Date normalmente
        const endDate = new Date(endDateStr);
        if (!isNaN(endDate.getTime())) {
          normalizedEndDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
        }
      }
    }
    
    const startTime = typeof body.startTime === "string" ? body.startTime.trim() || null : null;
    const endTime = typeof body.endTime === "string" ? body.endTime.trim() || null : null;
    const notes = typeof body.notes === "string" ? body.notes.trim() || null : null;

    if (!userId || isNaN(userId)) return NextResponse.json({ error: "Usuário é obrigatório" }, { status: 400 });
    if (!normalizedDate || isNaN(normalizedDate.getTime())) return NextResponse.json({ error: "Data de início é obrigatória" }, { status: 400 });

    // Nota: Permitimos múltiplos plantões para o mesmo funcionário no mesmo dia/período
    // (plantões semanais, turnos diferentes, etc.)

    // Validar formato de horário se fornecido (HH:mm)
    if (startTime && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(startTime)) {
      return NextResponse.json({ error: "Formato de horário de início inválido (use HH:mm)" }, { status: 400 });
    }
    if (endTime && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(endTime)) {
      return NextResponse.json({ error: "Formato de horário de fim inválido (use HH:mm)" }, { status: 400 });
    }

    const shift = await prisma.shift.create({
      data: {
        userId,
        date: normalizedDate,
        endDate: normalizedEndDate,
        startTime,
        endTime,
        notes,
        createdById: user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            jobTitle: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      id: shift.id,
      userId: shift.userId,
      date: shift.date,
      endDate: shift.endDate,
      startTime: shift.startTime,
      endTime: shift.endTime,
      notes: shift.notes,
      user: shift.user,
      createdBy: shift.createdBy,
      createdAt: shift.createdAt,
      updatedAt: shift.updatedAt,
    });
  } catch (error: any) {
    console.error("[shifts:POST]", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Já existe um plantão para este funcionário nesta data" }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro ao criar plantão" }, { status: 500 });
  }
}

