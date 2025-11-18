"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import StandardLayout from "@/components/StandardLayout";

// Tipos
type AccessProfile = {
  id: number;
  name: string;
  description: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  pages: Array<{ id: number; pagePath: string; pageName: string }>;
  userCount: number;
  users: Array<{ id: number; name: string; email: string }>;
};

type ProfileFormState = {
  name: string;
  description: string;
  pagePaths: string[];
};

// Páginas disponíveis do menu
const AVAILABLE_PAGES = [
  { path: "/home", name: "Início" },
  { path: "/tickets", name: "Tickets" },
  { path: "/base", name: "Base de Conhecimento" },
  { path: "/agenda", name: "Agenda" },
  { path: "/history", name: "Histórico" },
  { path: "/relatorios", name: "Relatórios" },
  { path: "/aprovacoes", name: "Aprovações" },
  { path: "/projetos", name: "Projetos" },
  { path: "/users", name: "Usuários" },
  { path: "/config?section=forms", name: "Formulários" },
  { path: "/config?section=webhooks", name: "Webhooks" },
  { path: "/config/acessos", name: "Acessos" },
  { path: "/profile", name: "Perfil" },
];

const emptyForm: ProfileFormState = {
  name: "",
  description: "",
  pagePaths: [],
};

// Styled Components
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

const PrimaryButton = styled.button`
  padding: 10px 14px;
  border-radius: 10px;
  border: 0;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(135deg, var(--primary-600), var(--primary-800));
  box-shadow: 0 6px 12px rgba(20, 93, 191, 0.2);
  font-size: 0.9rem;
  transition: background .15s ease, transform .05s ease;
  &:hover { 
    background: linear-gradient(135deg, var(--primary-700), var(--primary-900));
  }
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

const ProfilesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  margin-top: 16px;
`;

const ProfileCard = styled.div`
  background: #fff;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 12px;
  padding: 16px;
  transition: all 0.2s ease;
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }
`;

const ProfileCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
`;

const ProfileName = styled.h3`
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
  color: #1f2937;
`;

const ProfileDescription = styled.p`
  font-size: 0.9rem;
  color: var(--muted);
  margin: 8px 0;
  line-height: 1.5;
`;

const ProfileMeta = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(148, 163, 184, 0.2);
  font-size: 0.85rem;
  color: var(--muted);
`;

const ProfilePages = styled.div`
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(148, 163, 184, 0.2);
`;

const ProfilePagesTitle = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
`;

const ProfilePagesList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const PageBadge = styled.span`
  display: inline-block;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  background: rgba(59, 130, 246, 0.1);
  color: #2563eb;
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
  width: min(700px, 96vw);
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
  margin-bottom: 16px;
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

const FormGrid = styled.div`
  display: grid;
  gap: 16px;
`;

const Field = styled.div`
  display: grid;
  gap: 6px;
`;

const Label = styled.label`
  font-weight: 600;
  font-size: 0.9rem;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(0,0,0,0.08);
  background: #fff;
  box-shadow: inset 0 -1px 0 rgba(0,0,0,0.06);
  font-size: 0.95rem;
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(0,0,0,0.08);
  background: #fff;
  box-shadow: inset 0 -1px 0 rgba(0,0,0,0.06);
  font-size: 0.95rem;
  min-height: 80px;
  resize: vertical;
  font-family: inherit;
`;

const PagesSection = styled.div`
  margin-top: 8px;
`;

const PagesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px;
  margin-top: 12px;
  max-height: 300px;
  overflow-y: auto;
  padding: 8px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 8px;
  background: #f8fafc;
`;

const PageCheckbox = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s ease;
  &:hover {
    background: rgba(59, 130, 246, 0.1);
  }
  input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
  }
  span {
    font-size: 0.9rem;
    color: #374151;
  }
`;

const ModalActions = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: flex-end;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid rgba(148, 163, 184, 0.2);
`;

const CancelButton = styled.button`
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: #fff;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background .15s ease, transform .05s ease;
  &:hover { background: #f8fafc; }
  &:active { transform: translateY(1px); }
  &:disabled { opacity: .6; cursor: default; }
`;

const ConfirmButton = styled.button`
  padding: 10px 14px;
  border-radius: 10px;
  border: 0;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(135deg, var(--primary-600), var(--primary-800));
  box-shadow: 0 6px 12px rgba(20, 93, 191, 0.2);
  font-size: 0.9rem;
  transition: background .15s ease, transform .05s ease;
  &:hover { 
    background: linear-gradient(135deg, var(--primary-700), var(--primary-900));
  }
  &:active { transform: translateY(1px); }
  &:disabled { opacity: .6; cursor: default; }
`;

const DangerButton = styled.button`
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #ffd0d0;
  background: #fff5f5;
  color: #B00000;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background .15s ease, transform .05s ease;
  &:hover { background: #ffecec; }
  &:active { transform: translateY(1px); }
  &:disabled { opacity: .6; cursor: default; }
`;

export default function AcessosPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);
  const [profiles, setProfiles] = useState<AccessProfile[]>([]);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [editOpen, setEditOpen] = useState<boolean>(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [form, setForm] = useState<ProfileFormState>(emptyForm);
  const [saving, setSaving] = useState<boolean>(false);
  const [profileToDelete, setProfileToDelete] = useState<number | null>(null);

  useEffect(() => {
    loadProfiles();
  }, []);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  async function loadProfiles() {
    setLoading(true);
    try {
      const res = await fetch("/api/access-profiles");
      if (!res.ok) throw new Error("Erro ao carregar perfis");
      const json = await res.json();
      setProfiles(json.items || []);
    } catch (error: any) {
      setFeedback({ type: "error", text: error?.message || "Erro ao carregar perfis de acesso" });
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setForm(emptyForm);
    setSelectedProfileId(null);
    setCreateOpen(true);
  }

  function closeCreateModal() {
    if (saving) return;
    setCreateOpen(false);
    setForm(emptyForm);
  }

  function openEditModal(profile: AccessProfile) {
    setForm({
      name: profile.name,
      description: profile.description || "",
      pagePaths: profile.pages.map((p) => p.pagePath),
    });
    setSelectedProfileId(profile.id);
    setEditOpen(true);
  }

  function closeEditModal() {
    if (saving) return;
    setEditOpen(false);
    setForm(emptyForm);
    setSelectedProfileId(null);
  }

  function togglePage(path: string) {
    setForm((prev) => ({
      ...prev,
      pagePaths: prev.pagePaths.includes(path)
        ? prev.pagePaths.filter((p) => p !== path)
        : [...prev.pagePaths, path],
    }));
  }

  async function saveProfile() {
    if (!form.name.trim()) {
      setFeedback({ type: "error", text: "Nome do perfil é obrigatório" });
      return;
    }

    if (form.pagePaths.length === 0) {
      setFeedback({ type: "error", text: "Selecione pelo menos uma página" });
      return;
    }

    setSaving(true);
    try {
      const url = selectedProfileId
        ? `/api/access-profiles/${selectedProfileId}`
        : "/api/access-profiles";
      const method = selectedProfileId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || null,
          pagePaths: form.pagePaths,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Erro ao salvar perfil");
      }

      setFeedback({
        type: "success",
        text: selectedProfileId ? "Perfil atualizado com sucesso" : "Perfil criado com sucesso",
      });
      await loadProfiles();
      if (selectedProfileId) {
        closeEditModal();
      } else {
        closeCreateModal();
      }
    } catch (error: any) {
      setFeedback({ type: "error", text: error?.message || "Erro ao salvar perfil" });
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(profileId: number) {
    setProfileToDelete(profileId);
    setDeleteConfirmOpen(true);
  }

  function closeDeleteConfirm() {
    setDeleteConfirmOpen(false);
    setProfileToDelete(null);
  }

  async function deleteProfile() {
    if (!profileToDelete) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/access-profiles/${profileToDelete}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Erro ao excluir perfil");
      }

      setFeedback({ type: "success", text: "Perfil excluído com sucesso" });
      await loadProfiles();
      closeDeleteConfirm();
    } catch (error: any) {
      setFeedback({ type: "error", text: error?.message || "Erro ao excluir perfil" });
    } finally {
      setSaving(false);
    }
  }

  function formatDateTime(value?: string): string {
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
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
              </svg>
            </HeaderIcon>
            <div>
              <CardTitle>Gerenciamento de Acessos</CardTitle>
              <Muted>Configure e gerencie os perfis de acesso do sistema.</Muted>
            </div>
            <HeaderActions>
              <ActionButton type="button" onClick={() => loadProfiles()} disabled={loading}>
                Recarregar
              </ActionButton>
              <PrimaryButton type="button" onClick={openCreateModal}>
                Novo perfil de acesso
              </PrimaryButton>
            </HeaderActions>
          </CardHeader>
          {feedback && (
            <Feedback role={feedback.type === "error" ? "alert" : "status"} $variant={feedback.type}>
              {feedback.text}
            </Feedback>
          )}
          {loading && (
            <Muted>Carregando perfis de acesso...</Muted>
          )}
          {!loading && profiles.length === 0 && (
            <Muted>Nenhum perfil de acesso cadastrado ainda. Clique em "Novo perfil de acesso" para criar o primeiro.</Muted>
          )}
          {!loading && profiles.length > 0 && (
            <ProfilesGrid>
              {profiles.map((profile) => (
                <ProfileCard key={profile.id}>
                  <ProfileCardHeader>
                    <div style={{ flex: 1 }}>
                      <ProfileName>{profile.name}</ProfileName>
                      {profile.description && (
                        <ProfileDescription>{profile.description}</ProfileDescription>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <ActionButton
                        type="button"
                        onClick={() => openEditModal(profile)}
                        style={{ padding: "6px 8px", fontSize: "0.85rem" }}
                      >
                        Editar
                      </ActionButton>
                      <DangerButton
                        type="button"
                        onClick={() => confirmDelete(profile.id)}
                        disabled={profile.userCount > 0}
                        style={{ padding: "6px 8px", fontSize: "0.85rem" }}
                        title={profile.userCount > 0 ? "Não é possível excluir perfil em uso" : "Excluir perfil"}
                      >
                        Excluir
                      </DangerButton>
                    </div>
                  </ProfileCardHeader>
                  <ProfilePages>
                    <ProfilePagesTitle>Páginas ({profile.pages.length})</ProfilePagesTitle>
                    <ProfilePagesList>
                      {profile.pages.map((page) => (
                        <PageBadge key={page.id}>{page.pageName}</PageBadge>
                      ))}
                    </ProfilePagesList>
                  </ProfilePages>
                  <ProfileMeta>
                    <span>{profile.userCount} usuário(s)</span>
                    <span>Criado em {formatDateTime(profile.createdAt)}</span>
                  </ProfileMeta>
                </ProfileCard>
              ))}
            </ProfilesGrid>
          )}
        </Card>
      </Content>

      {/* Modal de criação/edição */}
      {(createOpen || editOpen) && (
        <>
          <ModalBackdrop
            $open={createOpen || editOpen}
            onClick={createOpen ? closeCreateModal : closeEditModal}
            aria-hidden={!(createOpen || editOpen)}
          />
          <ModalDialog
            role="dialog"
            aria-modal="true"
            aria-labelledby={createOpen ? "create-profile-title" : "edit-profile-title"}
            $open={createOpen || editOpen}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                if (createOpen) closeCreateModal();
                else closeEditModal();
              }
            }}
          >
            <ModalHeader>
              <ModalIcon aria-hidden>
                <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
                </svg>
              </ModalIcon>
              <div>
                <ModalTitle id={createOpen ? "create-profile-title" : "edit-profile-title"}>
                  {createOpen ? "Criar perfil de acesso" : "Editar perfil de acesso"}
                </ModalTitle>
                <Muted>
                  {createOpen
                    ? "Defina o nome, descrição e selecione as páginas que este perfil pode acessar."
                    : "Atualize as informações do perfil de acesso."}
                </Muted>
              </div>
            </ModalHeader>
            <FormGrid>
              <Field>
                <Label htmlFor="profile-name">Nome do perfil *</Label>
                <Input
                  id="profile-name"
                  type="text"
                  placeholder="Ex.: Administrador, Operador, Visualizador"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </Field>
              <Field>
                <Label htmlFor="profile-description">Descrição</Label>
                <Textarea
                  id="profile-description"
                  placeholder="Descreva o propósito deste perfil de acesso"
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </Field>
              <PagesSection>
                <Label>Páginas acessíveis *</Label>
                <Muted style={{ marginTop: "4px", marginBottom: "8px" }}>
                  Selecione as páginas do menu que este perfil pode acessar ({form.pagePaths.length} selecionada(s))
                </Muted>
                <PagesGrid>
                  {AVAILABLE_PAGES.map((page) => (
                    <PageCheckbox key={page.path}>
                      <input
                        type="checkbox"
                        checked={form.pagePaths.includes(page.path)}
                        onChange={() => togglePage(page.path)}
                      />
                      <span>{page.name}</span>
                    </PageCheckbox>
                  ))}
                </PagesGrid>
              </PagesSection>
            </FormGrid>
            <ModalActions>
              <CancelButton
                type="button"
                onClick={createOpen ? closeCreateModal : closeEditModal}
                disabled={saving}
              >
                Cancelar
              </CancelButton>
              <ConfirmButton type="button" onClick={saveProfile} disabled={saving}>
                {saving ? "Salvando..." : selectedProfileId ? "Salvar alterações" : "Criar perfil"}
              </ConfirmButton>
            </ModalActions>
          </ModalDialog>
        </>
      )}

      {/* Modal de confirmação de exclusão */}
      {deleteConfirmOpen && (
        <>
          <ModalBackdrop
            $open={deleteConfirmOpen}
            onClick={closeDeleteConfirm}
            aria-hidden={!deleteConfirmOpen}
          />
          <ModalDialog
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-confirm-title"
            $open={deleteConfirmOpen}
            onKeyDown={(e) => {
              if (e.key === "Escape") closeDeleteConfirm();
            }}
            style={{ width: "min(480px, 96vw)", maxHeight: "auto" }}
          >
            <ModalHeader>
              <ModalIcon aria-hidden style={{ background: "linear-gradient(135deg, #B00000, #8A0000)" }}>
                <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
              </ModalIcon>
              <div>
                <ModalTitle id="delete-confirm-title">Confirmar exclusão</ModalTitle>
                <Muted>Tem certeza que deseja excluir este perfil de acesso? Esta ação não pode ser desfeita.</Muted>
              </div>
            </ModalHeader>
            <ModalActions>
              <CancelButton type="button" onClick={closeDeleteConfirm} disabled={saving}>
                Cancelar
              </CancelButton>
              <ConfirmButton
                type="button"
                onClick={deleteProfile}
                disabled={saving}
                style={{ background: "linear-gradient(135deg, #B00000, #8A0000)" }}
              >
                {saving ? "Excluindo..." : "Excluir perfil"}
              </ConfirmButton>
            </ModalActions>
          </ModalDialog>
        </>
      )}
    </StandardLayout>
  );
}
