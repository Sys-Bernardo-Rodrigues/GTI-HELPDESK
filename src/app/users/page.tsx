"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import NotificationBell from "@/components/NotificationBell";

type UserItem = {
  id: number;
  name: string;
  email: string;
  phone: string;
  jobTitle: string;
  company: string;
  avatarUrl: string;
  twoFactor: boolean;
  newsletter: boolean;
  createdAt: string | null;
};

type UserFormState = {
  name: string;
  email: string;
  phone: string;
  jobTitle: string;
  company: string;
  avatarUrl: string;
  twoFactor: boolean;
  newsletter: boolean;
};

type CreateUserState = UserFormState & {
  password: string;
};

type Feedback = { type: "success" | "error"; text: string };

const emptyUser: UserFormState = {
  name: "",
  email: "",
  phone: "",
  jobTitle: "",
  company: "",
  avatarUrl: "",
  twoFactor: false,
  newsletter: false,
};

const emptyNewUser: CreateUserState = {
  ...emptyUser,
  password: "",
};

export default function UsersPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
  const [configSubmenuOpen, setConfigSubmenuOpen] = useState<boolean>(false);
  const [sessionUser, setSessionUser] = useState<{ id: number; email: string; name: string | null } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  const [listLoading, setListLoading] = useState<boolean>(false);
  const [userItems, setUserItems] = useState<UserItem[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<UserFormState>(emptyUser);
  const [editFeedback, setEditFeedback] = useState<Feedback | null>(null);
  const [savingEdit, setSavingEdit] = useState<boolean>(false);
  const [isEditOpen, setEditOpen] = useState<boolean>(false);

  const [createForm, setCreateForm] = useState<CreateUserState>(emptyNewUser);
  const [createFeedback, setCreateFeedback] = useState<Feedback | null>(null);
  const [creatingUser, setCreatingUser] = useState<boolean>(false);
  const [isCreateOpen, setCreateOpen] = useState<boolean>(false);

  const firstLinkRef = useRef<HTMLAnchorElement | null>(null);
  const footerRef = useRef<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const firstMenuItemRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar_open");
    if (saved !== null) setSidebarOpen(saved === "true");
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebar_open", String(sidebarOpen));
  }, [sidebarOpen]);

  // Posicionar menu de config
  useEffect(() => {
    if (!configSubmenuOpen) return;
    const updatePosition = () => {
      const buttonEl = typeof window !== "undefined" && document?.getElementById("config-menu-button");
      const menuEl = typeof window !== "undefined" && document?.getElementById("config-submenu");
      if (buttonEl && menuEl) {
        const rect = (buttonEl as HTMLElement).getBoundingClientRect();
        const menu = menuEl as HTMLElement;
        menu.style.left = `${rect.right + 8}px`;
        menu.style.top = `${rect.top}px`;
      }
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
    if (!configSubmenuOpen) return;
    function onDocDown(event: MouseEvent | TouchEvent) {
      const target = event.target as unknown as HTMLElement | null;
      if (!target) return;
      const menuContains = document?.getElementById("config-submenu")?.contains?.(target);
      const buttonContains = document?.getElementById("config-menu-button")?.contains?.(target);
      if (!menuContains && !buttonContains) {
        setConfigSubmenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("touchstart", onDocDown);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("touchstart", onDocDown);
    };
  }, [configSubmenuOpen]);

  useEffect(() => {
    if (sidebarOpen && firstLinkRef.current) {
      firstLinkRef.current.focus();
    }
  }, [sidebarOpen]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/session");
        if (res.ok) {
          const json = await res.json();
          setSessionUser(json.user);
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
    loadUsers();
  }, []);

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

  useEffect(() => {
    if (menuOpen && firstMenuItemRef.current) {
      firstMenuItemRef.current.focus();
    }
  }, [menuOpen]);

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "visible") {
        loadUsers(false);
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

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

  function mapUser(item: any): UserItem {
    return {
      id: Number(item.id),
      name: String(item.name || item.email || "Usuário"),
      email: String(item.email || ""),
      phone: String(item.phone || ""),
      jobTitle: String(item.jobTitle || ""),
      company: String(item.company || ""),
      avatarUrl: String(item.avatarUrl || ""),
      twoFactor: Boolean(item.twoFactor),
      newsletter: Boolean(item.newsletter),
      createdAt: item.createdAt ?? null,
    };
  }

  async function loadUsers(withSpinner = true) {
    if (withSpinner) setListLoading(true);
    try {
      const res = await fetch("/api/users");
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Erro ao carregar usuários.");
      }
      const json = await res.json();
      const items = Array.isArray(json?.items) ? json.items : [];
      const mapped = items.map(mapUser);
      setUserItems(mapped);
      if (selectedUserId) {
        const current = mapped.find((item) => item.id === selectedUserId);
        if (current) {
          setEditForm({
            name: current.name,
            email: current.email,
            phone: current.phone,
            jobTitle: current.jobTitle,
            company: current.company,
            avatarUrl: current.avatarUrl,
            twoFactor: current.twoFactor,
            newsletter: current.newsletter,
          });
        } else {
          setSelectedUserId(null);
          setEditForm(emptyUser);
          setEditOpen(false);
        }
      }
      setEditFeedback(null);
    } catch (error: any) {
      setEditFeedback({ type: "error", text: error?.message || "Erro ao carregar usuários." });
    } finally {
      setListLoading(false);
    }
  }

  function openEditModal(userId: number) {
    const item = userItems.find((u) => u.id === userId);
    if (!item) return;
    setSelectedUserId(userId);
    setEditForm({
      name: item.name,
      email: item.email,
      phone: item.phone,
      jobTitle: item.jobTitle,
      company: item.company,
      avatarUrl: item.avatarUrl,
      twoFactor: item.twoFactor,
      newsletter: item.newsletter,
    });
    setEditFeedback(null);
    setEditOpen(true);
  }

  function closeEditModal() {
    if (savingEdit) return;
    setEditOpen(false);
    setEditFeedback(null);
  }

  function updateEditField<K extends keyof UserFormState>(field: K, value: UserFormState[K]) {
    setEditForm((prev) => ({ ...prev, [field]: value }));
    setEditFeedback(null);
  }

  async function saveUser() {
    if (!selectedUserId) return;
    setSavingEdit(true);
    setEditFeedback(null);
    try {
      const res = await fetch(`/api/users/${selectedUserId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Erro ao salvar usuário.");
      }
      const updated = mapUser(await res.json());
      setUserItems((items) => items.map((item) => (item.id === updated.id ? updated : item)));
      setSelectedUserId(updated.id);
      setEditForm({
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        jobTitle: updated.jobTitle,
        company: updated.company,
        avatarUrl: updated.avatarUrl,
        twoFactor: updated.twoFactor,
        newsletter: updated.newsletter,
      });
      setEditFeedback({ type: "success", text: "Usuário atualizado com sucesso." });
      setEditOpen(false);
    } catch (error: any) {
      setEditFeedback({ type: "error", text: error?.message || "Erro ao salvar usuário." });
    } finally {
      setSavingEdit(false);
    }
  }

  function updateCreateField<K extends keyof CreateUserState>(field: K, value: CreateUserState[K]) {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
    setCreateFeedback(null);
  }

  function openCreateModal() {
    setCreateForm(emptyNewUser);
    setCreateFeedback(null);
    setCreateOpen(true);
  }

  function closeCreateModal() {
    if (creatingUser) return;
    setCreateOpen(false);
    setCreateFeedback(null);
  }

  async function createUser() {
    if (!createForm.name.trim()) {
      setCreateFeedback({ type: "error", text: "Informe o nome do usuário." });
      return;
    }
    if (!createForm.email.trim()) {
      setCreateFeedback({ type: "error", text: "Informe o e-mail do usuário." });
      return;
    }
    if (!createForm.password || createForm.password.length < 6) {
      setCreateFeedback({ type: "error", text: "Senha deve ter ao menos 6 caracteres." });
      return;
    }

    setCreatingUser(true);
    setCreateFeedback(null);
    try {
      const payload = {
        name: createForm.name,
        email: createForm.email,
        password: createForm.password,
        phone: createForm.phone,
        jobTitle: createForm.jobTitle,
        company: createForm.company,
        avatarUrl: createForm.avatarUrl,
        twoFactor: createForm.twoFactor,
        newsletter: createForm.newsletter,
      };
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Erro ao criar usuário.");
      }
      const created = mapUser(await res.json());
      setUserItems((items) => [created, ...items]);
      setSelectedUserId(created.id);
      setEditForm({
        name: created.name,
        email: created.email,
        phone: created.phone,
        jobTitle: created.jobTitle,
        company: created.company,
        avatarUrl: created.avatarUrl,
        twoFactor: created.twoFactor,
        newsletter: created.newsletter,
      });
      setCreateFeedback({ type: "success", text: "Usuário criado com sucesso." });
      setCreateForm(emptyNewUser);
      setCreateOpen(false);
      setEditFeedback({ type: "success", text: "Usuário criado com sucesso." });
    } catch (error: any) {
      setCreateFeedback({ type: "error", text: error?.message || "Erro ao criar usuário." });
    } finally {
      setCreatingUser(false);
    }
  }

  async function onLogout() {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch {}
    setMenuOpen(false);
    window.location.assign("/");
  }

  function formatDateTime(value?: string | null) {
    if (!value) return "-";
    try {
      const d = new Date(value);
      return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(d);
    } catch {
      return String(value);
    }
  }

  return (
    <Page>
      <TopBar role="navigation" aria-label="Barra de navegação">
        <Brand>Helpdesk</Brand>
        <TopBarActions>
          <NotificationBell />
        </TopBarActions>
        <MenuToggle
          aria-label={sidebarOpen ? "Fechar menu lateral" : "Abrir menu lateral"}
          aria-controls="sidebar"
          aria-expanded={sidebarOpen}
          onClick={() => setSidebarOpen((v) => !v)}
        >
          {sidebarOpen ? "Fechar menu" : "Abrir menu"}
        </MenuToggle>
      </TopBar>
      <Shell>
        <Sidebar
          id="sidebar"
          aria-label="Menu lateral"
          aria-expanded={sidebarOpen}
          aria-hidden={!sidebarOpen}
          $open={sidebarOpen}
          onKeyDown={(e) => { if (e.key === "Escape") setSidebarOpen(false); }}
        >
          <nav role="navigation" aria-label="Navegação principal">
            <MenuScroll>
              <NavItem ref={firstLinkRef} href="/home" aria-label="Início">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                </svg>
                <span>Início</span>
              </NavItem>
              <NavItem href="/tickets" aria-label="Tickets">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 0 0-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z"/>
                </svg>
                <span>Tickets</span>
              </NavItem>
              <NavItem href="/users" aria-label="Usuários" aria-current="page">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                </svg>
                <span>Usuários</span>
              </NavItem>
              <NavItem href="/base" aria-label="Base de Conhecimento">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                </svg>
                <span>Base</span>
              </NavItem>
              <NavItem href="/history" aria-label="Histórico">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
                </svg>
                <span>Histórico</span>
              </NavItem>
              <NavItem href="/relatorios" aria-label="Relatórios">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                </svg>
                <span>Relatórios</span>
              </NavItem>
              <div style={{ position: "relative" }}>
                <NavItemButton
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
                {typeof window !== "undefined" && document && configSubmenuOpen && createPortal(
                  <ConfigSubmenu
                    id="config-submenu"
                    role="menu"
                    aria-labelledby="config-menu-button"
                    $open={configSubmenuOpen}
                  >
                    <ConfigSubmenuItem
                      role="menuitem"
                      tabIndex={0}
                      href="/config?section=forms"
                      onClick={() => {
                        setConfigSubmenuOpen(false);
                        router.push("/config?section=forms");
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                      </svg>
                      Formulários
                    </ConfigSubmenuItem>
                    <ConfigSubmenuItem
                      role="menuitem"
                      tabIndex={0}
                      href="/config?section=webhooks"
                      onClick={() => {
                        setConfigSubmenuOpen(false);
                        router.push("/config?section=webhooks");
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                        <path d="M17.71 7.71L12 2h-1v7.59L6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 11 14.41V22h1l5.71-5.71-4.3-4.29 4.3-4.29zM13 3.83l3.88 3.88-3.88 3.88V3.83zm0 12.34v-7.76l3.88 3.88L13 16.17z"/>
                      </svg>
                      Webhooks
                    </ConfigSubmenuItem>
                  </ConfigSubmenu>,
                  document.body
                )}
              </div>
            </MenuScroll>
          </nav>
          <UserFooter
            aria-label="Menu do usuário"
            role="button"
            tabIndex={0}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls="user-menu"
            onClick={() => setMenuOpen((v) => !v)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setMenuOpen((v) => !v);
              if (e.key === "Escape") setMenuOpen(false);
              if (e.key === "ArrowDown") setMenuOpen(true);
            }}
            ref={footerRef as any}
          >
            <Avatar aria-label="Foto do usuário" role="img">
              {avatarUrl ? <img src={avatarUrl} alt="Avatar" decoding="async" /> : (sessionUser?.name?.[0] || "U")}
            </Avatar>
            <UserName aria-label="Nome do usuário">{sessionUser?.name ?? sessionUser?.email ?? "Usuário"}</UserName>
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
        </Sidebar>
        <Overlay $show={sidebarOpen} onClick={() => setSidebarOpen(false)} aria-hidden={!sidebarOpen} />
        <Content>
          <Card>
            <CardHeader>
              <HeaderIcon aria-hidden>👥</HeaderIcon>
              <div>
                <CardTitle>Usuários</CardTitle>
                <Muted>Visualize todos os usuários do helpdesk e gerencie seus dados.</Muted>
              </div>
              <HeaderActions>
                <ActionButton type="button" onClick={() => loadUsers()} disabled={listLoading}>
                  Recarregar
                </ActionButton>
                <PrimaryButton type="button" onClick={openCreateModal}>
                  Novo usuário
                </PrimaryButton>
              </HeaderActions>
            </CardHeader>
            {editFeedback && !isEditOpen && !isCreateOpen && (
              <Feedback role={editFeedback.type === "error" ? "alert" : "status"} $variant={editFeedback.type}>
                {editFeedback.text}
              </Feedback>
            )}
            <UsersTable>
              <thead>
                <tr>
                  <TableHeaderCell>Nome</TableHeaderCell>
                  <TableHeaderCell>E-mail</TableHeaderCell>
                  <TableHeaderCell>Cargo</TableHeaderCell>
                  <TableHeaderCell>Empresa</TableHeaderCell>
                  <TableHeaderCell>2FA</TableHeaderCell>
                  <TableHeaderCell>Newsletter</TableHeaderCell>
                  <TableHeaderCell>Criado em</TableHeaderCell>
                  <TableHeaderCell aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                {listLoading && (
                  <tr>
                    <TableCell colSpan={8}>
                      <Muted>Carregando usuários...</Muted>
                    </TableCell>
                  </tr>
                )}
                {!listLoading && userItems.length === 0 && (
                  <tr>
                    <TableCell colSpan={8}>
                      <Muted>Nenhum usuário encontrado.</Muted>
                    </TableCell>
                  </tr>
                )}
                {!listLoading && userItems.map((item) => (
                  <tr key={item.id}>
                    <TableCell>
                      <UserCell>
                        <AvatarCircle aria-hidden>
                          {item.avatarUrl ? <img src={item.avatarUrl} alt="" /> : (item.name?.[0] || "U")}
                        </AvatarCircle>
                        <div>
                          <strong>{item.name}</strong>
                          <small>ID: {item.id}</small>
                        </div>
                      </UserCell>
                    </TableCell>
                    <TableCell>{item.email}</TableCell>
                    <TableCell>{item.jobTitle || "-"}</TableCell>
                    <TableCell>{item.company || "-"}</TableCell>
                    <TableCell>{item.twoFactor ? "Sim" : "Não"}</TableCell>
                    <TableCell>{item.newsletter ? "Sim" : "Não"}</TableCell>
                    <TableCell>{formatDateTime(item.createdAt)}</TableCell>
                    <TableCell>
                      <ActionButton type="button" onClick={() => openEditModal(item.id)}>
                        Editar
                      </ActionButton>
                    </TableCell>
                  </tr>
                ))}
              </tbody>
            </UsersTable>
          </Card>
        </Content>
      </Shell>

      {isEditOpen && (
        <>
          <ModalBackdrop $open={isEditOpen} onClick={closeEditModal} aria-hidden={!isEditOpen} />
          <ModalDialog
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-user-title"
            $open={isEditOpen}
            onKeyDown={(e) => { if (e.key === "Escape") closeEditModal(); }}
          >
            <ModalHeader>
              <ModalIcon aria-hidden>✏️</ModalIcon>
              <div>
                <ModalTitle id="edit-user-title">Editar usuário</ModalTitle>
                <Muted>Ajuste os dados e salve para atualizar o cadastro.</Muted>
              </div>
            </ModalHeader>
            {editFeedback && (
              <Feedback role={editFeedback.type === "error" ? "alert" : "status"} $variant={editFeedback.type}>
                {editFeedback.text}
              </Feedback>
            )}
            <FormGrid>
              <Field>
                <Label htmlFor="edit-name">Nome</Label>
                <Input
                  id="edit-name"
                  type="text"
                  value={editForm.name}
                  onChange={(e) => updateEditField("name", e.target.value)}
                />
              </Field>
              <Field>
                <Label htmlFor="edit-email">E-mail</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => updateEditField("email", e.target.value)}
                />
              </Field>
              <Field>
                <Label htmlFor="edit-phone">Telefone</Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => updateEditField("phone", e.target.value)}
                />
              </Field>
              <Field>
                <Label htmlFor="edit-job">Cargo</Label>
                <Input
                  id="edit-job"
                  type="text"
                  value={editForm.jobTitle}
                  onChange={(e) => updateEditField("jobTitle", e.target.value)}
                />
              </Field>
              <Field>
                <Label htmlFor="edit-company">Empresa</Label>
                <Input
                  id="edit-company"
                  type="text"
                  value={editForm.company}
                  onChange={(e) => updateEditField("company", e.target.value)}
                />
              </Field>
              <Field>
                <Label htmlFor="edit-avatar">Avatar (URL)</Label>
                <Input
                  id="edit-avatar"
                  type="url"
                  value={editForm.avatarUrl}
                  onChange={(e) => updateEditField("avatarUrl", e.target.value)}
                />
              </Field>
              <CheckboxRow>
                <label>
                  <input
                    type="checkbox"
                    checked={editForm.twoFactor}
                    onChange={(e) => updateEditField("twoFactor", e.target.checked)}
                  />
                  <span style={{ marginLeft: 8 }}>Autenticação em duas etapas</span>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={editForm.newsletter}
                    onChange={(e) => updateEditField("newsletter", e.target.checked)}
                  />
                  <span style={{ marginLeft: 8 }}>Receber comunicações</span>
                </label>
              </CheckboxRow>
            </FormGrid>
            <ModalActions>
              <CancelButton type="button" onClick={closeEditModal} disabled={savingEdit}>Cancelar</CancelButton>
              <PrimaryButton type="button" onClick={saveUser} disabled={savingEdit}>
                {savingEdit ? "Salvando..." : "Salvar alterações"}
              </PrimaryButton>
            </ModalActions>
          </ModalDialog>
        </>
      )}

      {isCreateOpen && (
        <>
          <ModalBackdrop $open={isCreateOpen} onClick={closeCreateModal} aria-hidden={!isCreateOpen} />
          <ModalDialog
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-user-title"
            $open={isCreateOpen}
            onKeyDown={(e) => { if (e.key === "Escape") closeCreateModal(); }}
          >
            <ModalHeader>
              <ModalIcon aria-hidden>➕</ModalIcon>
              <div>
                <ModalTitle id="create-user-title">Novo usuário</ModalTitle>
                <Muted>Preencha os dados iniciais para criar um novo acesso.</Muted>
              </div>
            </ModalHeader>
            {createFeedback && (
              <Feedback role={createFeedback.type === "error" ? "alert" : "status"} $variant={createFeedback.type}>
                {createFeedback.text}
              </Feedback>
            )}
            <FormGrid>
              <Field>
                <Label htmlFor="new-name">Nome</Label>
                <Input
                  id="new-name"
                  type="text"
                  value={createForm.name}
                  onChange={(e) => updateCreateField("name", e.target.value)}
                />
              </Field>
              <Field>
                <Label htmlFor="new-email">E-mail</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={createForm.email}
                  onChange={(e) => updateCreateField("email", e.target.value)}
                />
              </Field>
              <Field>
                <Label htmlFor="new-password">Senha inicial</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={createForm.password}
                  onChange={(e) => updateCreateField("password", e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
              </Field>
              <Field>
                <Label htmlFor="new-phone">Telefone</Label>
                <Input
                  id="new-phone"
                  type="tel"
                  value={createForm.phone}
                  onChange={(e) => updateCreateField("phone", e.target.value)}
                />
              </Field>
              <Field>
                <Label htmlFor="new-job">Cargo</Label>
                <Input
                  id="new-job"
                  type="text"
                  value={createForm.jobTitle}
                  onChange={(e) => updateCreateField("jobTitle", e.target.value)}
                />
              </Field>
              <Field>
                <Label htmlFor="new-company">Empresa</Label>
                <Input
                  id="new-company"
                  type="text"
                  value={createForm.company}
                  onChange={(e) => updateCreateField("company", e.target.value)}
                />
              </Field>
              <Field>
                <Label htmlFor="new-avatar">Avatar (URL)</Label>
                <Input
                  id="new-avatar"
                  type="url"
                  value={createForm.avatarUrl}
                  onChange={(e) => updateCreateField("avatarUrl", e.target.value)}
                />
              </Field>
              <CheckboxRow>
                <label>
                  <input
                    type="checkbox"
                    checked={createForm.twoFactor}
                    onChange={(e) => updateCreateField("twoFactor", e.target.checked)}
                  />
                  <span style={{ marginLeft: 8 }}>Autenticação em duas etapas</span>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={createForm.newsletter}
                    onChange={(e) => updateCreateField("newsletter", e.target.checked)}
                  />
                  <span style={{ marginLeft: 8 }}>Receber comunicações</span>
                </label>
              </CheckboxRow>
            </FormGrid>
            <ModalActions>
              <CancelButton type="button" onClick={closeCreateModal} disabled={creatingUser}>Cancelar</CancelButton>
              <PrimaryButton type="button" onClick={createUser} disabled={creatingUser}>
                {creatingUser ? "Criando..." : "Criar usuário"}
              </PrimaryButton>
            </ModalActions>
          </ModalDialog>
        </>
      )}

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
    </Page>
  );
}

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
  justify-content: space-between;
  gap: 12px;
  padding: 0 16px;
  background: #fff;
  border-bottom: 1px solid var(--border);
`;

const TopBarActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
`;

const Brand = styled.div`
  font-weight: 800;
  color: var(--primary-700);
`;

const Shell = styled.div`
  display: grid;
  grid-template-columns: 100px 1fr;
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

const NavItem = styled.a`
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
  font-weight: 500;
  transition: all 0.2s ease;
  width: 100%;
  &:hover { background: #f3f4f6; }
  &[aria-current="page"] { background: #eef2f7; font-weight: 600; }
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
  background: linear-gradient(180deg, #ffffff, #fcfcff);
  border: 1px solid transparent;
  border-radius: 18px;
  padding: 20px;
  box-shadow: 0 18px 40px rgba(20, 93, 191, 0.08), 0 6px 18px rgba(0,0,0,0.06);
  position: relative;
  background-clip: padding-box;

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1px;
    background: conic-gradient(from 180deg, #c9d7ff, #e6edff, #cfe0ff, #c9d7ff);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }
`;

const CardHeader = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
`;

const HeaderIcon = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--primary-600), var(--primary-800));
  box-shadow: 0 10px 20px rgba(20, 93, 191, 0.25);
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 800;
`;

const CardTitle = styled.h1`
  font-size: 1.4rem;
  margin: 0;
`;

const Muted = styled.p`
  color: var(--muted);
  margin: 0 0 12px;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 10px;
  margin-left: auto;
  align-items: center;
  flex-wrap: wrap;
`;

const UsersTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
  border: 1px solid rgba(148, 163, 184, 0.2);
  margin-top: 12px;
`;

const TableHeaderCell = styled.th`
  text-align: left;
  font-size: 0.9rem;
  font-weight: 700;
  color: #334155;
  padding: 12px 14px;
  background: #f8fafc;
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
`;

const TableCell = styled.td`
  padding: 14px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
  vertical-align: top;
  font-size: 0.95rem;
  color: #1f2937;
`;

const UserCell = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  strong { display: block; font-size: 1rem; }
  small { color: var(--muted); font-size: 0.75rem; }
`;

const AvatarCircle = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: #e5e7eb;
  display: grid;
  place-items: center;
  font-weight: 700;
  color: #475569;
  overflow: hidden;
  img { width: 100%; height: 100%; object-fit: cover; }
`;

const FormGrid = styled.div`
  display: grid;
  gap: 12px;
`;

const Field = styled.div`
  display: grid;
  gap: 6px;
`;

const Label = styled.label`
  font-weight: 600;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(0,0,0,0.08);
  background: #fff;
  box-shadow: inset 0 -1px 0 rgba(0,0,0,0.06);
`;

const CheckboxRow = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const PrimaryButton = styled.button`
  padding: 10px 14px;
  border-radius: 10px;
  border: 0;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(135deg, var(--primary-600), var(--primary-800));
  box-shadow: 0 6px 12px rgba(20, 93, 191, 0.2);
`;

const ActionButton = styled.button`
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: #fff;
  cursor: pointer;
  font-size: 0.9rem;
  color: var(--primary-800);
  transition: background .15s ease, transform .05s ease;
  &:hover { background: #f8fafc; }
  &:active { transform: translateY(1px); }
  &:disabled { opacity: .6; cursor: default; }
`;

const Feedback = styled.p<{ $variant: "success" | "error" }>`
  margin: 12px 0;
  padding: 12px 14px;
  border-radius: 10px;
  font-weight: 600;
  background: ${(p) => (p.$variant === "success" ? "rgba(16, 185, 129, 0.12)" : "rgba(220, 38, 38, 0.12)")};
  color: ${(p) => (p.$variant === "success" ? "#047857" : "#B91C1C")};
  border: 1px solid ${(p) => (p.$variant === "success" ? "rgba(16, 185, 129, 0.4)" : "rgba(220, 38, 38, 0.4)")};
`;

const ModalBackdrop = styled.div<{ $open: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.25);
  opacity: ${(p) => (p.$open ? 1 : 0)};
  pointer-events: ${(p) => (p.$open ? "auto" : "none")};
  transition: opacity .18s ease;
  z-index: 32;
`;

const ModalDialog = styled.div<{ $open: boolean }>`
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%) scale(${(p) => (p.$open ? 1 : 0.98)});
  opacity: ${(p) => (p.$open ? 1 : 0)};
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.16);
  width: min(680px, 96vw);
  max-height: min(85vh, 780px);
  overflow-y: auto;
  padding: 20px;
  transition: opacity .18s ease, transform .18s ease;
  z-index: 40;
`;

const ModalHeader = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
`;

const ModalIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--primary-600), var(--primary-800));
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 800;
`;

const ModalTitle = styled.h2`
  font-size: 1.3rem;
  margin: 0;
`;

const ModalActions = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: flex-end;
  margin-top: 16px;
`;

const UserMenu = styled.div<{ $open: boolean }>`
  position: fixed;
  left: 108px;
  bottom: 96px;
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
  z-index: 100;

  @media (max-width: 960px) {
    left: 16px;
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
  opacity: ${(p) => (p.$open ? 1 : 0)};
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 12px 28px rgba(0,0,0,0.12);
  width: min(480px, 94vw);
  padding: 18px;
  transition: opacity .18s ease, transform .18s ease;
  z-index: 35;
`;

const ConfirmTitle = styled.h2`
  font-size: 1.2rem;
  margin: 0 0 12px;
`;

const ConfirmActions = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: flex-end;
`;

const CancelButton = styled.button`
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: #fff;
  cursor: pointer;
`;

const ConfirmButton = styled.button`
  padding: 10px 14px;
  border-radius: 10px;
  border: 0;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(135deg, #B00000, #8A0000);
`;

