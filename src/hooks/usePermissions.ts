"use client";

import { useEffect, useState } from "react";

type SessionData = {
  ok: boolean;
  user: { id: number; email: string; name: string | null } | null;
  permissions: string[];
};

/**
 * Hook para verificar permissões do usuário autenticado
 */
export function usePermissions() {
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch("/api/session");
        const data: SessionData = await res.json();
        setSession(data);
      } catch (error) {
        console.error("Failed to fetch session:", error);
        setSession({ ok: false, user: null, permissions: [] });
      } finally {
        setLoading(false);
      }
    }
    fetchSession();
  }, []);

  const hasPermission = (permissionKey: string): boolean => {
    if (loading || !session?.ok || !session?.user) {
      return false;
    }
    // Assumindo que o usuário tem todas as permissões se for admin (ID 1)
    if (session.user.id === 1) {
      return true;
    }
    return session.permissions.includes(permissionKey);
  };

  const hasAnyPermission = (permissionKeys: string[]): boolean => {
    if (loading || !session?.ok || !session?.user) {
      return false;
    }
    if (session.user.id === 1) {
      return true;
    }
    return permissionKeys.some((key) => session.permissions.includes(key));
  };

  const hasAllPermissions = (permissionKeys: string[]): boolean => {
    if (loading || !session?.ok || !session?.user) {
      return false;
    }
    if (session.user.id === 1) {
      return true;
    }
    return permissionKeys.every((key) => session.permissions.includes(key));
  };

  return {
    session,
    permissions: session?.permissions || [],
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
}

