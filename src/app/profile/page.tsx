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
              <NavItem href="http://localhost:3000/home" aria-label="Início" ref={firstLinkRef as any}>Início</NavItem>
              <NavItem href="#" aria-label="Tickets">Tickets</NavItem>
              <NavItem href="#" aria-label="Usuários">Usuários</NavItem>
              <NavItem href="/config?section=forms" aria-label="Configurações">Configurações</NavItem>
            </MenuScroll>
          </nav>
          <UserFooter>
            <Avatar aria-label="Foto do usuário" role="img">
              {(avatarPreview || profile?.avatarUrl) ? (
                <img src={avatarPreview || resolveAvatarUrl(profile?.avatarUrl)} alt="Avatar" decoding="async" />
              ) : (
                (profile?.name?.[0] || "U")
              )}
            </Avatar>
            <UserName aria-label="Nome do usuário">{profile?.name ?? profile?.email ?? "Usuário"}</UserName>
          </UserFooter>
        </Sidebar>

        <Overlay $show={!open} onClick={() => setOpen(true)} />

        <Content>
          <Card aria-labelledby="profile-title">
            <CardHeader>
              <HeaderIcon aria-hidden>✦</HeaderIcon>
              <div>
                <CardTitle id="profile-title">Editar Perfil</CardTitle>
                <Muted>Atualize suas informações de usuário. E-mail é editado em fluxo próprio.</Muted>
              </div>
            </CardHeader>

            <form onSubmit={onSave} aria-label="Formulário de edição de perfil">
              {/* Avatar TOP: primeiro componente visível do formulário */}
              <Field>
                <Label htmlFor="avatar-top">Foto do perfil</Label>
                <AvatarRow>
                  <AvatarTop aria-label="Avatar do usuário" role="img">
                    {!imgError && (avatarPreview || profile?.avatarUrl) ? (
                      <AvatarImg
                        src={resolveAvatarUrl(avatarPreview || profile?.avatarUrl || "")}
                        alt="Foto do usuário"
                        decoding="async"
                        loading="eager"
                        onLoad={() => setImgLoading(false)}
                        onError={() => { setImgError(true); setImgLoading(false); }}
                      />
                    ) : (
                      <div style={{ display: "grid", placeItems: "center", width: "100%", height: "100%", color: "#6b7280", fontWeight: 700 }}>
                        {(profile?.name?.[0] || "U").toUpperCase()}
                      </div>
                    )}
                    {imgLoading && <AvatarSkeleton aria-hidden />}
                  </AvatarTop>
                  <AvatarActions>
                    <RemoveAction type="button" onClick={onRemoveAvatar} aria-label="Remover avatar">
                      ✕ Remover
                    </RemoveAction>
                    <EditAction htmlFor="avatar-input" aria-label="Alterar avatar">
                      ✎ Editar
                    </EditAction>
                  </AvatarActions>
                  <HiddenInput id="avatar-input" type="file" accept="image/*" onChange={(e) => onAvatarChange(e.target.files?.[0])} />
                </AvatarRow>
              </Field>
              <Field>
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  type="text"
                  required
                  value={profile?.name ?? ""}
                  onChange={(e) => setProfile((p) => (p ? { ...p, name: e.target.value } : p))}
                />
              </Field>

              <FieldRow>
                <Field>
                  <Label htmlFor="jobTitle">Cargo</Label>
                  <Input
                    id="jobTitle"
                    type="text"
                    value={profile?.jobTitle ?? ""}
                    onChange={(e) => setProfile((p) => (p ? { ...p, jobTitle: e.target.value } : p))}
                  />
                </Field>

                <Field>
                  <Label htmlFor="company">Empresa</Label>
                  <Input
                    id="company"
                    type="text"
                    value={profile?.company ?? ""}
                    onChange={(e) => setProfile((p) => (p ? { ...p, company: e.target.value } : p))}
                  />
                </Field>
              </FieldRow>

              <Field>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={profile?.phone ?? ""}
                  onChange={(e) => setProfile((p) => (p ? { ...p, phone: e.target.value } : p))}
                />
                {profile?.phone && (
                  <Small>
                    {profile?.phoneVerified ? "Telefone verificado" : "Telefone não verificado"}
                  </Small>
                )}
              </Field>

              {/* Campo de upload clássico removido para evitar duplicidade: edição via overlay */}

              <CheckboxRow>
                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(profile?.account?.twoFactor)}
                    onChange={(e) => setProfile((p) => (p ? { ...p, account: { ...p.account, twoFactor: e.target.checked } } : p))}
                  />
                  <span style={{ marginLeft: 8 }}>Ativar 2FA</span>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(profile?.account?.newsletter)}
                    onChange={(e) => setProfile((p) => (p ? { ...p, account: { ...p.account, newsletter: e.target.checked } } : p))}
                  />
                  <span style={{ marginLeft: 8 }}>Receber newsletter</span>
                </label>
              </CheckboxRow>

              {message && <Muted role="status">{message}</Muted>}

              <Actions>
                <PrimaryButton type="submit" disabled={saving || !profile} aria-label="Salvar alterações">
                  {saving ? "Salvando..." : "Salvar"}
                </PrimaryButton>
              </Actions>
            </form>

            <Muted style={{ marginTop: 12 }}>
              E-mail atual: {profile?.email ?? ""}. Para trocar, acesse Configurações de e-mail.
            </Muted>

            {/* Alterar E-mail */}
            <SubTitle>Alterar E-mail</SubTitle>
            <Hint>Informe o novo e-mail para receber a confirmação de alteração.</Hint>
            <form onSubmit={onChangeEmail} aria-label="Formulário de alteração de e-mail">
              <Field>
                <Label htmlFor="new-email">Novo e-mail</Label>
                <Input
                  id="new-email"
                  type="email"
                  required
                  value={emailNew}
                  onChange={(e) => setEmailNew(e.target.value)}
                />
              </Field>
              {emailMessage && <Muted role="status">{emailMessage}</Muted>}
              <Actions>
                <PrimaryButton type="submit" disabled={emailSaving} aria-label="Enviar confirmação para novo e-mail">
                  {emailSaving ? "Enviando..." : "Enviar confirmação"}
                </PrimaryButton>
              </Actions>
            </form>

            {/* Alterar Senha */}
            <SubTitle>Alterar Senha</SubTitle>
            <Hint>Troque sua senha atual por uma nova e segura.</Hint>
            <form onSubmit={onChangePassword} aria-label="Formulário de alteração de senha">
              <Field>
                <Label htmlFor="pwd-current">Senha atual</Label>
                <Input
                  id="pwd-current"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={pwdCurrent}
                  onChange={(e) => setPwdCurrent(e.target.value)}
                />
              </Field>
              <FieldRow>
                <Field>
                  <Label htmlFor="pwd-new">Nova senha</Label>
                  <Input
                    id="pwd-new"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={pwdNew}
                    onChange={(e) => setPwdNew(e.target.value)}
                  />
                </Field>
                <Field>
                  <Label htmlFor="pwd-confirm">Confirmar nova senha</Label>
                  <Input
                    id="pwd-confirm"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={pwdConfirm}
                    onChange={(e) => setPwdConfirm(e.target.value)}
                  />
                </Field>
              </FieldRow>
              {pwdMessage && <Muted role="status">{pwdMessage}</Muted>}
              <Actions>
                <PrimaryButton type="submit" disabled={pwdSaving} aria-label="Salvar nova senha">
                  {pwdSaving ? "Salvando..." : "Salvar nova senha"}
                </PrimaryButton>
              </Actions>
            </form>
          </Card>
        </Content>
      </Shell>
    </Page>
  );
}