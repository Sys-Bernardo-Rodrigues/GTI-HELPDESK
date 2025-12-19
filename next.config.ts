import type { NextConfig } from "next";

// Helper para extrair protocolo e hostname de forma segura
function getCdnConfig() {
  const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL;
  if (!cdnUrl || !cdnUrl.trim()) {
    return { assetPrefix: undefined, imageRemotePatterns: undefined };
  }

  try {
    const url = new URL(cdnUrl.trim());
    return {
      assetPrefix: url.origin,
      imageRemotePatterns: [
        {
          protocol: url.protocol.replace(":", "") as "http" | "https",
          hostname: url.hostname,
          pathname: "/**",
        },
      ],
    };
  } catch {
    // Se não for uma URL válida, não usar CDN
    return { assetPrefix: undefined, imageRemotePatterns: undefined };
  }
}

const cdnConfig = getCdnConfig();

const nextConfig: NextConfig = {
  compiler: {
    styledComponents: true,
  },
  // Configuração de CDN para assets estáticos
  // Se NEXT_PUBLIC_CDN_URL estiver definido, será usado como prefixo para assets
  assetPrefix: cdnConfig.assetPrefix,
  // Permitir carregar imagens do CDN
  images: cdnConfig.imageRemotePatterns
    ? {
        remotePatterns: cdnConfig.imageRemotePatterns,
      }
    : undefined,
};

export default nextConfig;
