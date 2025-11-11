"use client";

import { useEffect, useRef, useState } from "react";
import styled from "styled-components";

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
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
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
              <NavItem ref={firstLinkRef as any} href="http://localhost:3000/home" aria-label="Início">Início</NavItem>
              <NavItem href="/tickets" aria-label="Tickets">Tickets</NavItem>
              <NavItem href="/users" aria-label="Usuários" aria-current="page">Usuários</NavItem>
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
  position: absolute;
  left: 16px;
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

