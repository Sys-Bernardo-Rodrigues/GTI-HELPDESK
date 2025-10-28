"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import type { AuthUser } from "@/lib/auth";
import { removeDivElement } from "@/lib/dom";

type Props = { initialUser: AuthUser };

type ProfileData = {
  name: string;
  email: string;
  phone: string;
  jobTitle: string;
  company: string;
  account: {
    twoFactor: boolean;
    newsletter: boolean;
  };
  avatarUrl?: string;
  discordTag?: string;
  phoneVerified?: boolean;
  pendingEmail?: string;
  emailVerifiedAt?: string | null;
};

function sanitize(input: string) {
  // Minimal XSS guard: strip angle brackets and control chars; React escapes output too
  return input.replace(/[<>\u0000-\u001F\u007F]/g, "");
}

export default function ProfileClient({ initialUser }: Props) {
  const storageKey = useMemo(() => `profile:draft:${initialUser.id}`, [initialUser.id]);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [baseline, setBaseline] = useState<ProfileData | null>(null);
  const [uploading, setUploading] = useState(false);
  const timeouts = useRef<number[]>([]);
  const scheduleClearSaved = (ms: number) => {
    const id = window.setTimeout(() => setSavedMsg(null), ms);
    timeouts.current.push(id);
  };
  // States for new per-section flows
  const [savingName, setSavingName] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailPendingMsg, setEmailPendingMsg] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  const [smsStep, setSmsStep] = useState<"idle" | "sent">("idle");
  const [smsCode, setSmsCode] = useState("");
  const [savingDiscord, setSavingDiscord] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState<ProfileData>({
    name: initialUser.name ?? "",
    email: initialUser.email,
    phone: "",
    jobTitle: "",
    company: "",
    account: { twoFactor: false, newsletter: false },
    avatarUrl: (initialUser as any).avatarUrl ?? "",
    discordTag: "",
    phoneVerified: false,
    pendingEmail: "",
    emailVerifiedAt: null,
  });

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    return () => {
      // Cleanup any pending timers to avoid leaks
      for (const id of timeouts.current.splice(0)) {
        clearTimeout(id);
      }
    };
  }, []);

  // Remove the placeholder <div> safely after mount, preserving layout with spacer
  useEffect(() => {
    const el = document.querySelector<HTMLDivElement>(".profile-form-placeholder");
    if (el) {
      removeDivElement(el);
    }
  }, []);

  // Load from API and restore draft from sessionStorage
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/profile", { cache: "no-store" });
        if (!res.ok) throw new Error("Falha ao buscar perfil");
        const data = (await res.json()) as ProfileData;
        if (!cancelled) {
          const draft = sessionStorage.getItem(storageKey);
          const value = draft ? { ...data, ...JSON.parse(draft) } : data;
          setForm(value);
          setBaseline(value);
        }
      } catch (e) {
        // Fallback to initial user
        const draft = sessionStorage.getItem(storageKey);
        if (!cancelled) {
          setForm((prev) => draft ? { ...prev, ...JSON.parse(draft) } : prev);
          setBaseline((prev) => prev ?? null);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [storageKey]);

  // Persist draft within session (maintain state during navigation)
  useEffect(() => {
    sessionStorage.setItem(storageKey, JSON.stringify(form));
  }, [form, storageKey]);

  function setField<K extends keyof ProfileData>(key: K, value: ProfileData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onInput(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target;
    if (name === "twoFactor" || name === "newsletter") {
      setForm((f) => ({ ...f, account: { ...f.account, [name]: checked } }));
    } else {
      setForm((f) => ({ ...f, [name]: sanitize(value) } as ProfileData));
    }
  }

  function onCancel() {
    if (baseline) {
      setForm(baseline);
      sessionStorage.setItem(storageKey, JSON.stringify(baseline));
      setSavedMsg("Edição cancelada");
      scheduleClearSaved(1200);
    }
  }

  async function onUploadAvatar(file: File) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setErrorMsg("Imagem deve ser PNG, JPG ou WEBP");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg("Imagem excede 2MB");
      return;
    }
    setErrorMsg(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setForm((f) => ({ ...f, avatarUrl: data.avatarUrl }));
      setBaseline((b) => (b ? { ...b, avatarUrl: data.avatarUrl } : b));
      setSavedMsg("Foto atualizada");
      scheduleClearSaved(1200);
    } catch (err: any) {
      setErrorMsg(typeof err?.message === "string" ? err.message : "Falha ao enviar imagem");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function validate(): string[] {
    const errs: string[] = [];
    if (!form.name.trim()) errs.push("Nome é obrigatório");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.push("E-mail inválido");
    if (form.phone && !/^\+?[0-9\s().-]{7,}$/.test(form.phone)) errs.push("Telefone inválido");
    if (form.jobTitle.length > 80) errs.push("Cargo muito longo");
    if (form.company.length > 120) errs.push("Empresa muito longa");
    return errs;
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSavedMsg(null);
    setErrorMsg(null);
    const errs = validate();
    if (errs.length) {
      setErrorMsg(errs.join("; "));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as ProfileData;
      setForm(data);
      setBaseline(data);
      setSavedMsg("Alterações salvas");
      scheduleClearSaved(1500);
    } catch (err: any) {
      setErrorMsg(typeof err?.message === "string" ? err.message : "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="profile-page">
      <h1 className="profile-title">Meu Perfil</h1>

      {/* Avatar + Upload */}
      <section className="profile-avatar">
        <div className="avatar-preview" aria-busy={uploading}>
          {form.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.avatarUrl} alt="Foto de perfil" />
          ) : (
            <div className="avatar-fallback">{form.name?.[0] || form.email?.[0]}</div>
          )}
        </div>
        <div className="avatar-actions">
          <label className="btn-secondary">
            Alterar foto
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUploadAvatar(file);
              }}
            />
          </label>
        </div>
      </section>

      {/* Form removido do DOM conforme solicitado. Mantemos um placeholder
          para evitar deslocamentos visuais indesejados. */}
      <div className="profile-form-placeholder" aria-hidden="true"></div>

      {/* Seções com salvamento independente */}
      <section className="profile-section">
        <h2>Nome completo</h2>
        <div className="row">
          <input
            aria-label="Nome completo"
            value={form.name}
            onChange={(e) => {
              const v = e.target.value.replace(/[^A-Za-zÀ-ÿ\s]/g, "");
              setForm((f) => ({ ...f, name: sanitize(v) }));
            }}
            maxLength={100}
          />
          <button
            className="save-btn"
            disabled={savingName}
            onClick={async () => {
              const clean = form.name.trim();
              if (clean.length < 2) {
                setErrorMsg("Nome deve ter ao menos 2 caracteres");
                return;
              }
              setSavingName(true);
              setErrorMsg(null);
              try {
                const res = await fetch("/api/profile", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ...form, name: clean }),
                });
                if (!res.ok) throw new Error(await res.text());
                const data = (await res.json()) as ProfileData;
                setForm(data);
                setBaseline(data);
                setSavedMsg("Nome atualizado");
                scheduleClearSaved(1200);
              } catch (e: any) {
                setErrorMsg(typeof e?.message === "string" ? e.message : "Falha ao salvar nome");
              } finally {
                setSavingName(false);
              }
            }}
          >
            {savingName ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </section>

      <section className="profile-section">
        <h2>E-mail</h2>
        <div className="row">
          <input
            type="email"
            aria-label="E-mail"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: sanitize(e.target.value) }))}
          />
          <button
            className="save-btn"
            disabled={savingEmail}
            onClick={async () => {
              setSavingEmail(true);
              setErrorMsg(null);
              setEmailPendingMsg(null);
              try {
                const res = await fetch("/api/profile/email", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email: form.email }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data?.error || "Falha ao iniciar confirmação");
                setEmailPendingMsg("Enviamos um link de confirmação para o novo e-mail.");
                // Para ambiente de dev, exibimos o link de verificação recebido
                if (data?.verifyUrl) setEmailPendingMsg(`${emailPendingMsg ? emailPendingMsg + " " : ""}Link de verificação: ${data.verifyUrl}`);
              } catch (e: any) {
                setErrorMsg(typeof e?.message === "string" ? e.message : "Falha ao salvar e-mail");
              } finally {
                setSavingEmail(false);
              }
            }}
          >
            {savingEmail ? "Enviando..." : "Salvar e enviar confirmação"}
          </button>
        </div>
        {emailPendingMsg && <small className="ok">{emailPendingMsg}</small>}
      </section>

      <section className="profile-section">
        <h2>Alterar senha</h2>
        <PasswordChanger onDone={(msg) => setSavedMsg(msg)} onError={(m) => setErrorMsg(m)} />
      </section>

      <section className="profile-section">
        <h2>Telefone</h2>
        <div className="row">
          <input
            type="tel"
            aria-label="Telefone"
            value={form.phone}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "");
              let masked = digits;
              if (digits.length >= 10) {
                const d = digits.padEnd(11, " ");
                masked = digits.length === 11
                  ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11).trim()}`
                  : `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6, 10).trim()}`;
              }
              setForm((f) => ({ ...f, phone: masked }));
            }}
            placeholder="(11) 99999-9999"
          />
          <button
            className="save-btn"
            disabled={savingPhone}
            onClick={async () => {
              setSavingPhone(true);
              setErrorMsg(null);
              try {
                const res = await fetch("/api/profile/phone", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ phone: form.phone }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data?.error || "Falha ao salvar telefone");
                setForm((f) => ({ ...f, phone: data.phone, phoneVerified: data.phoneVerified }));
                setSavedMsg("Telefone atualizado");
                scheduleClearSaved(1200);
              } catch (e: any) {
                setErrorMsg(typeof e?.message === "string" ? e.message : "Falha ao salvar telefone");
              } finally {
                setSavingPhone(false);
              }
            }}
          >
            {savingPhone ? "Salvando..." : "Salvar"}
          </button>
        </div>
        <div className="row">
          <button
            className="btn-secondary"
            onClick={async () => {
              try {
                const res = await fetch("/api/profile/phone/request-code", { method: "POST" });
                const data = await res.json();
                if (!res.ok) throw new Error(data?.error || "Falha ao enviar código");
                setSmsStep("sent");
                setSavedMsg("Código SMS enviado");
                scheduleClearSaved(1200);
              } catch (e: any) {
                setErrorMsg(typeof e?.message === "string" ? e.message : "Falha ao enviar SMS");
              }
            }}
          >
            Enviar código por SMS
          </button>
          {smsStep === "sent" && (
            <>
              <input
                aria-label="Código SMS"
                placeholder="Código de 6 dígitos"
                value={smsCode}
                onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
              <button
                className="btn-tertiary"
                onClick={async () => {
                  try {
                    const res = await fetch("/api/profile/phone/verify", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ code: smsCode }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data?.error || "Falha ao verificar");
                    setForm((f) => ({ ...f, phoneVerified: true }));
                    setSmsStep("idle");
                    setSmsCode("");
                    setSavedMsg("Telefone verificado");
                    scheduleClearSaved(1200);
                  } catch (e: any) {
                    setErrorMsg(typeof e?.message === "string" ? e.message : "Código inválido");
                  }
                }}
              >
                Verificar código
              </button>
            </>
          )}
        </div>
      </section>

      <section className="profile-section">
        <h2>Discord</h2>
        <div className="row">
          <input
            aria-label="Usuário do Discord"
            placeholder="username#0000"
            value={form.discordTag || ""}
            onChange={(e) => setForm((f) => ({ ...f, discordTag: sanitize(e.target.value) }))}
          />
          <button
            className="save-btn"
            disabled={savingDiscord}
            onClick={async () => {
              setSavingDiscord(true);
              setErrorMsg(null);
              try {
                const res = await fetch("/api/profile/discord", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ discordTag: form.discordTag }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data?.error || "Falha ao salvar Discord");
                setForm((f) => ({ ...f, discordTag: data.discordTag }));
                setSavedMsg("Usuário do Discord atualizado");
                scheduleClearSaved(1200);
              } catch (e: any) {
                setErrorMsg(typeof e?.message === "string" ? e.message : "Falha ao salvar Discord");
              } finally {
                setSavingDiscord(false);
              }
            }}
          >
            {savingDiscord ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </section>
    </main>
  );
}

function PasswordChanger({ onDone, onError }: { onDone: (m: string) => void; onError: (m: string) => void }) {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirmPassword, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  function strongEnough(pw: string) {
    return pw.length >= 8 && /\d/.test(pw) && /[^A-Za-z0-9]/.test(pw);
  }

  return (
    <div className="password-changer">
      <div className="row">
        <input type="password" placeholder="Senha atual" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} />
        <input type="password" placeholder="Nova senha" value={newPassword} onChange={(e) => setNew(e.target.value)} />
        <input type="password" placeholder="Confirmar nova senha" value={confirmPassword} onChange={(e) => setConfirm(e.target.value)} />
        <button
          className="save-btn"
          disabled={saving}
          onClick={async () => {
            if (!strongEnough(newPassword)) {
              onError("Senha fraca. Mínimo 8, com número e caractere especial");
              return;
            }
            if (newPassword !== confirmPassword) {
              onError("A confirmação não confere");
              return;
            }
            setSaving(true);
            try {
              const res = await fetch("/api/profile/password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data?.error || "Falha ao alterar senha");
              setCurrent(""); setNew(""); setConfirm("");
              onDone("Senha alterada com sucesso");
            } catch (e: any) {
              onError(typeof e?.message === "string" ? e.message : "Falha ao alterar senha");
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </div>
  );
}