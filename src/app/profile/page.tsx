"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import StandardLayout from "@/components/StandardLayout";
import { resolveAvatarUrl } from "@/lib/assets";

const Content = styled.main`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ProfileHeader = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  padding: 32px;
  color: #fff;
  position: relative;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(102, 126, 234, 0.3);

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
    opacity: 0.3;
  }
`;

const ProfileHeaderContent = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 24px;

  @media (max-width: 768px) {
    flex-direction: column;
    text-align: center;
  }
`;

const ProfileAvatar = styled.div`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: 4px solid rgba(255, 255, 255, 0.3);
  display: grid;
  place-items: center;
  font-size: 3rem;
  font-weight: 700;
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const ProfileInfo = styled.div`
  flex: 1;
`;

const ProfileName = styled.h1`
  font-size: 2rem;
  font-weight: 800;
  margin: 0 0 8px;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
`;

const ProfileMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 12px;
  font-size: 0.9rem;
  opacity: 0.95;
`;

const ProfileMetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  
  svg {
    flex-shrink: 0;
    opacity: 0.9;
    color: rgba(255, 255, 255, 0.95);
  }
`;

const ProfileGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 16px;
`;

const Card = styled.section<{ $span?: number }>`
  background: #fff;
  border-radius: 16px;
  border: 1px solid var(--border);
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: box-shadow 0.2s ease;
  grid-column: span 12;

  ${(p) => p.$span && `
    @media (min-width: 960px) {
      grid-column: span ${p.$span};
    }
  `}

  &:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
`;

const HeaderIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--primary-600), var(--primary-800));
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 800;
  
  svg {
    width: 20px;
    height: 20px;
  }
`;

const CardTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
  color: #0f172a;
`;

const Muted = styled.p`
  color: #64748b;
  margin: 0;
  font-size: 0.875rem;
`;

const AvatarSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 24px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 16px;
  margin-bottom: 24px;
`;

const AvatarDisplay = styled.div`
  width: 160px;
  height: 160px;
  border-radius: 50%;
  background: #fff;
  border: 4px solid var(--primary-600);
  display: grid;
  place-items: center;
  font-size: 4rem;
  font-weight: 700;
  color: var(--primary-600);
  overflow: hidden;
  position: relative;
  box-shadow: 0 8px 32px rgba(59, 130, 246, 0.2);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const AvatarActions = styled.div`
  display: flex;
  gap: 12px;
`;

const AvatarButton = styled.label`
  padding: 10px 20px;
  border-radius: 10px;
  background: var(--primary-600);
  color: #fff;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;

  &:hover {
    background: var(--primary-700);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }
`;

const RemoveButton = styled.button`
  padding: 10px 20px;
  border-radius: 10px;
  background: #fee2e2;
  color: #dc2626;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;

  &:hover {
    background: #fecaca;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.2);
  }
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

const FormGrid = styled.div`
  display: grid;
  gap: 20px;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #fff;
  font-size: 0.875rem;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: var(--primary-600);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &:hover {
    border-color: #d1d5db;
  }
`;

const FieldRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const CheckboxList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const CheckboxItem = styled.label`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 10px;
  background: #f8fafc;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #f1f5f9;
  }

  input[type="checkbox"] {
    width: 20px;
    height: 20px;
    cursor: pointer;
    accent-color: var(--primary-600);
  }

  span {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
  }
`;

const PrimaryButton = styled.button`
  padding: 12px 24px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--primary-600), var(--primary-800));
  color: #fff;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const FormMessage = styled.div<{ $variant?: "success" | "error" }>`
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 0.875rem;
  font-weight: 500;
  margin-top: 16px;
  background: ${(p) => (p.$variant === "error" ? "#fee2e2" : "#dcfce7")};
  color: ${(p) => (p.$variant === "error" ? "#991b1b" : "#166534")};
  border: 1px solid ${(p) => (p.$variant === "error" ? "#fecaca" : "#bbf7d0")};
`;

const InlineInfo = styled.div`
  padding: 12px 16px;
  border-radius: 10px;
  background: #eff6ff;
  color: #1e40af;
  font-size: 0.875rem;
  margin-top: 12px;
  border: 1px solid #bfdbfe;
`;

const VerificationList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const VerificationItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
`;

const VerificationLabel = styled.span`
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
`;

const VerificationStatus = styled.span<{ $verified: boolean }>`
  font-weight: 700;
  font-size: 0.875rem;
  color: ${(p) => (p.$verified ? "#047857" : "#b45309")};
  padding: 4px 12px;
  border-radius: 6px;
  background: ${(p) => (p.$verified ? "#d1fae5" : "#fef3c7")};
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
  emailVerificationToken: string | null;
  twoFactor: boolean;
};

export default function ProfilePage() {
  const router = useRouter();
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
  const [twoFactorCode, setTwoFactorCode] = useState<string>("");
  const [twoFactorLoading, setTwoFactorLoading] = useState<boolean>(false);
  const [twoFactorMessage, setTwoFactorMessage] = useState<string>("");
  const [showTwoFactorActivate, setShowTwoFactorActivate] = useState<boolean>(false);


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

    // Verificar se há parâmetro de email verificado na URL
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("emailVerified") === "true") {
        setEmailMessage("E-mail verificado com sucesso!");
        // Remover parâmetro da URL
        window.history.replaceState({}, "", "/profile");
      }
    }
  }, []);

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
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(String(reader.result || ""));
    reader.readAsDataURL(file);

    setImgLoading(true);
    setImgError(false);

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
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailNew }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || json?.message || "Falha ao atualizar e-mail");
      setProfile((p) => (p ? { ...p, pendingEmail: emailNew } : p));
      setEmailMessage(json?.message || "Verificação enviada para o novo e-mail.");
      setEmailNew("");
    } catch (err: any) {
      setEmailMessage(err?.message || String(err));
    } finally {
      setEmailSaving(false);
    }
  }

  async function onVerifyEmail() {
    if (!profile?.emailVerificationToken) return;
    window.location.href = `/api/profile/email/verify?token=${profile.emailVerificationToken}`;
  }

  async function onRequestTwoFactorCode() {
    setTwoFactorLoading(true);
    setTwoFactorMessage("");
    try {
      const res = await fetch("/api/profile/two-factor/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json?.error || "Falha ao solicitar código");
      }
      setTwoFactorMessage(json?.message || "Código enviado para seu e-mail");
      if (json?.code) {
        console.log("Código 2FA (dev):", json.code);
      }
      setShowTwoFactorActivate(true);
    } catch (err: any) {
      setTwoFactorMessage(err?.message || String(err));
    } finally {
      setTwoFactorLoading(false);
    }
  }

  async function onActivateTwoFactor(e: React.FormEvent) {
    e.preventDefault();
    if (!twoFactorCode) {
      setTwoFactorMessage("Informe o código de verificação");
      return;
    }
    setTwoFactorLoading(true);
    setTwoFactorMessage("");
    try {
      const res = await fetch("/api/profile/two-factor/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: twoFactorCode }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json?.error || "Falha ao ativar 2FA");
      }
      setProfile((p) => (p ? { ...p, twoFactor: true } : p));
      setTwoFactorMessage(json?.message || "2FA ativado com sucesso");
      setTwoFactorCode("");
      setShowTwoFactorActivate(false);
      // Recarregar perfil
      const profileRes = await fetch("/api/profile");
      if (profileRes.ok) {
        const profileJson = await profileRes.json();
        setProfile(profileJson as Profile);
      }
    } catch (err: any) {
      setTwoFactorMessage(err?.message || String(err));
    } finally {
      setTwoFactorLoading(false);
    }
  }

  async function onDeactivateTwoFactor() {
    if (!confirm("Tem certeza que deseja desativar a autenticação de 2 fatores?")) return;
    setTwoFactorLoading(true);
    setTwoFactorMessage("");
    try {
      const res = await fetch("/api/profile/two-factor/deactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json?.error || "Falha ao desativar 2FA");
      }
      setProfile((p) => (p ? { ...p, twoFactor: false } : p));
      setTwoFactorMessage(json?.message || "2FA desativado com sucesso");
      // Recarregar perfil
      const profileRes = await fetch("/api/profile");
      if (profileRes.ok) {
        const profileJson = await profileRes.json();
        setProfile(profileJson as Profile);
      }
    } catch (err: any) {
      setTwoFactorMessage(err?.message || String(err));
    } finally {
      setTwoFactorLoading(false);
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
    <StandardLayout>
        <Content>
          <ProfileHeader>
            <ProfileHeaderContent>
              <ProfileAvatar>
                {avatarPreview && !imgError ? (
                  <img src={avatarPreview} alt="Avatar" onLoad={() => setImgLoading(false)} onError={() => { setImgLoading(false); setImgError(true); }} />
                ) : (
                  <span>{(profile?.name?.[0] || profile?.email?.[0] || "U").toUpperCase()}</span>
                )}
              </ProfileAvatar>
              <ProfileInfo>
                <ProfileName>{profile?.name || "Usuário"}</ProfileName>
                <Muted style={{ color: "rgba(255, 255, 255, 0.9)", fontSize: "1rem" }}>{profile?.email || "email não informado"}</Muted>
                <ProfileMeta>
                  {profile?.jobTitle && (
                    <ProfileMetaItem>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 0 0-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z"/>
                      </svg>
                      <span>{profile.jobTitle}</span>
                    </ProfileMetaItem>
                  )}
                  {profile?.company && (
                    <ProfileMetaItem>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 7V3H2v18h20V7H12zm-2 12H4v-2h6v2zm0-4H4v-2h6v2zm0-4H4V9h6v2zm8 8h-6v-2h6v2zm0-4h-6v-2h6v2zm0-4h-6V9h6v2z"/>
                      </svg>
                      <span>{profile.company}</span>
                    </ProfileMetaItem>
                  )}
                  {profile?.phone && (
                    <ProfileMetaItem>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                      </svg>
                      <span>{profile.phone}</span>
                    </ProfileMetaItem>
                  )}
                </ProfileMeta>
              </ProfileInfo>
            </ProfileHeaderContent>
          </ProfileHeader>

          <ProfileGrid>
            <Card>
              <CardHeader>
                <HeaderIcon>👤</HeaderIcon>
                <div>
                  <CardTitle>Informações Pessoais</CardTitle>
                  <Muted>Atualize suas informações pessoais e preferências de conta</Muted>
                </div>
              </CardHeader>

              <AvatarSection>
                <AvatarDisplay>
                  {avatarPreview && !imgError ? (
                    <img src={avatarPreview} alt="Avatar" onLoad={() => setImgLoading(false)} onError={() => { setImgLoading(false); setImgError(true); }} />
                  ) : (
                    <span>{(profile?.name?.[0] || profile?.email?.[0] || "U").toUpperCase()}</span>
                  )}
                </AvatarDisplay>
                <AvatarActions>
                  <AvatarButton>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    Alterar foto
                    <HiddenInput type="file" accept="image/*" onChange={(event) => onAvatarChange(event.target.files?.[0])} />
                  </AvatarButton>
                  {avatarPreview && (
                    <RemoveButton type="button" onClick={onRemoveAvatar}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                      Remover
                    </RemoveButton>
                  )}
                </AvatarActions>
              </AvatarSection>

              <form onSubmit={onSave}>
                <FormGrid>
                  <Field>
                    <Label htmlFor="name">Nome completo</Label>
                    <Input
                      id="name"
                      value={profile?.name ?? ""}
                      onChange={(event) => setProfile((prev) => (prev ? { ...prev, name: event.target.value } : prev))}
                      placeholder="Seu nome completo"
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

                  <div style={{ marginTop: "8px" }}>
                    <Label style={{ marginBottom: "12px", display: "block" }}>Preferências da conta</Label>
                    <CheckboxList>
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
                  </div>

                  {message && (
                    <FormMessage $variant={message.includes("sucesso") || message.includes("removida") ? "success" : "error"}>
                      {message}
                    </FormMessage>
                  )}

                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
                    <PrimaryButton type="submit" disabled={saving || !profile}>
                      {saving ? "Salvando..." : "Salvar alterações"}
                    </PrimaryButton>
                  </div>
                </FormGrid>
              </form>
            </Card>

            <Card $span={6}>
              <CardHeader>
                <HeaderIcon>📧</HeaderIcon>
                <div>
                  <CardTitle>Atualizar e-mail</CardTitle>
                  <Muted>Altere seu endereço de e-mail</Muted>
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
                    {profile?.emailVerificationToken && (
                      <div style={{ marginTop: "8px" }}>
                        <PrimaryButton
                          type="button"
                          onClick={onVerifyEmail}
                          style={{ fontSize: "0.875rem", padding: "8px 16px" }}
                        >
                          Verificar agora
                        </PrimaryButton>
                      </div>
                    )}
                  </InlineInfo>
                )}
                {emailMessage && (
                  <FormMessage $variant={emailMessage.includes("enviada") || emailMessage.includes("confirmação") ? "success" : "error"}>
                    {emailMessage}
                  </FormMessage>
                )}
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
                  <PrimaryButton type="submit" disabled={emailSaving}>
                    {emailSaving ? "Enviando..." : "Enviar verificação"}
                  </PrimaryButton>
                </div>
              </form>
            </Card>

            <Card $span={6}>
              <CardHeader>
                <HeaderIcon>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                  </svg>
                </HeaderIcon>
                <div>
                  <CardTitle>Alterar senha</CardTitle>
                  <Muted>Use uma senha forte com pelo menos 8 caracteres</Muted>
                </div>
              </CardHeader>
              <form onSubmit={onChangePassword}>
                <FormGrid>
                  <Field>
                    <Label htmlFor="pwd-current">Senha atual</Label>
                    <Input
                      id="pwd-current"
                      type="password"
                      value={pwdCurrent}
                      onChange={(event) => setPwdCurrent(event.target.value)}
                      placeholder="Digite sua senha atual"
                    />
                  </Field>
                  <Field>
                    <Label htmlFor="pwd-new">Nova senha</Label>
                    <Input
                      id="pwd-new"
                      type="password"
                      value={pwdNew}
                      onChange={(event) => setPwdNew(event.target.value)}
                      placeholder="Mínimo de 8 caracteres"
                    />
                  </Field>
                  <Field>
                    <Label htmlFor="pwd-confirm">Confirmar nova senha</Label>
                    <Input
                      id="pwd-confirm"
                      type="password"
                      value={pwdConfirm}
                      onChange={(event) => setPwdConfirm(event.target.value)}
                      placeholder="Digite novamente"
                    />
                  </Field>
                </FormGrid>
                {pwdMessage && (
                  <FormMessage $variant={pwdMessage.includes("sucesso") ? "success" : "error"}>
                    {pwdMessage}
                  </FormMessage>
                )}
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
                  <PrimaryButton type="submit" disabled={pwdSaving}>
                    {pwdSaving ? "Alterando..." : "Alterar senha"}
                  </PrimaryButton>
                </div>
              </form>
            </Card>

            <Card>
              <CardHeader>
                <HeaderIcon>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                </HeaderIcon>
                <div>
                  <CardTitle>Verificações</CardTitle>
                  <Muted>Status das confirmações da sua conta</Muted>
                </div>
              </CardHeader>
              <VerificationList>
                <VerificationItem>
                  <VerificationLabel>E-mail principal</VerificationLabel>
                  <VerificationStatus $verified={!!profile?.emailVerifiedAt}>
                    {profile?.emailVerifiedAt ? "Verificado" : "Pendente"}
                  </VerificationStatus>
                </VerificationItem>
                <VerificationItem>
                  <VerificationLabel>Telefone</VerificationLabel>
                  <VerificationStatus $verified={!!profile?.phoneVerified}>
                    {profile?.phoneVerified ? "Verificado" : "Pendente"}
                  </VerificationStatus>
                </VerificationItem>
              </VerificationList>
            </Card>

            <Card>
              <CardHeader>
                <HeaderIcon>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                </HeaderIcon>
                <div>
                  <CardTitle>Autenticação de 2 Fatores (2FA)</CardTitle>
                  <Muted>Proteja sua conta com verificação adicional por e-mail</Muted>
                </div>
              </CardHeader>
              <div style={{ padding: "20px" }}>
                <VerificationItem style={{ marginBottom: "20px" }}>
                  <div>
                    <VerificationLabel>Status 2FA</VerificationLabel>
                    <Muted style={{ marginTop: "4px", fontSize: "0.75rem" }}>
                      {profile?.twoFactor
                        ? "Autenticação de 2 fatores está ativa"
                        : "Autenticação de 2 fatores está desativada"}
                    </Muted>
                  </div>
                  <VerificationStatus $verified={!!profile?.twoFactor}>
                    {profile?.twoFactor ? "Ativo" : "Inativo"}
                  </VerificationStatus>
                </VerificationItem>

                {!profile?.twoFactor ? (
                  <div>
                    {!showTwoFactorActivate ? (
                      <div>
                        <p style={{ marginBottom: "16px", fontSize: "0.875rem", color: "#64748b" }}>
                          Ao ativar, você receberá um código por e-mail sempre que fizer login.
                        </p>
                        <PrimaryButton
                          type="button"
                          onClick={onRequestTwoFactorCode}
                          disabled={twoFactorLoading}
                        >
                          {twoFactorLoading ? "Enviando código..." : "Ativar 2FA"}
                        </PrimaryButton>
                      </div>
                    ) : (
                      <form onSubmit={onActivateTwoFactor}>
                        <Field>
                          <Label htmlFor="two-factor-code">Código de Verificação</Label>
                          <Input
                            id="two-factor-code"
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={6}
                            placeholder="000000"
                            value={twoFactorCode}
                            onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ""))}
                            required
                          />
                          <Muted style={{ marginTop: "4px", fontSize: "0.75rem" }}>
                            Digite o código de 6 dígitos enviado para seu e-mail
                          </Muted>
                        </Field>
                        {twoFactorMessage && (
                          <FormMessage $variant={twoFactorMessage.includes("sucesso") || twoFactorMessage.includes("ativado") ? "success" : "error"}>
                            {twoFactorMessage}
                          </FormMessage>
                        )}
                        <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
                          <PrimaryButton type="submit" disabled={twoFactorLoading}>
                            {twoFactorLoading ? "Ativando..." : "Confirmar e Ativar"}
                          </PrimaryButton>
                          <button
                            type="button"
                            onClick={() => {
                              setShowTwoFactorActivate(false);
                              setTwoFactorCode("");
                              setTwoFactorMessage("");
                            }}
                            style={{
                              padding: "12px 24px",
                              border: "1px solid #e5e7eb",
                              borderRadius: "10px",
                              background: "white",
                              color: "#374151",
                              fontWeight: 600,
                              fontSize: "0.875rem",
                              cursor: "pointer",
                            }}
                          >
                            Cancelar
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                ) : (
                  <div>
                    <p style={{ marginBottom: "16px", fontSize: "0.875rem", color: "#64748b" }}>
                      Sua conta está protegida com autenticação de 2 fatores. Você receberá um código por e-mail sempre que fizer login.
                    </p>
                    {twoFactorMessage && (
                      <FormMessage $variant={twoFactorMessage.includes("sucesso") || twoFactorMessage.includes("desativado") ? "success" : "error"}>
                        {twoFactorMessage}
                      </FormMessage>
                    )}
                    <button
                      type="button"
                      onClick={onDeactivateTwoFactor}
                      disabled={twoFactorLoading}
                      style={{
                        padding: "12px 24px",
                        border: "none",
                        borderRadius: "10px",
                        background: "#fee2e2",
                        color: "#dc2626",
                        fontWeight: 600,
                        fontSize: "0.875rem",
                        cursor: twoFactorLoading ? "not-allowed" : "pointer",
                        opacity: twoFactorLoading ? 0.6 : 1,
                      }}
                    >
                      {twoFactorLoading ? "Desativando..." : "Desativar 2FA"}
                    </button>
                  </div>
                )}
              </div>
            </Card>
          </ProfileGrid>
        </Content>
    </StandardLayout>
  );
}
