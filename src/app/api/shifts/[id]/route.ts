import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function parseId(paramsPromise: Promise<{ id: string }>) {
  const params = await paramsPromise;
  const id = Number(params.id);
  return isNaN(id) ? null : id;
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const id = await parseId(context.params);
  if (!id) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  try {
    const shift = await prisma.shift.findUnique({
      where: { id },
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

    if (!shift) {
      return NextResponse.json({ error: "Plantão não encontrado" }, { status: 404 });
    }

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
  } catch (error) {
    console.error("[shifts:GET:id]", error);
    return NextResponse.json({ error: "Erro ao buscar plantão" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const id = await parseId(context.params);
  if (!id) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

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

    // Verificar se o plantão existe
    const existing = await prisma.shift.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Plantão não encontrado" }, { status: 404 });
    }

    if (!userId || isNaN(userId)) return NextResponse.json({ error: "Usuário é obrigatório" }, { status: 400 });
    if (!normalizedDate || isNaN(normalizedDate.getTime())) return NextResponse.json({ error: "Data de início é obrigatória" }, { status: 400 });

    // Nota: Permitimos múltiplos plantões para o mesmo funcionário no mesmo dia/período
    // (plantões semanais, turnos diferentes, etc.)

    // Validar formato de horário se fornecido
    if (startTime && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(startTime)) {
      return NextResponse.json({ error: "Formato de horário de início inválido (use HH:mm)" }, { status: 400 });
    }
    if (endTime && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(endTime)) {
      return NextResponse.json({ error: "Formato de horário de fim inválido (use HH:mm)" }, { status: 400 });
    }

    const shift = await prisma.shift.update({
      where: { id },
      data: {
        userId,
        date: normalizedDate,
        endDate: normalizedEndDate,
        startTime,
        endTime,
        notes,
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
      startTime: shift.startTime,
      endTime: shift.endTime,
      notes: shift.notes,
      user: shift.user,
      createdBy: shift.createdBy,
      createdAt: shift.createdAt,
      updatedAt: shift.updatedAt,
    });
  } catch (error: any) {
    console.error("[shifts:PUT:id]", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Já existe um plantão para este funcionário nesta data" }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro ao atualizar plantão" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const id = await parseId(context.params);
  if (!id) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  try {
    const existing = await prisma.shift.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Plantão não encontrado" }, { status: 404 });
    }

    await prisma.shift.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[shifts:DELETE:id]", error);
    return NextResponse.json({ error: "Erro ao excluir plantão" }, { status: 500 });
  }
}

