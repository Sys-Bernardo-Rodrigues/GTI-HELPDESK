import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/encryption";
import { hasPermission } from "@/lib/permissions";

type ParamsPromise = Promise<{ id: string }>;

function sanitizeString(input: unknown, maxLength: number = 500): string {
  if (typeof input !== "string") return "";
  return input.slice(0, maxLength).trim();
}

function mapPasswordResponse(password: {
  id: number;
  title: string;
  username: string | null;
  password: string;
  url: string | null;
  notes: string | null;
  category: string | null;
  tags: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy: { id: number; name: string | null; email: string | null } | null;
}) {
  try {
    // Descriptografar senha e outros campos sensíveis
    let decryptedPassword = "";
    let decryptedUsername: string | null = null;
    let decryptedNotes: string | null = null;

    // Descriptografar senha (obrigatório)
    if (password.password && password.password.trim()) {
      try {
        decryptedPassword = decrypt(password.password).toString("utf8");
      } catch (error: any) {
        console.warn(`Erro ao descriptografar senha do registro ${password.id}:`, error?.message);
        decryptedPassword = ""; // Fallback para string vazia
      }
    }

    // Descriptografar username (opcional)
    if (password.username && password.username.trim()) {
      try {
        decryptedUsername = decrypt(password.username).toString("utf8");
      } catch (error: any) {
        console.warn(`Erro ao descriptografar username do registro ${password.id}:`, error?.message);
        decryptedUsername = null; // Fallback para null
      }
    }

    // Descriptografar notes (opcional)
    if (password.notes && password.notes.trim()) {
      try {
        decryptedNotes = decrypt(password.notes).toString("utf8");
      } catch (error: any) {
        console.warn(`Erro ao descriptografar notes do registro ${password.id}:`, error?.message);
        decryptedNotes = null; // Fallback para null
      }
    }

    return {
      id: password.id,
      title: password.title ?? "",
      username: decryptedUsername,
      password: decryptedPassword,
      url: password.url ?? null,
      notes: decryptedNotes,
      category: password.category ?? null,
      tags: password.tags ?? null,
      createdAt: typeof password.createdAt === "string" ? password.createdAt : password.createdAt?.toISOString?.() ?? "",
      updatedAt: typeof password.updatedAt === "string" ? password.updatedAt : password.updatedAt?.toISOString?.() ?? "",
      createdBy: password.createdBy ? {
        id: password.createdBy.id,
        name: password.createdBy.name,
        email: password.createdBy.email,
      } : null,
    };
  } catch (error: any) {
    console.error(`Erro crítico ao mapear senha ${password.id}:`, error?.message);
    // Retornar dados básicos mesmo em caso de erro crítico
    return {
      id: password.id,
      title: password.title ?? "",
      username: null,
      password: "",
      url: password.url ?? null,
      notes: null,
      category: password.category ?? null,
      tags: password.tags ?? null,
      createdAt: typeof password.createdAt === "string" ? password.createdAt : password.createdAt?.toISOString?.() ?? "",
      updatedAt: typeof password.updatedAt === "string" ? password.updatedAt : password.updatedAt?.toISOString?.() ?? "",
      createdBy: password.createdBy ? {
        id: password.createdBy.id,
        name: password.createdBy.name,
        email: password.createdBy.email,
      } : null,
    };
  }
}

async function getPasswordId(paramsPromise: ParamsPromise) {
  const params = await paramsPromise;
  const id = Number(params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return null;
  }
  return id;
}

export async function GET(_req: NextRequest, context: { params: ParamsPromise }) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await hasPermission(auth.id, "knowledge.passwords.manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const passwordId = await getPasswordId(context.params);
  if (!passwordId) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    const password = await prisma.passwordVault.findUnique({
      where: { id: passwordId },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!password) {
      return NextResponse.json({ error: "Senha não encontrada" }, { status: 404 });
    }

    return NextResponse.json(mapPasswordResponse(password));
  } catch (error) {
    return NextResponse.json({ error: "Falha ao buscar senha" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: { params: ParamsPromise }) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await hasPermission(auth.id, "knowledge.passwords.manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const passwordId = await getPasswordId(context.params);
  if (!passwordId) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const payload = await req.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const title = sanitizeString((payload as any).title, 500);
  const username = sanitizeString((payload as any).username, 500) || null;
  const password = sanitizeString((payload as any).password, 500);
  const url = sanitizeString((payload as any).url, 1000) || null;
  const notes = sanitizeString((payload as any).notes, 5000) || null;
  const category = sanitizeString((payload as any).category, 200) || null;
  const tags = sanitizeString((payload as any).tags, 500) || null;

  if (!title) {
    return NextResponse.json({ error: "Título é obrigatório" }, { status: 400 });
  }

  if (!password) {
    return NextResponse.json({ error: "Senha é obrigatória" }, { status: 400 });
  }

  try {
    // Verificar se a senha pertence ao usuário
    const existing = await prisma.passwordVault.findUnique({
      where: { id: passwordId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Senha não encontrada" }, { status: 404 });
    }

    // Criptografar dados sensíveis antes de salvar
    const encryptedPassword = encrypt(password);
    const encryptedUsername = username ? encrypt(username) : null;
    const encryptedNotes = notes ? encrypt(notes) : null;

    const updated = await prisma.passwordVault.update({
      where: { id: passwordId },
      data: {
        title,
        username: encryptedUsername,
        password: encryptedPassword,
        url,
        notes: encryptedNotes,
        category,
        tags,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(mapPasswordResponse(updated));
  } catch (error: any) {
    console.error("Error updating password:", error);
    return NextResponse.json({ error: "Falha ao atualizar senha" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: { params: ParamsPromise }) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await hasPermission(auth.id, "knowledge.passwords.manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const passwordId = await getPasswordId(context.params);
  if (!passwordId) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    const existing = await prisma.passwordVault.findUnique({
      where: { id: passwordId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Senha não encontrada" }, { status: 404 });
    }

    await prisma.passwordVault.delete({
      where: { id: passwordId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting password:", error);
    return NextResponse.json({ error: "Falha ao excluir senha" }, { status: 500 });
  }
}

