/**
 * Helper para resolver URLs de assets estáticos com suporte a CDN
 */

/**
 * Obtém a URL base para assets estáticos
 * Se NEXT_PUBLIC_CDN_URL estiver definido, usa o CDN
 * Caso contrário, usa NEXT_PUBLIC_APP_URL ou o origin da aplicação
 */
function getAssetsBaseUrl(): string {
  // Verificar CDN primeiro (tem prioridade)
  const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL;
  if (cdnUrl && cdnUrl.trim()) {
    return cdnUrl.trim().replace(/\/$/, "");
  }

  // Em ambiente de servidor, usar NEXT_PUBLIC_APP_URL se disponível
  if (typeof window === "undefined") {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
    if (appUrl && appUrl.trim()) {
      return appUrl.trim().replace(/\/$/, "");
    }
    // No servidor, retornar string vazia - Next.js resolve automaticamente
    return "";
  }

  // No cliente, usar o origin da aplicação
  return window.location.origin;
}

/**
 * Resolve uma URL de asset estático (arquivos em /public)
 * @param path Caminho relativo do asset (ex: "/icon.svg", "/uploads/avatar.jpg")
 */
export function getAssetUrl(path: string): string {
  if (!path) return "";
  
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  
  // Se já é uma URL absoluta (http/https), retornar como está
  if (/^https?:\/\//i.test(cleanPath)) {
    return cleanPath;
  }
  
  // Se é data URI, retornar como está
  if (cleanPath.startsWith("data:")) {
    return cleanPath;
  }

  const baseUrl = getAssetsBaseUrl();
  return `${baseUrl}${cleanPath}`;
}

/**
 * Resolve uma URL de upload (arquivos enviados pelos usuários)
 * @param path Caminho relativo do upload (ex: "/uploads/avatar.jpg")
 */
export function getUploadUrl(path: string | null | undefined): string {
  if (!path) return "";
  return getAssetUrl(path);
}

/**
 * Resolve uma URL de avatar
 * Suporta data URIs, URLs absolutas e caminhos relativos
 */
export function resolveAvatarUrl(avatarUrl: string | null | undefined): string {
  if (!avatarUrl) return "";
  
  const val = String(avatarUrl);
  
  // Se já é data URI ou URL absoluta, retornar como está
  if (val.startsWith("data:") || /^https?:\/\//i.test(val)) {
    return val;
  }
  
  return getAssetUrl(val);
}

/**
 * Resolve uma URL de arquivo
 * Similar ao resolveAvatarUrl mas para outros tipos de arquivos
 */
export function resolveFileUrl(fileUrl: string | null | undefined): string {
  return resolveAvatarUrl(fileUrl);
}

