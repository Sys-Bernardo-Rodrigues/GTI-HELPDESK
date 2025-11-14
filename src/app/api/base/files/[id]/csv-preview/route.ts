import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptFile } from "@/lib/encryption";
import fs from "fs";
import path from "path";

type ParamsPromise = Promise<{ id: string }>;

async function getFileId(paramsPromise: ParamsPromise) {
  const params = await paramsPromise;
  const id = Number(params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return null;
  }
  return id;
}

function parseCSV(csvText: string): string[][] {
  const lines: string[][] = [];
  let currentLine: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        currentField += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      currentLine.push(currentField.trim());
      currentField = "";
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      // Line separator
      if (currentField || currentLine.length > 0) {
        currentLine.push(currentField.trim());
        currentField = "";
        if (currentLine.length > 0) {
          lines.push(currentLine);
          currentLine = [];
        }
      }
      // Skip \r\n
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
    } else {
      currentField += char;
    }
  }

  // Add last field and line
  if (currentField || currentLine.length > 0) {
    currentLine.push(currentField.trim());
  }
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines;
}

function generateCSVTableHTML(csvData: string[][]): string {
  if (csvData.length === 0) {
    return '<div style="padding: 20px; text-align: center; color: #64748b;">Arquivo CSV vazio</div>';
  }

  const maxRows = 1000; // Limitar para não travar o navegador
  const displayData = csvData.slice(0, maxRows);
  const hasMore = csvData.length > maxRows;

  let html = '<div style="overflow-x: auto; max-height: 600px;">';
  html += '<table style="width: 100%; border-collapse: collapse; font-family: monospace; font-size: 0.875rem;">';
  
  // Header row (first row as header if exists)
  if (displayData.length > 0) {
    html += '<thead><tr style="background: #f8fafc; position: sticky; top: 0; z-index: 10;">';
    displayData[0].forEach((cell, idx) => {
      html += `<th style="padding: 10px 12px; text-align: left; border: 1px solid #e2e8f0; font-weight: 600; color: #0f172a;">${escapeHtml(cell)}</th>`;
    });
    html += '</tr></thead>';
  }

  // Data rows
  html += '<tbody>';
  displayData.slice(1).forEach((row, rowIdx) => {
    const bgColor = rowIdx % 2 === 0 ? '#ffffff' : '#f8fafc';
    html += `<tr style="background: ${bgColor};">`;
    row.forEach((cell) => {
      html += `<td style="padding: 8px 12px; border: 1px solid #e2e8f0; color: #334155;">${escapeHtml(cell)}</td>`;
    });
    // Fill empty cells if row is shorter than header
    if (displayData[0] && row.length < displayData[0].length) {
      for (let i = row.length; i < displayData[0].length; i++) {
        html += '<td style="padding: 8px 12px; border: 1px solid #e2e8f0;"></td>';
      }
    }
    html += '</tr>';
  });
  html += '</tbody>';
  html += '</table>';

  if (hasMore) {
    html += `<div style="padding: 12px; text-align: center; color: #64748b; font-size: 0.875rem; border-top: 1px solid #e2e8f0; background: #f8fafc;">Mostrando ${maxRows} de ${csvData.length} linhas. Faça o download para ver o arquivo completo.</div>`;
  }

  html += '</div>';
  return html;
}

function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function GET(_req: NextRequest, context: { params: ParamsPromise }) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fileId = await getFileId(context.params);
  if (!fileId) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
    }

    if (file.mimeType !== "text/csv" && !file.originalName.toLowerCase().endsWith(".csv")) {
      return NextResponse.json({ error: "Arquivo não é CSV" }, { status: 400 });
    }

    // Ler arquivo do disco
    const filePath = path.join(process.cwd(), "public", file.path);
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "Arquivo físico não encontrado" }, { status: 404 });
    }

    const fileBuffer = await fs.promises.readFile(filePath);
    
    // Verificar se o arquivo está criptografado
    let decryptedBuffer: Buffer;
    const isEncrypted = file.path.endsWith(".enc");
    
    if (isEncrypted) {
      try {
        decryptedBuffer = decryptFile(fileBuffer);
      } catch (error: any) {
        console.error(`Erro ao descriptografar arquivo ${fileId}:`, error?.message);
        return NextResponse.json({ 
          error: "Erro ao descriptografar arquivo",
          details: process.env.NODE_ENV === "development" ? error?.message : undefined
        }, { status: 500 });
      }
    } else {
      decryptedBuffer = fileBuffer;
    }

    // Converter para texto e parsear CSV
    const csvText = decryptedBuffer.toString("utf8");
    const csvData = parseCSV(csvText);
    const html = generateCSVTableHTML(csvData);

    // Retornar HTML formatado
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error: any) {
    console.error("Error previewing CSV:", error);
    return NextResponse.json({ 
      error: "Falha ao visualizar CSV",
      details: process.env.NODE_ENV === "development" ? error?.message : undefined
    }, { status: 500 });
  }
}

