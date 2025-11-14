import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/encryption";

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
    if (password.password && typeof password.password === "string" && password.password.trim().length > 0) {
      try {
        decryptedPassword = decrypt(password.password).toString("utf8");
      } catch (error: any) {
        console.warn(`[mapPasswordResponse] Erro ao descriptografar senha do registro ${password.id}:`, error?.message);
        decryptedPassword = ""; // Fallback para string vazia
      }
    } else {
      console.warn(`[mapPasswordResponse] Senha vazia ou inválida para registro ${password.id}`);
      decryptedPassword = "";
    }

    // Descriptografar username (opcional)
    if (password.username && typeof password.username === "string" && password.username.trim().length > 0) {
      try {
        decryptedUsername = decrypt(password.username).toString("utf8");
      } catch (error: any) {
        console.warn(`[mapPasswordResponse] Erro ao descriptografar username do registro ${password.id}:`, error?.message);
        decryptedUsername = null; // Fallback para null
      }
    }

    // Descriptografar notes (opcional)
    if (password.notes && typeof password.notes === "string" && password.notes.trim().length > 0) {
      try {
        decryptedNotes = decrypt(password.notes).toString("utf8");
      } catch (error: any) {
        console.warn(`[mapPasswordResponse] Erro ao descriptografar notes do registro ${password.id}:`, error?.message);
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

export async function GET() {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`[GET /api/base/passwords] Buscando senhas para usuário ${auth.id}`);

    const passwords = await prisma.passwordVault.findMany({
      where: {
        createdById: auth.id, // Apenas senhas criadas pelo usuário autenticado
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
      orderBy: { updatedAt: "desc" },
    });

    console.log(`[GET /api/base/passwords] Encontradas ${passwords.length} senhas`);

    // Mapear cada senha com tratamento individual de erros
    const mappedPasswords = passwords.map((pwd) => {
      try {
        return mapPasswordResponse(pwd);
      } catch (error: any) {
        console.error(`[GET /api/base/passwords] Erro ao mapear senha ${pwd.id}:`, error?.message, error?.stack);
        // Retornar objeto básico em caso de erro
        return {
          id: pwd.id,
          title: pwd.title ?? "",
          username: null,
          password: "",
          url: pwd.url ?? null,
          notes: null,
          category: pwd.category ?? null,
          tags: pwd.tags ?? null,
          createdAt: typeof pwd.createdAt === "string" ? pwd.createdAt : pwd.createdAt?.toISOString?.() ?? "",
          updatedAt: typeof pwd.updatedAt === "string" ? pwd.updatedAt : pwd.updatedAt?.toISOString?.() ?? "",
          createdBy: pwd.createdBy ? {
            id: pwd.createdBy.id,
            name: pwd.createdBy.name,
            email: pwd.createdBy.email,
          } : null,
        };
      }
    });

    console.log(`[GET /api/base/passwords] Retornando ${mappedPasswords.length} senhas mapeadas`);
    return NextResponse.json({ items: mappedPasswords });
  } catch (error: any) {
    console.error("[GET /api/base/passwords] Erro ao buscar senhas:", error);
    console.error("[GET /api/base/passwords] Stack trace:", error?.stack);
    const errorMessage = error?.message || String(error);
    return NextResponse.json({
      error: "Falha ao carregar senhas",
      details: process.env.NODE_ENV === "development" ? errorMessage : undefined
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    // Criptografar dados sensíveis antes de salvar
    const encryptedPassword = encrypt(password);
    const encryptedUsername = username ? encrypt(username) : null;
    const encryptedNotes = notes ? encrypt(notes) : null;

    const created = await prisma.passwordVault.create({
      data: {
        title,
        username: encryptedUsername,
        password: encryptedPassword,
        url,
        notes: encryptedNotes,
        category,
        tags,
        createdById: auth.id,
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

    return NextResponse.json(mapPasswordResponse(created), { status: 201 });
  } catch (error: any) {
    console.error("Error creating password:", error);
    return NextResponse.json({ error: "Falha ao criar senha" }, { status: 500 });
  }
}

