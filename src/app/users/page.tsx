"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import NotificationBell from "@/components/NotificationBell";
import StandardLayout from "@/components/StandardLayout";

type AccessProfile = {
  id: number;
  name: string;
};

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
  accessProfile: AccessProfile | null;
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
  accessProfileId: number | null;
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
  accessProfileId: null,
};

const emptyNewUser: CreateUserState = {
  ...emptyUser,
  password: "",
};

export default function UsersPage() {
  const router = useRouter();

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

  const [accessProfiles, setAccessProfiles] = useState<AccessProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState<boolean>(false);


  useEffect(() => {
    loadUsers();
    loadAccessProfiles();
  }, []);

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "visible") {
        loadUsers(false);
        loadAccessProfiles();
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

  async function loadAccessProfiles() {
    setLoadingProfiles(true);
    try {
      const res = await fetch("/api/access-profiles");
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Erro ao carregar perfis de acesso:", res.status, errorText);
        return;
      }
      const json = await res.json();
      const profiles = Array.isArray(json?.items) ? json.items : [];
      const mappedProfiles = profiles.map((p: any) => ({ id: p.id, name: p.name }));
      setAccessProfiles(mappedProfiles);
    } catch (error) {
      console.error("Erro ao carregar perfis de acesso:", error);
    } finally {
      setLoadingProfiles(false);
    }
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
      accessProfile: item.accessProfile || null,
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
            accessProfileId: current.accessProfile?.id || null,
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

  async function openEditModal(userId: number) {
    const item = userItems.find((u) => u.id === userId);
    if (!item) return;
    
    // Buscar dados atualizados do usuário para garantir que temos o perfil correto
    try {
      const res = await fetch(`/api/users/${userId}`);
      if (res.ok) {
        const userData = await res.json();
        setSelectedUserId(userId);
        setEditForm({
          name: userData.name || item.name,
          email: userData.email || item.email,
          phone: userData.phone || item.phone,
          jobTitle: userData.jobTitle || item.jobTitle,
          company: userData.company || item.company,
          avatarUrl: userData.avatarUrl || item.avatarUrl,
          twoFactor: userData.twoFactor ?? item.twoFactor,
          newsletter: userData.newsletter ?? item.newsletter,
          accessProfileId: userData.accessProfile?.id || null,
        });
      } else {
        // Fallback para dados locais
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
          accessProfileId: item.accessProfile?.id || null,
        });
      }
    } catch (error) {
      // Fallback para dados locais
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
        accessProfileId: item.accessProfile?.id || null,
    });
    }
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
      const payload = {
        ...editForm,
        accessProfileId: editForm.accessProfileId || null,
      };
      const res = await fetch(`/api/users/${selectedUserId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
        accessProfileId: updated.accessProfile?.id || null,
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
        accessProfileId: createForm.accessProfileId || null,
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
        accessProfileId: created.accessProfile?.id || null,
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
    <StandardLayout>
        <Content>
          <Card>
            <CardHeader>
              <HeaderIcon aria-hidden>
                <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                  <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                </svg>
              </HeaderIcon>
              <div>
                <CardTitle>Usuários</CardTitle>
                <Muted>Visualize todos os usuários do RootDesk e gerencie seus dados.</Muted>
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
                  <TableHeaderCell>Perfil de Acesso</TableHeaderCell>
                  <TableHeaderCell>2FA</TableHeaderCell>
                  <TableHeaderCell>Newsletter</TableHeaderCell>
                  <TableHeaderCell>Criado em</TableHeaderCell>
                  <TableHeaderCell aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                {listLoading && (
                  <tr>
                    <TableCell colSpan={9}>
                      <Muted>Carregando usuários...</Muted>
                    </TableCell>
                  </tr>
                )}
                {!listLoading && userItems.length === 0 && (
                  <tr>
                    <TableCell colSpan={9}>
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
                    <TableCell>
                      {item.accessProfile ? (
                        <span style={{
                          display: "inline-block",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          fontSize: "0.85rem",
                          fontWeight: 500,
                          background: "rgba(59, 130, 246, 0.1)",
                          color: "#2563eb",
                        }}>
                          {item.accessProfile.name}
                        </span>
                      ) : (
                        <span style={{ color: "var(--muted)" }}>-</span>
                      )}
                    </TableCell>
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
              <ModalIcon aria-hidden>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
              </ModalIcon>
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
              <Field>
                <Label htmlFor="edit-access-profile">
                  Perfil de Acesso
                  {loadingProfiles && <span style={{ marginLeft: 8, fontSize: "0.85rem", color: "var(--muted)" }}>(carregando...)</span>}
                  <ActionButton
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      loadAccessProfiles();
                    }}
                    disabled={loadingProfiles}
                    style={{ marginLeft: 8, padding: "4px 8px", fontSize: "0.8rem" }}
                    title="Recarregar perfis"
                  >
                    🔄
                  </ActionButton>
                </Label>
                <Select
                  id="edit-access-profile"
                  value={editForm.accessProfileId || ""}
                  onChange={(e) => updateEditField("accessProfileId", e.target.value === "" ? null : parseInt(e.target.value, 10))}
                  disabled={loadingProfiles}
                >
                  <option value="">Nenhum perfil</option>
                  {accessProfiles.length === 0 && !loadingProfiles && (
                    <option value="" disabled>Nenhum perfil disponível. Crie um em /config/acessos</option>
                  )}
                  {accessProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name}
                    </option>
                  ))}
                </Select>
                {!loadingProfiles && accessProfiles.length === 0 && (
                  <Muted style={{ fontSize: "0.85rem", marginTop: "4px" }}>
                    Nenhum perfil encontrado. <a href="/config/acessos" style={{ color: "var(--primary-600)", textDecoration: "underline" }}>Criar perfil</a>
                  </Muted>
                )}
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
              <Field>
                <Label htmlFor="new-access-profile">
                  Perfil de Acesso
                  {loadingProfiles && <span style={{ marginLeft: 8, fontSize: "0.85rem", color: "var(--muted)" }}>(carregando...)</span>}
                  <ActionButton
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      loadAccessProfiles();
                    }}
                    disabled={loadingProfiles}
                    style={{ marginLeft: 8, padding: "4px 8px", fontSize: "0.8rem" }}
                    title="Recarregar perfis"
                  >
                    🔄
                  </ActionButton>
                </Label>
                <Select
                  id="new-access-profile"
                  value={createForm.accessProfileId || ""}
                  onChange={(e) => updateCreateField("accessProfileId", e.target.value === "" ? null : parseInt(e.target.value, 10))}
                  disabled={loadingProfiles}
                >
                  <option value="">Nenhum perfil</option>
                  {accessProfiles.length === 0 && !loadingProfiles && (
                    <option value="" disabled>Nenhum perfil disponível. Crie um em /config/acessos</option>
                  )}
                  {accessProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name}
                    </option>
                  ))}
                </Select>
                {!loadingProfiles && accessProfiles.length === 0 && (
                  <Muted style={{ fontSize: "0.85rem", marginTop: "4px" }}>
                    Nenhum perfil encontrado. <a href="/config/acessos" style={{ color: "var(--primary-600)", textDecoration: "underline" }}>Criar perfil</a>
                  </Muted>
                )}
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
      </Content>
    </StandardLayout>
  );
  }

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
  
  svg {
    width: 24px;
    height: 24px;
  }
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
`;

const Select = styled.select`
  width: 100%;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(0,0,0,0.08);
  background: #fff;
  font-size: 0.95rem;
  cursor: pointer;
  &:focus {
    outline: 2px solid var(--primary-600);
    outline-offset: 2px;
  }
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
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 12px 28px rgba(0,0,0,0.12);
  min-width: 200px;
  padding: 8px;
  opacity: ${(p) => (p.$open ? 1 : 0)};
  pointer-events: ${(p) => (p.$open ? "auto" : "none")};
  transition: opacity .18s ease;
  z-index: 10000;
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

