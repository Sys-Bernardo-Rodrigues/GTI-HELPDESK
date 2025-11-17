"use client";

import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter, usePathname } from "next/navigation";
import styled from "styled-components";
import { usePermissions } from "@/hooks/usePermissions";

const Sidebar = styled.aside<{ $open: boolean }>`
  background: var(--surface);
  border-right: 1px solid var(--border);
  box-shadow: 2px 0 12px rgba(0,0,0,0.06);
  border-radius: 12px;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  height: calc(100dvh - 72px);
  overflow: visible;
  position: sticky;
  top: 72px;
  align-self: start;
  transition: transform .25s ease, opacity .25s ease;

  @media (max-width: 960px) {
    position: fixed;
    top: 56px;
    left: 0;
    right: auto;
    width: min(82vw, 240px);
    height: calc(100dvh - 56px);
    border-radius: 0 12px 12px 0;
    transform: translateX(${(p) => (p.$open ? "0" : "-105%")});
    opacity: ${(p) => (p.$open ? 1 : 0)};
    z-index: 20;
    overflow: visible;
  }
`;

const MenuScroll = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: visible;
  padding-right: 4px;
`;

const NavItem = styled.a<{ $active?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 10px 4px;
  border-radius: 8px;
  color: inherit;
  text-decoration: none;
  font-size: 0.7rem;
  font-weight: ${(p) => (p.$active ? 600 : 500)};
  transition: all 0.2s ease;
  width: 100%;
  background: ${(p) => (p.$active ? "#eef2f7" : "transparent")};
  &:hover { background: #f3f4f6; }
  &:focus { outline: none; }
  &:focus-visible { outline: none; }
  
  svg {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
  }
`;

const NavItemButton = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 10px 4px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: inherit;
  text-decoration: none;
  font-size: 0.7rem;
  font-weight: 500;
  transition: all 0.2s ease;
  width: 100%;
  cursor: pointer;
  position: relative;
  &:hover { background: #f3f4f6; }
  &:focus { outline: none; }
  &:focus-visible { outline: none; }

  svg {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
  }
`;

const ConfigSubmenu = styled.div<{ $open: boolean }>`
  position: fixed;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 12px 28px rgba(0,0,0,0.12);
  min-width: 180px;
  padding: 8px;
  transform: translateY(${(p) => (p.$open ? "0" : "8px")});
  opacity: ${(p) => (p.$open ? 1 : 0)};
  pointer-events: ${(p) => (p.$open ? "auto" : "none")};
  transition: opacity .18s ease, transform .18s ease;
  z-index: 9999;
  isolation: isolate;

  @media (max-width: 960px) {
    left: 16px !important;
    top: auto !important;
    bottom: 96px !important;
  }
`;

const ConfigSubmenuItem = styled.a`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  color: inherit;
  text-decoration: none;
  font-size: 0.9rem;
  &:hover {
    background: #f3f4f6;
  }
  &:active {
    background: #e9ecef;
  }
  &:focus { outline: none; }
  &:focus-visible { outline: none; }

  svg {
    flex-shrink: 0;
    opacity: 0.8;
  }
`;

const UserFooter = styled.footer`
  border-top: 1px solid var(--border);
  padding-top: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin-top: auto;
  cursor: pointer;
  user-select: none;
`;

const Avatar = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #e5e7eb;
  display: grid;
  place-items: center;
  color: var(--muted);
  font-weight: 700;
  user-select: none;
  overflow: hidden;
  flex-shrink: 0;
  font-size: 0.875rem;
  img { width: 100%; height: 100%; object-fit: cover; }
`;

const UserName = styled.div`
  font-size: 0.7rem;
  font-weight: 600;
  text-align: center;
  word-break: break-word;
  max-width: 100%;
  line-height: 1.2;
`;

const UserMenu = styled.div<{ $open: boolean }>`
  position: fixed;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 12px 28px rgba(0,0,0,0.12);
  min-width: 200px;
  padding: 8px;
  opacity: ${(p) => (p.$open ? 1 : 0)};
  pointer-events: ${(p) => (p.$open ? "auto" : "none")};
  transition: opacity .18s ease;
  z-index: 10000 !important;
  isolation: isolate;

  @media (max-width: 960px) {
    left: 16px !important;
    top: auto !important;
    bottom: 96px !important;
    transform: none !important;
  }
`;

const UserMenuItem = styled.button<{ $variant?: "danger" }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  color: ${(p) => (p.$variant === "danger" ? "#B00000" : "inherit")};
  &:hover { background: ${(p) => (p.$variant === "danger" ? "#ffe5e5" : "#f3f4f6")}; }
  &:active { background: ${(p) => (p.$variant === "danger" ? "#ffcccc" : "#e9ecef")}; }
  &:focus { outline: none; }
  &:focus-visible { outline: 2px solid var(--primary-500); outline-offset: 2px; }
`;

type MenuItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  permission?: string; // Permissão necessária para ver este item
};

type SidebarMenuProps = {
  open: boolean;
  user: { id: number; name: string | null; email: string } | null;
  avatarUrl?: string;
  menuItems: MenuItem[];
  configSubmenuItems?: Array<{ href: string; label: string; icon: React.ReactNode; permission?: string }>;
};

export function SidebarMenu({ open, user, avatarUrl = "", menuItems, configSubmenuItems = [] }: SidebarMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { hasPermission } = usePermissions();
  const [menuOpen, setMenuOpen] = useState(false);
  const [configSubmenuOpen, setConfigSubmenuOpen] = useState(false);
  const footerRef = useRef<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const configButtonRef = useRef<HTMLButtonElement | null>(null);
  const configSubmenuRef = useRef<HTMLDivElement | null>(null);

  // Filtrar itens do menu baseado em permissões
  const visibleMenuItems = menuItems.filter((item) => !item.permission || hasPermission(item.permission));
  const visibleConfigItems = configSubmenuItems.filter((item) => !item.permission || hasPermission(item.permission));

  // Posicionar menu do usuário dinamicamente
  useEffect(() => {
    if (!menuOpen || !footerRef.current || !menuRef.current) return;
    const updatePosition = () => {
      const footerEl = footerRef.current;
      const menu = menuRef.current;
      if (!footerEl || !menu) return;
      const rect = footerEl.getBoundingClientRect();
      menu.style.left = `${rect.left}px`;
      menu.style.top = `${rect.bottom + 8}px`;
    };
    updatePosition();
    if (typeof window !== "undefined") {
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);
      return () => {
        window.removeEventListener("resize", updatePosition);
        window.removeEventListener("scroll", updatePosition, true);
      };
    }
  }, [menuOpen]);

  // Posicionar ConfigSubmenu dinamicamente
  useEffect(() => {
    if (!configSubmenuOpen || !configButtonRef.current || !configSubmenuRef.current) return;
    const updatePosition = () => {
      const buttonEl = configButtonRef.current;
      const submenu = configSubmenuRef.current;
      if (!buttonEl || !submenu) return;
      const rect = buttonEl.getBoundingClientRect();
      submenu.style.left = `${rect.left + rect.width + 8}px`;
      submenu.style.top = `${rect.top}px`;
    };
    updatePosition();
    if (typeof window !== "undefined") {
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);
      return () => {
        window.removeEventListener("resize", updatePosition);
        window.removeEventListener("scroll", updatePosition, true);
      };
    }
  }, [configSubmenuOpen]);

  // Fechar menu ao clicar fora
  useEffect(() => {
    const doc = typeof globalThis !== "undefined" ? (globalThis as any).document : undefined;
    if (!doc) return;
    function onDocDown(event: MouseEvent | TouchEvent) {
      const target = event.target as unknown as HTMLElement | null;
      if (!target) return;
      const menuContains = (menuRef.current as unknown as { contains?: (el: HTMLElement) => boolean })?.contains?.(target);
      const footerContains = (footerRef.current as unknown as { contains?: (el: HTMLElement) => boolean })?.contains?.(target);
      if (!menuContains && !footerContains) {
        setMenuOpen(false);
      }
      const configSubmenuContains = (configSubmenuRef.current as unknown as { contains?: (el: HTMLElement) => boolean })?.contains?.(target);
      const configButtonContains = (configButtonRef.current as unknown as { contains?: (el: HTMLElement) => boolean })?.contains?.(target);
      if (!configSubmenuContains && !configButtonContains) {
        setConfigSubmenuOpen(false);
      }
    }
    doc.addEventListener("mousedown", onDocDown);
    doc.addEventListener("touchstart", onDocDown);
    return () => {
      doc.removeEventListener("mousedown", onDocDown);
      doc.removeEventListener("touchstart", onDocDown);
    };
  }, []);

  function resolveAvatarUrl(u?: string): string {
    if (!u) return "";
    const val = String(u);
    if (val.startsWith("data:")) return val;
    if (/^https?:\/\//i.test(val)) return val;
    const appWindow = typeof globalThis !== "undefined" ? (globalThis as any).window : undefined;
    if (appWindow) {
      const origin = appWindow.location.origin;
      if (val.startsWith("/")) return `${origin}${val}`;
      return `${origin}/${val}`;
    }
    return val;
  }

  function toggleUserMenu() {
    setMenuOpen((v) => !v);
  }

  // Verificar se tem permissão para ver o submenu Config
  const canSeeConfig = visibleConfigItems.length > 0 || hasPermission("page.config");

  return (
    <Sidebar
      id="sidebar"
      aria-label="Menu lateral"
      aria-expanded={open}
      aria-hidden={!open}
      $open={open}
      onKeyDown={(e) => { if (e.key === "Escape") setMenuOpen(false); }}
    >
      <nav role="navigation" aria-label="Navegação principal">
        <MenuScroll>
          {visibleMenuItems.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              aria-label={item.label}
              $active={pathname === item.href}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavItem>
          ))}
          {canSeeConfig && (
            <div style={{ position: "relative" }}>
              <NavItemButton
                type="button"
                ref={configButtonRef}
                onClick={() => setConfigSubmenuOpen(!configSubmenuOpen)}
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
                </svg>
                <span>Config</span>
              </NavItemButton>
              {typeof globalThis !== "undefined" && (globalThis as any).document && configSubmenuOpen && createPortal(
                <ConfigSubmenu
                  ref={configSubmenuRef}
                  $open={configSubmenuOpen}
                >
                  {hasPermission("page.config") && (
                    <ConfigSubmenuItem
                      href="/config"
                      onClick={() => {
                        setConfigSubmenuOpen(false);
                        router.push("/config");
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                        <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
                      </svg>
                      Configurações
                    </ConfigSubmenuItem>
                  )}
                  {visibleConfigItems.map((item) => (
                    <ConfigSubmenuItem
                      key={item.href}
                      href={item.href}
                      onClick={() => {
                        setConfigSubmenuOpen(false);
                        router.push(item.href);
                      }}
                    >
                      {item.icon}
                      {item.label}
                    </ConfigSubmenuItem>
                  ))}
                </ConfigSubmenu>,
                (globalThis as any).document.body
              )}
            </div>
          )}
        </MenuScroll>
      </nav>
      <UserFooter
        onClick={toggleUserMenu}
        ref={footerRef as any}
      >
        <Avatar>
          {avatarUrl ? (
            <img src={resolveAvatarUrl(avatarUrl)} alt={user?.name || ""} />
          ) : (
            user?.name?.[0]?.toUpperCase() || "U"
          )}
        </Avatar>
        <UserName>{user?.name || "Usuário"}</UserName>
      </UserFooter>
      {typeof globalThis !== "undefined" && (globalThis as any).document && menuOpen && createPortal(
        <UserMenu
          $open={menuOpen}
          ref={menuRef as any}
        >
          <UserMenuItem onClick={() => { setMenuOpen(false); router.push("/profile"); }}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
            Meu Perfil
          </UserMenuItem>
          <UserMenuItem
            $variant="danger"
            onClick={async () => {
              setMenuOpen(false);
              const res = await fetch("/api/logout", { method: "POST" });
              if (res.ok) {
                router.push("/login");
              }
            }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
            </svg>
            Sair
          </UserMenuItem>
        </UserMenu>,
        (globalThis as any).document.body
      )}
    </Sidebar>
  );
}

