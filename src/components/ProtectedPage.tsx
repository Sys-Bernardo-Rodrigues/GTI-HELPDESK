"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";

type ProtectedPageProps = {
  children: React.ReactNode;
  requiredPermission: string;
  redirectTo?: string;
};

/**
 * Componente que protege uma página verificando se o usuário tem a permissão necessária
 */
export function ProtectedPage({ children, requiredPermission, redirectTo = "/home" }: ProtectedPageProps) {
  const router = useRouter();
  const { hasPermission, loading } = usePermissions();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (!hasPermission(requiredPermission)) {
        router.push(redirectTo);
      } else {
        setChecking(false);
      }
    }
  }, [loading, hasPermission, requiredPermission, redirectTo, router]);

  if (loading || checking) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div>Carregando...</div>
      </div>
    );
  }

  return <>{children}</>;
}

