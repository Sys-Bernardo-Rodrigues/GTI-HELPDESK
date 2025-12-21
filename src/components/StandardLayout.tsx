"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import styled from "styled-components";
import NotificationBell from "@/components/NotificationBell";
import { resolveAvatarUrl } from "@/lib/assets";

const Page = styled.div`
  min-height: 100dvh;
  display: grid;
  grid-template-rows: 64px 1fr;
  background: var(--bg-solid);
`;

const TopBar = styled.header`
  position: sticky;
  top: 0;
  z-index: 100;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 24px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
`;

const TopBarActions = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
`;

const Brand = styled.div`
  font-weight: 800;
  font-size: 1.25rem;
  background: linear-gradient(135deg, var(--primary-600) 0%, var(--secondary-600) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: flex;
  align-items: center;
  gap: 12px;
  letter-spacing: -0.02em;
`;

const BrandIcon = styled.div`
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: linear-gradient(135deg, var(--primary-600) 0%, var(--secondary-600) 100%);
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);

  svg {
    width: 20px;
    height: 20px;
    color: white;
  }
`;

const MenuToggle = styled.button`
  margin-left: auto;
  border: 2px solid var(--border);
  background: var(--surface);
  padding: 10px 14px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: var(--shadow-sm);

  &:hover {
    background: var(--gray-50);
    border-color: var(--primary-300);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }

  @media (min-width: 961px) {
    display: none;
  }
`;

const Shell = styled.div`
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: 20px;
  padding: 20px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
    padding: 16px;
  }
`;

const Sidebar = styled.aside<{ $open: boolean }>`
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-lg);
  border-radius: 16px;
  padding: 16px 8px;
  display: flex;
  flex-direction: column;
  height: calc(100dvh - 104px);
  overflow: visible;
  position: sticky;
  top: 84px;
  align-self: start;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), 
              opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  @media (max-width: 960px) {
    position: fixed;
    top: 64px;
    left: 0;
    right: auto;
    width: min(82vw, 280px);
    height: calc(100dvh - 64px);
    border-radius: 0 16px 16px 0;
    transform: translateX(${(p) => (p.$open ? "0" : "-105%")});
    opacity: ${(p) => (p.$open ? 1 : 0)};
    z-index: 50;
    overflow: visible;
    box-shadow: var(--shadow-xl);
  }
`;

const MenuScroll = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: visible;
  padding-right: 4px;
  margin: 8px 0;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--gray-300);
    border-radius: 3px;
  }
`;

const NavItem = styled.a<{ $active?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 6px;
  border-radius: 12px;
  color: ${(p) => (p.$active ? "var(--primary-700)" : "var(--text-muted)")};
  text-decoration: none;
  font-size: 0.7rem;
  font-weight: ${(p) => (p.$active ? 700 : 500)};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  width: 100%;
  position: relative;
  background: ${(p) =>
    p.$active
      ? "linear-gradient(135deg, var(--primary-50) 0%, var(--primary-100) 100%)"
      : "transparent"};
  
  &::before {
    content: "";
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 4px;
    height: ${(p) => (p.$active ? "60%" : "0%")};
    background: linear-gradient(180deg, var(--primary-600) 0%, var(--secondary-600) 100%);
    border-radius: 0 4px 4px 0;
    transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  &:hover {
    background: ${(p) =>
      p.$active
        ? "linear-gradient(135deg, var(--primary-100) 0%, var(--primary-200) 100%)"
        : "var(--gray-50)"};
    color: ${(p) => (p.$active ? "var(--primary-800)" : "var(--text)")};
    transform: translateX(2px);
  }

  &:focus {
    outline: none;
  }

  &:focus-visible {
    outline: 2px solid var(--primary-500);
    outline-offset: 2px;
  }

  svg {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    transition: transform 0.2s ease;
  }

  &:hover svg {
    transform: scale(1.1);
  }
`;

const NavItemButton = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 6px;
  border-radius: 12px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  text-decoration: none;
  font-size: 0.7rem;
  font-weight: 500;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  width: 100%;
  cursor: pointer;
  position: relative;

  &:hover {
    background: var(--gray-50);
    color: var(--text);
    transform: translateX(2px);
  }

  &:focus {
    outline: none;
  }

  &:focus-visible {
    outline: 2px solid var(--primary-500);
    outline-offset: 2px;
  }

  svg {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    transition: transform 0.2s ease;
  }

  &:hover svg {
    transform: scale(1.1);
  }
`;

const ConfigSubmenu = styled.div<{ $open: boolean }>`
  position: fixed;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: var(--shadow-xl);
  min-width: 200px;
  padding: 8px;
  transform: translateY(${(p) => (p.$open ? "0" : "-8px")});
  opacity: ${(p) => (p.$open ? 1 : 0)};
  pointer-events: ${(p) => (p.$open ? "auto" : "none")};
  transition: opacity 0.2s ease, transform 0.2s ease;
  z-index: 9999;
  backdrop-filter: blur(12px);

  @media (max-width: 960px) {
    left: 16px !important;
    top: auto !important;
    bottom: 96px !important;
    transform: ${(p) => (p.$open ? "translateY(0)" : "translateY(8px)")} !important;
  }
`;

const ConfigSubmenuItem = styled.a`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: none;
  background: transparent;
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
  color: var(--text);
  text-decoration: none;
  font-size: 0.9375rem;
  font-weight: 500;
  transition: all 0.2s ease;

  &:hover {
    background: var(--gray-50);
    transform: translateX(4px);
    color: var(--primary-700);
  }

  &:active {
    background: var(--gray-100);
  }

  &:focus {
    outline: none;
  }

  &:focus-visible {
    outline: 2px solid var(--primary-500);
    outline-offset: 2px;
  }

  svg {
    flex-shrink: 0;
    opacity: 0.8;
    transition: opacity 0.2s ease;
  }

  &:hover svg {
    opacity: 1;
  }
`;

const UserFooter = styled.footer`
  border-top: 1px solid var(--border);
  padding-top: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-top: auto;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;

  &:hover {
    background: var(--gray-50);
    margin-left: -8px;
    margin-right: -8px;
    padding-left: 8px;
    padding-right: 8px;
    border-radius: 12px;
  }
`;

const Avatar = styled.div`
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary-400) 0%, var(--secondary-400) 100%);
  display: grid;
  place-items: center;
  color: white;
  font-weight: 700;
  user-select: none;
  overflow: hidden;
  flex-shrink: 0;
  font-size: 0.9375rem;
  border: 3px solid var(--surface);
  box-shadow: 0 4px 12px rgba(2, 132, 199, 0.2);
  transition: all 0.3s ease;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const UserName = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  text-align: center;
  word-break: break-word;
  max-width: 100%;
  line-height: 1.3;
  color: var(--text);
`;

const UserMenu = styled.div<{ $open: boolean }>`
  position: fixed;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: var(--shadow-xl);
  min-width: 220px;
  padding: 8px;
  display: ${(p) => (p.$open ? "block" : "none")};
  opacity: ${(p) => (p.$open ? 1 : 0)};
  pointer-events: ${(p) => (p.$open ? "auto" : "none")};
  transition: opacity 0.2s ease, transform 0.2s ease;
  transform: ${(p) => (p.$open ? "translateY(0)" : "translateY(-8px)")};
  z-index: 10000 !important;
  isolation: isolate;
  backdrop-filter: blur(12px);

  @media (max-width: 960px) {
    left: 16px !important;
    top: auto !important;
    bottom: 96px !important;
    transform: ${(p) => (p.$open ? "translateY(0)" : "translateY(8px)")} !important;
  }
`;

const UserMenuItem = styled.button<{ $variant?: "danger" }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: none;
  background: transparent;
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
  font-size: 0.9375rem;
  font-weight: 500;
  color: ${(p) => (p.$variant === "danger" ? "var(--error-600)" : "var(--text)")};
  transition: all 0.2s ease;

  &:hover {
    background: ${(p) =>
      p.$variant === "danger" ? "var(--error-50)" : "var(--gray-50)"};
    transform: translateX(4px);
  }

  &:active {
    background: ${(p) =>
      p.$variant === "danger" ? "var(--error-100)" : "var(--gray-100)"};
  }

  &:focus {
    outline: none;
  }

  &:focus-visible {
    outline: 2px solid ${(p) => (p.$variant === "danger" ? "var(--error-500)" : "var(--primary-500)")};
    outline-offset: 2px;
  }
`;

const Overlay = styled.div<{ $show: boolean }>`
  @media (min-width: 961px) {
    display: none;
  }
  position: fixed;
  inset: 64px 0 0 0;
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(4px);
  opacity: ${(p) => (p.$show ? 1 : 0)};
  pointer-events: ${(p) => (p.$show ? "auto" : "none")};
  transition: opacity 0.25s ease;
  z-index: 15;
`;

const ConfirmBackdrop = styled.div<{ $open: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 10001;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: ${(p) => (p.$open ? 1 : 0)};
  pointer-events: ${(p) => (p.$open ? "auto" : "none")};
  transition: opacity 0.2s ease;
`;

const ConfirmDialog = styled.div<{ $open: boolean }>`
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%) scale(${(p) => (p.$open ? 1 : 0.95)});
  width: min(90vw, 420px);
  max-height: min(90vh, 320px);
  padding: 32px;
  border: 1px solid var(--border);
  border-radius: 20px;
  background: var(--surface);
  box-shadow: var(--shadow-xl);
  z-index: 10002;
  display: flex;
  flex-direction: column;
  gap: 24px;
  opacity: ${(p) => (p.$open ? 1 : 0)};
  pointer-events: ${(p) => (p.$open ? "auto" : "none")};
  transition: opacity 0.2s ease, transform 0.2s ease;
  backdrop-filter: blur(12px);
`;

const ConfirmTitle = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.02em;
`;

const ConfirmActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const CancelButton = styled.button`
  padding: 12px 24px;
  border: 2px solid var(--border);
  background: var(--surface);
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9375rem;
  color: var(--text);
  transition: all 0.2s ease;

  &:hover {
    background: var(--gray-50);
    border-color: var(--border-strong);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const ConfirmButton = styled.button`
  padding: 12px 24px;
  border: none;
  background: linear-gradient(135deg, var(--error-600) 0%, var(--error-700) 100%);
  color: #fff;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9375rem;
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
  transition: all 0.2s ease;

  &:hover {
    background: linear-gradient(135deg, var(--error-700) 0%, #991b1b 100%);
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(220, 38, 38, 0.4);
  }

  &:active {
    transform: translateY(0);
  }
`;

const Content = styled.main`
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
`;

type StandardLayoutProps = {
  children: React.ReactNode;
};

export default function StandardLayout({ children }: StandardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState<boolean>(true);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [user, setUser] = useState<{ id: number; email: string; name: string | null; accessProfile?: { id: number; name: string; allowedPages: string[] } | null } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [allowedPages, setAllowedPages] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
  const [configSubmenuOpen, setConfigSubmenuOpen] = useState<boolean>(false);

  const firstLinkRef = useRef<HTMLAnchorElement | null>(null);
  const footerRef = useRef<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const firstMenuItemRef = useRef<HTMLButtonElement | null>(null);
  const configButtonRef = useRef<HTMLButtonElement | null>(null);


  useEffect(() => {
    const saved = localStorage.getItem("sidebar_open");
    if (saved !== null) setOpen(saved === "true");
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebar_open", String(open));
  }, [open]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/session");
        if (res.ok) {
          const json = await res.json();
          setUser(json.user);
          // Se o usuário tem perfil de acesso, usar as páginas permitidas
          // Se não tem perfil, permitir todas as páginas (comportamento padrão)
          if (json.user?.accessProfile?.allowedPages) {
            setAllowedPages(json.user.accessProfile.allowedPages);
          } else {
            // Sem perfil = acesso total (comportamento padrão)
            setAllowedPages([]);
          }
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const json = await res.json();
          setAvatarUrl(resolveAvatarUrl(json?.avatarUrl || ""));
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (menuOpen && footerRef.current) {
      const updatePosition = () => {
        if (menuRef.current && footerRef.current) {
          const footerRect = footerRef.current.getBoundingClientRect();
          const menu = menuRef.current;
          const menuHeight = menu.offsetHeight || 100; // Altura estimada do menu
          menu.style.left = `${footerRect.left}px`;
          // Posicionar acima do footer (top do footer - altura do menu - espaçamento)
          menu.style.top = `${footerRect.top - menuHeight - 8}px`;
        }
      };
      // Usar requestAnimationFrame para garantir que o DOM foi atualizado
      requestAnimationFrame(() => {
        updatePosition();
      });
      // Também tentar após um pequeno delay para garantir que o portal foi renderizado
      const timeoutId1 = setTimeout(updatePosition, 10);
      const timeoutId2 = setTimeout(updatePosition, 50);
      // Atualizar posição quando a janela é redimensionada ou quando o menu é aberto
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);
      return () => {
        clearTimeout(timeoutId1);
        clearTimeout(timeoutId2);
        window.removeEventListener("resize", updatePosition);
        window.removeEventListener("scroll", updatePosition, true);
      };
    }
  }, [menuOpen]);

  useEffect(() => {
    if (configSubmenuOpen && configButtonRef.current) {
      const updatePosition = () => {
        const buttonRect = configButtonRef.current?.getBoundingClientRect();
        const submenu = document.getElementById("config-submenu");
        if (buttonRect && submenu) {
          const submenuHeight = submenu.offsetHeight || 300; // Altura estimada
          submenu.style.left = `${buttonRect.left}px`;
          // Posicionar acima do botão (top do botão - altura do submenu - espaçamento)
          submenu.style.top = `${buttonRect.top - submenuHeight - 8}px`;
        }
      };
      // Usar requestAnimationFrame para garantir que o DOM foi atualizado
      requestAnimationFrame(() => {
        updatePosition();
      });
      // Também tentar após um pequeno delay para garantir que o portal foi renderizado
      const timeoutId1 = setTimeout(updatePosition, 10);
      const timeoutId2 = setTimeout(updatePosition, 50);
      // Atualizar posição quando a janela é redimensionada ou quando o menu é aberto
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);
      return () => {
        clearTimeout(timeoutId1);
        clearTimeout(timeoutId2);
        window.removeEventListener("resize", updatePosition);
        window.removeEventListener("scroll", updatePosition, true);
      };
    }
  }, [configSubmenuOpen]);

  useEffect(() => {
    function onDocDown(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      if (menuOpen) {
        if (menuRef.current && !menuRef.current.contains(target) && footerRef.current && !footerRef.current.contains(target)) {
          setMenuOpen(false);
        }
      }
      if (configSubmenuOpen) {
        const submenu = document.getElementById("config-submenu");
        if (configButtonRef.current && !configButtonRef.current.contains(target) && submenu && !submenu.contains(target)) {
          setConfigSubmenuOpen(false);
        }
      }
    }
    if (menuOpen || configSubmenuOpen) {
      // Adicionar um pequeno delay para evitar que o menu feche imediatamente ao abrir
      const timeoutId = setTimeout(() => {
        document.addEventListener("mousedown", onDocDown);
        document.addEventListener("touchstart", onDocDown);
      }, 100);
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener("mousedown", onDocDown);
        document.removeEventListener("touchstart", onDocDown);
      };
    }
  }, [menuOpen, configSubmenuOpen]);

  function toggleUserMenu() {
    setMenuOpen((v) => !v);
  }

  async function onLogout() {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch {}
    setMenuOpen(false);
    setConfirmOpen(false);
    window.location.assign("/");
  }

  const isActive = (path: string) => pathname === path;

  // Função para verificar se uma página está permitida
  // Se allowedPages estiver vazio, significa que o usuário não tem perfil = acesso total
  const isPageAllowed = (path: string): boolean => {
    if (allowedPages.length === 0) {
      // Sem perfil = acesso total
      return true;
    }
    // Verificar se o path está na lista de páginas permitidas
    // Também verificar paths com query strings (ex: /config?section=forms)
    const normalizedPath = path.split("?")[0];
    return allowedPages.some((allowedPath) => {
      const normalizedAllowed = allowedPath.split("?")[0];
      return normalizedPath === normalizedAllowed || path === allowedPath;
    });
  };

  // Definir itens do menu principal
  const mainMenuItems = [
    { path: "/home", label: "Início", icon: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" },
    { path: "/tickets", label: "Tickets", icon: "M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 0 0-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z" },
    { path: "/base", label: "Base", icon: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" },
    { path: "/agenda", label: "Agenda", icon: "M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM5 7V6h14v1H5zm7 6H7v-2h5v2z" },
    { path: "/history", label: "Histórico", icon: "M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" },
    { path: "/relatorios", label: "Relatórios", icon: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" },
    { path: "/aprovacoes", label: "Aprovações", icon: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" },
    { path: "/projetos", label: "Projetos", icon: "M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z" },
  ];

  // Itens do submenu de Config
  const configMenuItems = [
    { path: "/users", label: "Usuários", icon: "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" },
    { path: "/config?section=forms", label: "Formulários", icon: "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" },
    { path: "/config?section=pages", label: "Páginas", icon: "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" },
    { path: "/config?section=webhooks", label: "Webhooks", icon: "M20 13H4v-2h16v2zm0 4H4v-2h16v2zm0-8H4V7h16v2z" },
    { path: "/config?section=backup", label: "Backup", icon: "M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" },
    { path: "/config?section=update", label: "Atualizar", icon: "M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 .34-.03.67-.08 1h2.02c.04-.33.06-.66.06-1 0-4.42-3.58-8-8-8zm-6 5c-.04.33-.06.66-.06 1 0 4.42 3.58 8 8 8v3l4-4-4-4v3c-2.76 0-5-2.24-5-5 0-.34.03-.67.08-1H6z" },
    { path: "/config?section=env", label: "Configurar .env", icon: "M3 5v14h18V5H3zm8 12H5v-2h6v2zm8-4H5v-2h14v2zm0-4H5V7h14v2z" },
    { path: "/config/acessos", label: "Acessos", icon: "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" },
  ];

  // Filtrar itens do menu baseado nas permissões
  const filteredMainMenuItems = mainMenuItems.filter((item) => isPageAllowed(item.path));
  const filteredConfigMenuItems = configMenuItems.filter((item) => isPageAllowed(item.path));
  const showConfigMenu = filteredConfigMenuItems.length > 0 || isPageAllowed("/config");

  return (
    <Page>
      <TopBar role="navigation" aria-label="Barra de navegação">
        <Brand>
          <BrandIcon>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0,0,256,256" fill="currentColor">
              <g fill="currentColor" fillRule="nonzero" stroke="none" strokeWidth="1" strokeLinecap="butt" strokeLinejoin="miter" strokeMiterlimit="10" strokeDasharray="" strokeDashoffset="0" fontFamily="none" fontWeight="none" fontSize="none" textAnchor="none" style={{mixBlendMode: "normal"}}>
                <g transform="translate(256,256.85152) rotate(180) scale(5.12,5.12)">
                  <path d="M25.00391,2.33398c-0.17825,0 -0.35712,0.04758 -0.51562,0.14258l-19.00391,11.41992c-0.301,0.181 -0.48437,0.50642 -0.48437,0.85742v20.46875c0,0.349 0.18052,0.67152 0.47852,0.85352l5,3.05273c0.666,0.407 1.52148,-0.07352 1.52148,-0.85352v-20.16211l13,-7.93945l13,7.93945v20.20117c0,0.78 0.85353,1.26047 1.51953,0.85547l5,-3.03906c0.299,-0.182 0.48047,-0.50547 0.48047,-0.85547v-20.52148c0,-0.351 -0.18337,-0.67642 -0.48437,-0.85742l-18.99805,-11.41992c-0.1585,-0.095 -0.33542,-0.14258 -0.51367,-0.14258zM21.99805,17.17578c-0.17381,0.00013 -0.35303,0.04669 -0.51953,0.14844l-5,3.05469c-0.298,0.182 -0.47852,0.50356 -0.47852,0.85156v20.79297c0,0.351 0.18338,0.67642 0.48438,0.85742l8.00391,4.80859c0.317,0.191 0.7123,0.19 1.0293,0l7.99805,-4.80664c0.301,-0.181 0.48438,-0.50642 0.48438,-0.85742v-20.79492c0,-0.348 -0.18052,-0.67056 -0.47852,-0.85156l-5,-3.05469c-0.666,-0.407 -1.52148,0.07251 -1.52148,0.85352v20.59375l-2,1.22266l-2,-1.22266v-20.59375c0,-0.58575 -0.48052,-1.00233 -1.00195,-1.00195z"></path>
                </g>
              </g>
            </svg>
          </BrandIcon>
          RootDesk
        </Brand>
        <TopBarActions>
          <NotificationBell />
        </TopBarActions>
        <MenuToggle
          aria-label={open ? "Fechar menu lateral" : "Abrir menu lateral"}
          aria-controls="sidebar"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Fechar menu" : "Abrir menu"}
        </MenuToggle>
      </TopBar>
      <Shell>
        <Sidebar
          id="sidebar"
          aria-label="Menu lateral"
          aria-expanded={open}
          aria-hidden={!open}
          $open={open}
          onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
        >
          <nav role="navigation" aria-label="Navegação principal">
            <MenuScroll>
              {filteredMainMenuItems.map((item, index) => (
                <NavItem
                  key={item.path}
                  ref={index === 0 ? firstLinkRef : undefined}
                  href={item.path}
                  aria-label={item.label}
                  $active={isActive(item.path)}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d={item.icon} />
                  </svg>
                  <span>{item.label}</span>
                </NavItem>
              ))}
              {showConfigMenu && (
                <div style={{ position: "relative" }}>
                  <NavItemButton
                    ref={configButtonRef}
                    type="button"
                    id="config-menu-button"
                    aria-label="Configurações"
                    aria-expanded={configSubmenuOpen}
                    aria-haspopup="true"
                    onClick={() => setConfigSubmenuOpen(!configSubmenuOpen)}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
                    </svg>
                    <span>Config</span>
                  </NavItemButton>
                {typeof window !== "undefined" && document && configSubmenuOpen && filteredConfigMenuItems.length > 0 && createPortal(
                  <ConfigSubmenu
                    id="config-submenu"
                    role="menu"
                    aria-labelledby="config-menu-button"
                    $open={configSubmenuOpen}
                  >
                    {filteredConfigMenuItems.map((item) => (
                      <ConfigSubmenuItem
                        key={item.path}
                        role="menuitem"
                        tabIndex={0}
                        href={item.path}
                        onClick={() => {
                          setConfigSubmenuOpen(false);
                          router.push(item.path);
                        }}
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                          <path d={item.icon} />
                        </svg>
                        {item.label}
                      </ConfigSubmenuItem>
                    ))}
                  </ConfigSubmenu>,
                  document.body
                )}
                </div>
              )}
            </MenuScroll>
          </nav>
          <UserFooter
            aria-label="Menu do usuário"
            role="button"
            tabIndex={0}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls="user-menu"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleUserMenu();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleUserMenu();
              }
              if (e.key === "Escape") setMenuOpen(false);
              if (e.key === "ArrowDown") setMenuOpen(true);
            }}
            ref={footerRef as any}
          >
            <Avatar aria-label="Foto do usuário" role="img">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" decoding="async" />
              ) : (
                user?.name ? (user.name?.[0] || "U") : "U"
              )}
            </Avatar>
            <UserName aria-label="Nome do usuário">{user?.name ?? user?.email ?? "Usuário"}</UserName>
          </UserFooter>
          {typeof window !== "undefined" && document && menuOpen && createPortal(
            <UserMenu
              id="user-menu"
              role="menu"
              aria-labelledby="user-menu-button"
              $open={menuOpen}
              ref={menuRef as any}
            >
              <UserMenuItem
                role="menuitem"
                tabIndex={0}
                ref={firstMenuItemRef as any}
                onClick={() => { setMenuOpen(false); window.location.assign("/profile"); }}
              >
                Perfil
              </UserMenuItem>
              <UserMenuItem
                role="menuitem"
                tabIndex={0}
                $variant="danger"
                onClick={() => { setMenuOpen(false); setConfirmOpen(true); }}
              >
                Sair
              </UserMenuItem>
            </UserMenu>,
            document.body
          )}
          {typeof window !== "undefined" && document && confirmOpen && createPortal(
            <>
              <ConfirmBackdrop $open={confirmOpen} onClick={() => setConfirmOpen(false)} aria-hidden={!confirmOpen} />
              <ConfirmDialog
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-exit-title"
                $open={confirmOpen}
                onKeyDown={(e) => { if (e.key === "Escape") setConfirmOpen(false); }}
              >
                <ConfirmTitle id="confirm-exit-title">Você deseja realmente sair?</ConfirmTitle>
                <ConfirmActions>
                  <CancelButton type="button" onClick={() => setConfirmOpen(false)}>Cancelar</CancelButton>
                  <ConfirmButton type="button" onClick={onLogout}>Confirmar</ConfirmButton>
                </ConfirmActions>
              </ConfirmDialog>
            </>,
            document.body
          )}
        </Sidebar>
        <Overlay $show={open} onClick={() => setOpen(false)} aria-hidden={!open} />
        <Content>{children}</Content>
      </Shell>
    </Page>
  );
}

