"use client";

import { useEffect, useRef, useState } from "react";
import styled from "styled-components";

const Page = styled.div`
  min-height: 100dvh;
  display: grid;
  grid-template-rows: 56px 1fr;
  background: var(--bg);
`;

const TopBar = styled.header`
  position: sticky;
  top: 0;
  z-index: 10;
  height: 56px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  background: #fff;
  border-bottom: 1px solid var(--border);
`;

const Brand = styled.div`
  font-weight: 800;
  color: var(--primary-700);
`;

const Shell = styled.div`
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 16px;
  padding: 16px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`;

const Sidebar = styled.aside<{ $open: boolean }>`
  background: var(--surface);
  border-right: 1px solid var(--border);
  box-shadow: 2px 0 12px rgba(0,0,0,0.06);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  height: calc(100dvh - 72px);
  overflow: hidden;
  position: sticky;
  top: 72px;
  align-self: start;
  transition: transform .25s ease, opacity .25s ease;

  @media (max-width: 960px) {
    position: fixed;
    top: 56px;
    left: 0;
    right: auto;
    width: min(82vw, 300px);
    height: calc(100dvh - 56px);
    border-radius: 0 12px 12px 0;
    transform: translateX(${(p) => (p.$open ? "0" : "-105%")});
    opacity: ${(p) => (p.$open ? 1 : 0)};
    z-index: 20;
  }
`;

const MenuScroll = styled.div`
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
`;

const NavItem = styled.a`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  color: inherit;
  text-decoration: none;
  &:hover { background: #f3f4f6; }
  &[aria-current="page"] { background: #eef2f7; font-weight: 600; }
  &:focus { outline: none; }
  &:focus-visible { outline: none; }
`;

const UserFooter = styled.footer`
  border-top: 1px solid var(--border);
  padding-top: 12px;
  display: grid;
  grid-template-columns: 80px 1fr;
  align-items: center;
  gap: 12px;
  margin-top: auto;
  cursor: pointer;
  user-select: none;
`;

const Avatar = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #e5e7eb;
  display: grid;
  place-items: center;
  color: var(--muted);
  font-weight: 700;
  user-select: none;
  overflow: hidden;
  img { width: 100%; height: 100%; object-fit: cover; }
`;

const UserName = styled.div`
  font-size: 16px;
  font-weight: 600;
`;

 

const MenuToggle = styled.button`
  margin-left: auto;
  border: 1px solid var(--border);
  background: #fff;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  @media (min-width: 961px) {
    display: none;
  }
`;

const Overlay = styled.div<{ $show: boolean }>`
  @media (min-width: 961px) { display: none; }
  position: fixed;
  inset: 56px 0 0 0;
  background: rgba(0,0,0,0.15);
  opacity: ${(p) => (p.$show ? 1 : 0)};
  pointer-events: ${(p) => (p.$show ? "auto" : "none")};
  transition: opacity .25s ease;
  z-index: 15;
`;

const Content = styled.main`
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 16px;
`;

const Card = styled.section`
  grid-column: span 12;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 10px 24px rgba(0,0,0,0.04);

  @media (min-width: 960px) {
    grid-column: span 6;
  }
`;

const CardTitle = styled.h2`
  font-size: 1.1rem;
  margin: 0 0 8px;
`;

const Muted = styled.p`
  color: var(--muted);
  margin: 0;
`;

export default function HomePage() {
  const [open, setOpen] = useState<boolean>(true);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [user, setUser] = useState<{ id: number; email: string; name: string | null } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const firstLinkRef = useRef<HTMLAnchorElement | null>(null);
  const footerRef = useRef<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);

  // Normaliza URLs do avatar (data URI, http(s), caminhos relativos)
  function resolveAvatarUrl(u?: string): string {
    if (!u) return "";
    const val = String(u);
    if (val.startsWith("data:")) return val;
    if (/^https?:\/\//i.test(val)) return val;
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      if (val.startsWith("/")) return `${origin}${val}`;
      return `${origin}/${val}`;
    }
    return val;
  }

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
        }
      } catch {}
    })();
  }, []);

  // Buscar perfil para obter avatar do usuário
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
    if (open && firstLinkRef.current) {
      firstLinkRef.current.focus();
    }
  }, [open]);

  async function onLogout() {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch {}
    setMenuOpen(false);
    window.location.assign("/");
  }

  function toggleUserMenu() {
    setMenuOpen((v) => !v);
  }

  // fechar menu ao clicar fora
  useEffect(() => {
    function onDocDown(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(target) && footerRef.current && !footerRef.current.contains(target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("touchstart", onDocDown);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("touchstart", onDocDown);
    };
  }, []);

  // acessibilidade: foco no primeiro item quando abrir menu
  const firstMenuItemRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (menuOpen && firstMenuItemRef.current) {
      firstMenuItemRef.current.focus();
    }
  }, [menuOpen]);

  return (
    <Page>
      <TopBar role="navigation" aria-label="Barra de navegação">
        <Brand>Helpdesk</Brand>
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
              <NavItem ref={firstLinkRef} href="/home" aria-label="Início" aria-current="page">Início</NavItem>
              <NavItem href="/tickets" aria-label="Tickets">Tickets</NavItem>
              <NavItem href="/users" aria-label="Usuários">Usuários</NavItem>
              <NavItem href="/history" aria-label="Histórico">Histórico</NavItem>
              <NavItem href="/relatorios" aria-label="Relatórios">Relatórios</NavItem>
              <NavItem href="/config?section=forms" aria-label="Configurações">Configurações</NavItem>
            </MenuScroll>
          </nav>
          <UserFooter
            aria-label="Menu do usuário"
            role="button"
            tabIndex={0}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls="user-menu"
            onClick={toggleUserMenu}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") toggleUserMenu();
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
          </UserMenu>
          {/* Modal de confirmação de saída (renderiza apenas quando aberto) */}
          {confirmOpen && (
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
            </>
          )}
        </Sidebar>
        <Content>
          <Card>
            <CardTitle>Tickets Abertos</CardTitle>
            <Muted>Resumo de tickets abertos no momento.</Muted>
          </Card>
          <Card>
            <CardTitle>Estatísticas</CardTitle>
            <Muted>Métricas de atendimento recentes.</Muted>
          </Card>
          <Card>
            <CardTitle>Atalhos</CardTitle>
            <Muted>Ações rápidas e favoritos.</Muted>
          </Card>
        </Content>
      </Shell>
      <Overlay $show={open} onClick={() => setOpen(false)} aria-hidden={!open} />
    </Page>
  );
}
const UserMenu = styled.div<{ $open: boolean }>`
  position: absolute;
  left: 16px;
  bottom: 96px; /* aparece acima do footer */
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 12px 28px rgba(0,0,0,0.12);
  min-width: 200px;
  padding: 8px;
  transform: translateY(${(p) => (p.$open ? "0" : "8px")});
  opacity: ${(p) => (p.$open ? 1 : 0)};
  pointer-events: ${(p) => (p.$open ? "auto" : "none")};
  transition: opacity .18s ease, transform .18s ease;
  z-index: 25;
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
  &:focus-visible { outline: none; }
`;

const ConfirmBackdrop = styled.div<{ $open: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.25);
  opacity: ${(p) => (p.$open ? 1 : 0)};
  pointer-events: ${(p) => (p.$open ? "auto" : "none")};
  transition: opacity .18s ease;
  z-index: 30;
`;

const ConfirmDialog = styled.div<{ $open: boolean }>`
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%) scale(${(p) => (p.$open ? 1 : 0.98)});
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: 0 18px 36px rgba(0,0,0,0.16);
  width: min(90vw, 420px);
  padding: 16px;
  z-index: 31;
  opacity: ${(p) => (p.$open ? 1 : 0)};
  pointer-events: ${(p) => (p.$open ? "auto" : "none")};
  transition: transform .18s ease, opacity .18s ease;
`;

const ConfirmTitle = styled.h2`
  font-size: 1.1rem;
  margin: 0 0 12px;
`;

const ConfirmActions = styled.div`
  display: flex;
  gap: 10px;
  justify-content: flex-end;
`;

const ConfirmButton = styled.button`
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid #FF0000;
  background: #FF0000;
  color: #fff;
  cursor: pointer;
  &:hover { filter: brightness(1.05); }
  &:focus { outline: none; }
  &:focus-visible { outline: none; }
`;

const CancelButton = styled.button`
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: #fff;
  cursor: pointer;
  &:hover { background: #f3f4f6; }
  &:focus { outline: none; }
  &:focus-visible { outline: none; }
`;