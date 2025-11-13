"use client";

import { useEffect, useRef, useState } from "react";
import styled from "styled-components";

// Layout base (reutiliza estilos do Home)
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

// Top avatar (150x150) for the form
const AvatarTop = styled.div`
  width: 150px;
  height: 150px;
  border-radius: 8px;
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, #f1f5ff, #ffffff);
  border: 1px solid rgba(0,0,0,0.08);
  box-shadow: 0 10px 20px rgba(0,0,0,0.06);
  display: grid;
  place-items: center;
  margin: 0 auto; /* centraliza horizontalmente */
`;

const AvatarImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain; /* mantém proporção sem distorções */
  image-rendering: auto;
`;

const AvatarSkeleton = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, #eef2f7 25%, #f8f9fb 50%, #eef2f7 75%);
  background-size: 200% 100%;
  animation: shimmer 1.2s infinite;
  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;

const EditBadge = styled.label`
  position: absolute;
  right: 8px;
  bottom: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255,255,255,0.9);
  border: 1px solid var(--border);
  cursor: pointer;
  box-shadow: 0 6px 12px rgba(0,0,0,0.08);
  color: #111827;
  font-size: 12px;
  backdrop-filter: saturate(180%) blur(6px);
  &:hover { background: rgba(255,255,255,1); }
`;

const RemoveBadge = styled.button`
  position: absolute;
  left: 8px;
  bottom: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255,255,255,0.9);
  border: 1px solid var(--border);
  cursor: pointer;
  box-shadow: 0 6px 12px rgba(0,0,0,0.08);
  color: #8b0000;
  font-size: 12px;
  backdrop-filter: saturate(180%) blur(6px);
  &:hover { background: rgba(255,240,240,1); }
`;

const HiddenInput = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

// Ações inline ao lado do avatar
const AvatarRow = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
`;

const AvatarActions = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
`;

const EditAction = styled.label`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255,255,255,0.9);
  border: 1px solid var(--border);
  cursor: pointer;
  box-shadow: 0 6px 12px rgba(0,0,0,0.08);
  color: #111827;
  font-size: 12px;
  backdrop-filter: saturate(180%) blur(6px);
  &:hover { background: rgba(255,255,255,1); }
`;

const RemoveAction = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255,255,255,0.9);
  border: 1px solid var(--border);
  cursor: pointer;
  box-shadow: 0 6px 12px rgba(0,0,0,0.08);
  color: #8b0000;
  font-size: 12px;
  backdrop-filter: saturate(180%) blur(6px);
  &:hover { background: rgba(255,240,240,1); }
`;

const UserName = styled.div`
  font-size: 16px;
  font-weight: 600;
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
  --card-radius: 18px;
  grid-column: span 12;
  position: relative;
  border-radius: var(--card-radius);
  padding: 20px;
  background: linear-gradient(180deg, #ffffff, #fcfcff);
  border: 1px solid transparent;
  background-clip: padding-box;
  box-shadow: 0 18px 40px rgba(20, 93, 191, 0.08), 0 6px 18px rgba(0,0,0,0.06);

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: var(--card-radius);
    padding: 1px;
    background: conic-gradient(from 180deg, #c9d7ff, #e6edff, #cfe0ff, #c9d7ff);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }

  @media (min-width: 960px) {
    grid-column: span 8;
  }
`;

const CardHeader = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
`;

const HeaderIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--primary-600), var(--primary-800));
  box-shadow: 0 10px 20px rgba(20, 93, 191, 0.25);
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 800;
`;

const CardTitle = styled.h1`
  font-size: 1.5rem;
  margin: 0;
`;

const Muted = styled.p`
  color: var(--muted);
  margin: 0 0 12px;
`;

const Field = styled.div`
  margin-bottom: 14px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 6px;
  font-weight: 600;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(0,0,0,0.08);
  background: #fff;
  box-shadow: inset 0 -1px 0 rgba(0,0,0,0.06);
  transition: box-shadow .2s, border-color .2s, transform .06s;
  &:focus {
    border-color: transparent;
    box-shadow: 0 0 0 3px rgba(20, 93, 191, 0.25), inset 0 -1px 0 rgba(0,0,0,0.06);
    outline: none;
  }
  &:hover { transform: translateY(-0.5px); }
`;

const CheckboxRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
`;

const FieldRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const PrimaryButton = styled.button`
  padding: 12px 16px;
  border: 0;
  border-radius: 10px;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(135deg, var(--primary-600), var(--primary-800));
  box-shadow: 0 6px 12px rgba(20, 93, 191, 0.2);
  &:hover { filter: brightness(1.04); }
  &:disabled { opacity: .6; cursor: not-allowed; }
`;

const Actions = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: center;
`;

const Small = styled.small`
  color: var(--muted);
`;

const SubTitle = styled.h2`
  font-size: 1.1rem;
  margin: 18px 0 8px;
  font-weight: 700;
`;

const Hint = styled.p`
  color: var(--muted);
  margin: 0 0 10px;
`;

const MainArea = styled.div`
  grid-column: span 12;
  display: grid;
  gap: 16px;
  @media (min-width: 960px) {
    grid-column: span 8;
  }
`;

const SideArea = styled.div`
  grid-column: span 12;
  display: grid;
  gap: 16px;
  @media (min-width: 960px) {
    grid-column: span 4;
    position: sticky;
    top: 88px;
    align-self: start;
  }
`;

const SideCard = styled(Card)`
  grid-column: span 12;
`;

const InlineWarning = styled.span`
  color: #b91c1c;
  font-size: 0.85rem;
`;

const FormMessage = styled.p`
  margin: 12px 0 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(37, 99, 235, 0.08);
  color: #1d4ed8;
  font-weight: 600;
`;

const CheckboxList = styled.div`
  display: grid;
  gap: 10px;
`;

const CheckboxItem = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.9rem;
  color: #0f172a;

  input {
    width: 18px;
    height: 18px;
  }
`;

const InlineInfo = styled.p`
  margin: 8px 0;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(20, 93, 191, 0.08);
  color: #1d4ed8;
  font-size: 0.85rem;
`;

const VerificationList = styled.ul`
  display: grid;
  gap: 10px;
  padding: 0;
  margin: 0;
  list-style: none;
`;

const VerificationItem = styled.li`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(148, 163, 184, 0.12);
  padding: 10px 12px;
  border-radius: 10px;
`;

const VerificationLabel = styled.span`
  font-weight: 600;
  color: #475569;
`;

const VerificationValue = styled.span<{ "data-status"?: string }>`
  font-weight: 700;
  color: ${(p) => (p["data-status"] === "true" ? "#047857" : "#b45309")};
`;

type Profile = {
  name: string;
  email: string;
  phone: string;
  jobTitle: string;
  company: string;
  account: { twoFactor: boolean; newsletter: boolean };
  avatarUrl: string;
  discordTag: string;
  phoneVerified: boolean;
  pendingEmail: string;
  emailVerifiedAt: string | null;
};

export default function ProfilePage() {
  const [open, setOpen] = useState<boolean>(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [imgLoading, setImgLoading] = useState<boolean>(false);
  const [imgError, setImgError] = useState<boolean>(false);
  const [emailNew, setEmailNew] = useState<string>("");
  const [emailSaving, setEmailSaving] = useState<boolean>(false);
  const [emailMessage, setEmailMessage] = useState<string>("");
  const [pwdCurrent, setPwdCurrent] = useState<string>("");
  const [pwdNew, setPwdNew] = useState<string>("");
  const [pwdConfirm, setPwdConfirm] = useState<string>("");
  const [pwdSaving, setPwdSaving] = useState<boolean>(false);
  const [pwdMessage, setPwdMessage] = useState<string>("");
  const firstLinkRef = useRef<HTMLAnchorElement | null>(null);

  // Normaliza URLs de avatar: aceita data URIs, HTTPS absolutos e caminhos relativos
  function resolveAvatarUrl(u?: string): string {
    if (!u) return "";
    const val = String(u);
    if (val.startsWith("data:")) return val; // preview local/base64
    if (/^https?:\/\//i.test(val)) return val; // URL absoluta
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      if (val.startsWith("/")) return `${origin}${val}`; // caminho relativo raiz
      return `${origin}/${val}`; // caminho relativo sem barra inicial
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
        const res = await fetch("/api/profile");
        if (res.ok) {
          const json = await res.json();
          setProfile(json as Profile);
          setAvatarPreview(resolveAvatarUrl((json as Profile).avatarUrl) || "");
          const url = (json as Profile).avatarUrl || "";
          if (url) {
            setImgLoading(true);
            setImgError(false);
          } else {
            setImgLoading(false);
            setImgError(true);
          }
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (open && firstLinkRef.current) {
      firstLinkRef.current.focus();
    }
  }, [open]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          phone: profile.phone,
          jobTitle: profile.jobTitle,
          company: profile.company,
          avatarUrl: avatarPreview,
          account: profile.account,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Falha ao salvar");
      setProfile(json as Profile);
      setMessage("Alterações salvas com sucesso.");
    } catch (err: any) {
      setMessage(err?.message || String(err));
    } finally {
      setSaving(false);
    }
  }

  async function onAvatarChange(file?: File) {
    if (!file) return;
    // preview local
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(String(reader.result || ""));
    reader.readAsDataURL(file);

    setImgLoading(true);
    setImgError(false);

    // upload para server
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", body: fd });
      const json = await res.json();
      if (res.ok && json?.avatarUrl) {
        setAvatarPreview(resolveAvatarUrl(json.avatarUrl));
        setProfile((p) => (p ? { ...p, avatarUrl: json.avatarUrl } : p));
        setImgLoading(false);
      } else {
        setMessage(json?.error || "Falha ao enviar avatar");
        setImgLoading(false);
        setImgError(true);
      }
    } catch (e: any) {
      setMessage(e?.message || String(e));
      setImgLoading(false);
      setImgError(true);
    }
  }

  async function onRemoveAvatar() {
    setAvatarPreview("");
    setImgLoading(false);
    setImgError(true);
    setMessage("");
    if (!profile) return;
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          phone: profile.phone,
          jobTitle: profile.jobTitle,
          company: profile.company,
          avatarUrl: "",
          account: profile.account,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Falha ao remover avatar");
      setProfile(json as Profile);
      setMessage("Foto removida.");
    } catch (err: any) {
      setMessage(err?.message || String(err));
    }
  }

  async function onChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!emailNew) { setEmailMessage("Informe o novo e-mail."); return; }
    setEmailSaving(true);
    setEmailMessage("");
    try {
      const res = await fetch("/api/profile/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail: emailNew }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Falha ao atualizar e-mail");
      setProfile((p) => (p ? { ...p, pendingEmail: emailNew } : p));
      setEmailMessage("Verificação enviada para o novo e-mail.");
      setEmailNew("");
    } catch (err: any) {
      setEmailMessage(err?.message || String(err));
    } finally {
      setEmailSaving(false);
    }
  }

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdMessage("");
    if (!pwdCurrent || !pwdNew || !pwdConfirm) {
      setPwdMessage("Preencha todos os campos.");
      return;
    }
    if (pwdNew.length < 8) {
      setPwdMessage("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (pwdNew !== pwdConfirm) {
      setPwdMessage("As senhas não coincidem.");
      return;
    }
    setPwdSaving(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwdCurrent, newPassword: pwdNew }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Falha ao alterar senha");
      setPwdMessage("Senha alterada com sucesso.");
      setPwdCurrent("");
      setPwdNew("");
      setPwdConfirm("");
    } catch (err: any) {
      setPwdMessage(err?.message || String(err));
    } finally {
      setPwdSaving(false);
    }
  }

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
        <Sidebar id="sidebar" aria-label="Menu lateral" aria-expanded={open} aria-hidden={!open} $open={open}>
          <nav role="navigation" aria-label="Navegação principal">
            <MenuScroll>
              <NavItem ref={firstLinkRef} href="/home" aria-label="Início">
                Início
              </NavItem>
              <NavItem href="/tickets" aria-label="Tickets">
                Tickets
              </NavItem>
              <NavItem href="/users" aria-label="Usuários">
                Usuários
              </NavItem>
              <NavItem href="/history" aria-label="Histórico">
                Histórico
              </NavItem>
              <NavItem href="/config?section=forms" aria-label="Configurações">
                Configurações
              </NavItem>
              <NavItem href="/profile" aria-label="Perfil" aria-current="page">
                Perfil
              </NavItem>
            </MenuScroll>
          </nav>

          <UserFooter>
            <Avatar>
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" />
              ) : (
                (profile?.name?.[0] || profile?.email?.[0] || "U").toUpperCase()
              )}
            </Avatar>
            <div>
              <UserName>{profile?.name || "Usuário"}</UserName>
              <Small>{profile?.email || "email não informado"}</Small>
            </div>
          </UserFooter>
        </Sidebar>

        <Overlay $show={open} onClick={() => setOpen(false)} />

        <Content>
          <MainArea>
            <Card as="section" aria-labelledby="profile-title">
              <CardHeader>
                <HeaderIcon>👤</HeaderIcon>
                <div>
                  <CardTitle id="profile-title">Perfil do usuário</CardTitle>
                  <Muted>Atualize suas informações pessoais, foto de perfil e preferências de conta.</Muted>
                </div>
              </CardHeader>

              <AvatarRow>
                <AvatarTop>
                  {avatarPreview && !imgError ? (
                    <AvatarImg src={avatarPreview} alt="Pré-visualização do avatar" onLoad={() => setImgLoading(false)} onError={() => { setImgLoading(false); setImgError(true); }} />
                  ) : (
                    <span>{profile?.name?.[0] || profile?.email?.[0] || "U"}</span>
                  )}
                  {imgLoading && <AvatarSkeleton />}
                  <EditBadge>
                    Alterar foto
                    <HiddenInput type="file" accept="image/*" onChange={(event) => onAvatarChange(event.target.files?.[0])} />
                  </EditBadge>
                  {avatarPreview && (
                    <RemoveBadge type="button" onClick={onRemoveAvatar}>
                      Remover
                    </RemoveBadge>
                  )}
                </AvatarTop>
                {imgError && <InlineWarning>Não foi possível carregar a imagem atual.</InlineWarning>}
              </AvatarRow>

              <form onSubmit={onSave}>
                <Field>
                  <Label htmlFor="name">Nome completo</Label>
                  <Input
                    id="name"
                    value={profile?.name ?? ""}
                    onChange={(event) => setProfile((prev) => (prev ? { ...prev, name: event.target.value } : prev))}
                    placeholder="Seu nome"
                  />
                </Field>

                <FieldRow>
                  <Field>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={profile?.phone ?? ""}
                      onChange={(event) => setProfile((prev) => (prev ? { ...prev, phone: event.target.value } : prev))}
                      placeholder="(00) 00000-0000"
                    />
                  </Field>
                  <Field>
                    <Label htmlFor="discord">Discord</Label>
                    <Input
                      id="discord"
                      value={profile?.discordTag ?? ""}
                      onChange={(event) => setProfile((prev) => (prev ? { ...prev, discordTag: event.target.value } : prev))}
                      placeholder="usuario#0000"
                    />
                  </Field>
                </FieldRow>

                <FieldRow>
                  <Field>
                    <Label htmlFor="job">Cargo</Label>
                    <Input
                      id="job"
                      value={profile?.jobTitle ?? ""}
                      onChange={(event) => setProfile((prev) => (prev ? { ...prev, jobTitle: event.target.value } : prev))}
                      placeholder="Ex: Analista de TI"
                    />
                  </Field>
                  <Field>
                    <Label htmlFor="company">Empresa</Label>
                    <Input
                      id="company"
                      value={profile?.company ?? ""}
                      onChange={(event) => setProfile((prev) => (prev ? { ...prev, company: event.target.value } : prev))}
                      placeholder="Nome da empresa"
                    />
                  </Field>
                </FieldRow>

                <SubTitle>Preferências da conta</SubTitle>
                <Hint>Escolha as opções que deseja ativar.</Hint>
                <CheckboxList>
                  <CheckboxItem htmlFor="twoFactor">
                    <input
                      id="twoFactor"
                      type="checkbox"
                      checked={!!profile?.account?.twoFactor}
                      onChange={() => setProfile((prev) => (prev ? { ...prev, account: { ...prev.account, twoFactor: !prev.account?.twoFactor } } : prev))}
                    />
                    <span>Autenticação em dois fatores</span>
                  </CheckboxItem>
                  <CheckboxItem htmlFor="newsletter">
                    <input
                      id="newsletter"
                      type="checkbox"
                      checked={!!profile?.account?.newsletter}
                      onChange={() => setProfile((prev) => (prev ? { ...prev, account: { ...prev.account, newsletter: !prev.account?.newsletter } } : prev))}
                    />
                    <span>Receber novidades e comunicados</span>
                  </CheckboxItem>
                </CheckboxList>

                {message && <FormMessage role="status">{message}</FormMessage>}

                <Actions>
                  <PrimaryButton type="submit" disabled={saving || !profile}>
                    {saving ? "Salvando..." : "Salvar alterações"}
                  </PrimaryButton>
                </Actions>
              </form>
            </Card>
          </MainArea>

          <SideArea>
            <SideCard as="section" aria-labelledby="email-title">
              <CardHeader>
                <HeaderIcon>📧</HeaderIcon>
                <div>
                  <CardTitle id="email-title">Atualizar e-mail</CardTitle>
                  <Muted>Informe um novo endereço para receber o link de confirmação.</Muted>
                </div>
              </CardHeader>
              <form onSubmit={onChangeEmail}>
                <Field>
                  <Label htmlFor="new-email">Novo e-mail</Label>
                  <Input
                    id="new-email"
                    type="email"
                    value={emailNew}
                    onChange={(event) => setEmailNew(event.target.value)}
                    placeholder="novo@email.com"
                  />
                </Field>
                {profile?.pendingEmail && (
                  <InlineInfo>
                    Verificação pendente para <strong>{profile.pendingEmail}</strong>
                  </InlineInfo>
                )}
                {emailMessage && <FormMessage role="status">{emailMessage}</FormMessage>}
                <Actions>
                  <PrimaryButton type="submit" disabled={emailSaving}>
                    {emailSaving ? "Enviando..." : "Enviar verificação"}
                  </PrimaryButton>
                </Actions>
              </form>
            </SideCard>

            <SideCard as="section" aria-labelledby="password-title">
              <CardHeader>
                <HeaderIcon>🔐</HeaderIcon>
                <div>
                  <CardTitle id="password-title">Alterar senha</CardTitle>
                  <Muted>Use uma combinação forte com pelo menos 8 caracteres.</Muted>
                </div>
              </CardHeader>
              <form onSubmit={onChangePassword}>
                <Field>
                  <Label htmlFor="pwd-current">Senha atual</Label>
                  <Input
                    id="pwd-current"
                    type="password"
                    value={pwdCurrent}
                    onChange={(event) => setPwdCurrent(event.target.value)}
                  />
                </Field>
                <Field>
                  <Label htmlFor="pwd-new">Nova senha</Label>
                  <Input
                    id="pwd-new"
                    type="password"
                    value={pwdNew}
                    onChange={(event) => setPwdNew(event.target.value)}
                  />
                </Field>
                <Field>
                  <Label htmlFor="pwd-confirm">Confirmar nova senha</Label>
                  <Input
                    id="pwd-confirm"
                    type="password"
                    value={pwdConfirm}
                    onChange={(event) => setPwdConfirm(event.target.value)}
                  />
                </Field>
                {pwdMessage && <FormMessage role="status">{pwdMessage}</FormMessage>}
                <Actions>
                  <PrimaryButton type="submit" disabled={pwdSaving}>
                    {pwdSaving ? "Alterando..." : "Alterar senha"}
                  </PrimaryButton>
                </Actions>
              </form>
            </SideCard>

            <SideCard as="section" aria-labelledby="verifications-title">
              <CardHeader>
                <HeaderIcon>✅</HeaderIcon>
                <div>
                  <CardTitle id="verifications-title">Verificações</CardTitle>
                  <Muted>Acompanhe o status das confirmações vinculadas à sua conta.</Muted>
                </div>
              </CardHeader>
              <VerificationList>
                <VerificationItem>
                  <VerificationLabel>E-mail principal</VerificationLabel>
                  <VerificationValue data-status="true">
                    {profile?.emailVerifiedAt ? "Verificado" : "Pendente"}
                  </VerificationValue>
                </VerificationItem>
                <VerificationItem>
                  <VerificationLabel>Telefone</VerificationLabel>
                  <VerificationValue data-status={profile?.phoneVerified ? "true" : "false"}>
                    {profile?.phoneVerified ? "Verificado" : "Pendente"}
                  </VerificationValue>
                </VerificationItem>
              </VerificationList>
            </SideCard>
          </SideArea>
        </Content>
      </Shell>
    </Page>
  );
}
