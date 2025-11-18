"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styled, { keyframes } from "styled-components";

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateX(-30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const Wrapper = styled.main`
  min-height: 100dvh;
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
    pointer-events: none;
  }
`;

const LeftPanel = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 48px;
  color: #fff;
  position: relative;
  z-index: 1;
  animation: ${slideIn} 0.6s ease-out;

  @media (max-width: 960px) {
    display: none;
  }
`;

const BrandContainer = styled.div`
  text-align: center;
  max-width: 480px;
`;

const Logo = styled.div`
  width: 80px;
  height: 80px;
  margin: 0 auto 24px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);

  svg {
    width: 48px;
    height: 48px;
    color: #fff;
  }
`;

const BrandTitle = styled.h1`
  font-size: 2.5rem;
  font-weight: 800;
  margin: 0 0 16px;
  background: linear-gradient(135deg, #fff 0%, rgba(255, 255, 255, 0.8) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const BrandSubtitle = styled.p`
  font-size: 1.125rem;
  margin: 0;
  opacity: 0.9;
  line-height: 1.6;
`;

const FeaturesList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 48px 0 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const FeatureItem = styled.li`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 1rem;
  opacity: 0.9;

  svg {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    opacity: 0.8;
  }
`;

const RightPanel = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  background: #fff;
  position: relative;
  z-index: 1;

  @media (max-width: 960px) {
    min-height: 100dvh;
  }
`;

const Card = styled.section`
  width: 100%;
  max-width: 440px;
  background: #fff;
  border-radius: 24px;
  padding: 48px 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
  animation: ${fadeIn} 0.6s ease-out;

  @media (max-width: 480px) {
    padding: 32px 24px;
  }
`;

const CardHeader = styled.div`
  text-align: center;
  margin-bottom: 40px;
`;

const Title = styled.h1`
  margin: 0 0 8px;
  font-size: 2rem;
  font-weight: 700;
  color: #0f172a;
`;

const Subtitle = styled.p`
  margin: 0;
  color: #64748b;
  font-size: 0.95rem;
`;

const Field = styled.div`
  margin-bottom: 20px;
  position: relative;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #334155;
  font-size: 0.9rem;
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const InputIcon = styled.div`
  position: absolute;
  left: 16px;
  color: #94a3b8;
  pointer-events: none;
  z-index: 1;

  svg {
    width: 20px;
    height: 20px;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 14px 16px 14px 48px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
  font-size: 1rem;
  transition: all 0.2s ease;
  outline: none;

  &:focus {
    border-color: var(--primary-600);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &::placeholder {
    color: #cbd5e1;
  }
`;

const PasswordToggle = styled.button`
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s ease;

  &:hover {
    background: #f1f5f9;
    color: #64748b;
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

const PrimaryButton = styled.button`
  width: 100%;
  padding: 14px 16px;
  border: 0;
  border-radius: 12px;
  color: #fff;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  background: linear-gradient(135deg, var(--primary-600), var(--primary-800));
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  transition: all 0.2s ease;
  margin-top: 8px;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const LinkLine = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e2e8f0;

  a {
    color: var(--primary-600);
    font-size: 0.9rem;
    font-weight: 500;
    text-decoration: none;
    transition: color 0.2s ease;

    &:hover {
      color: var(--primary-700);
      text-decoration: underline;
    }
  }

  span {
    color: #94a3b8;
    font-size: 0.9rem;
  }
`;

const ErrorText = styled.p`
  color: #dc2626;
  margin: 8px 0 0;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;

  svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  margin-right: 8px;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const ModalBackdrop = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const ModalDialog = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: #1f2937;
  }

  button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6b7280;
    transition: color 0.2s;

    &:hover {
      color: #1f2937;
    }

    svg {
      width: 20px;
      height: 20px;
    }
  }
`;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [twoFactorMessage, setTwoFactorMessage] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setTwoFactorMessage(null);
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, twoFactorCode: twoFactorCode || undefined }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        if (json.requiresTwoFactor) {
          setRequiresTwoFactor(true);
          setTwoFactorMessage(json.message || "Código de verificação enviado para seu e-mail");
          if (json.code) {
            console.log("Código 2FA (dev):", json.code);
          }
        } else {
          setError(json.error || "Falha no login");
        }
        return;
      }
      router.push("/home");
    } catch (err: any) {
      setError(err?.message || "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function onForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setForgotPasswordMessage(null);
    setForgotPasswordLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotPasswordEmail }),
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        setForgotPasswordMessage(json.message || "Se o e-mail existir, você receberá um link para redefinir sua senha.");
        setForgotPasswordEmail("");
        setTimeout(() => setShowForgotPassword(false), 3000);
      } else {
        setForgotPasswordMessage(json.error || "Erro ao processar solicitação");
      }
    } catch (err: any) {
      setForgotPasswordMessage(err?.message || "Erro inesperado");
    } finally {
      setForgotPasswordLoading(false);
    }
  }

  return (
    <Wrapper>
      <LeftPanel>
        <BrandContainer>
          <Logo>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0,0,256,256" fill="currentColor">
              <g fill="currentColor" fillRule="nonzero" stroke="none" strokeWidth="1" strokeLinecap="butt" strokeLinejoin="miter" strokeMiterlimit="10" strokeDasharray="" strokeDashoffset="0" fontFamily="none" fontWeight="none" fontSize="none" textAnchor="none" style={{mixBlendMode: "normal"}}>
                <g transform="translate(256,256.85152) rotate(180) scale(5.12,5.12)">
                  <path d="M25.00391,2.33398c-0.17825,0 -0.35712,0.04758 -0.51562,0.14258l-19.00391,11.41992c-0.301,0.181 -0.48437,0.50642 -0.48437,0.85742v20.46875c0,0.349 0.18052,0.67152 0.47852,0.85352l5,3.05273c0.666,0.407 1.52148,-0.07352 1.52148,-0.85352v-20.16211l13,-7.93945l13,7.93945v20.20117c0,0.78 0.85353,1.26047 1.51953,0.85547l5,-3.03906c0.299,-0.182 0.48047,-0.50547 0.48047,-0.85547v-20.52148c0,-0.351 -0.18337,-0.67642 -0.48437,-0.85742l-18.99805,-11.41992c-0.1585,-0.095 -0.33542,-0.14258 -0.51367,-0.14258zM21.99805,17.17578c-0.17381,0.00013 -0.35303,0.04669 -0.51953,0.14844l-5,3.05469c-0.298,0.182 -0.47852,0.50356 -0.47852,0.85156v20.79297c0,0.351 0.18338,0.67642 0.48438,0.85742l8.00391,4.80859c0.317,0.191 0.7123,0.19 1.0293,0l7.99805,-4.80664c0.301,-0.181 0.48438,-0.50642 0.48438,-0.85742v-20.79492c0,-0.348 -0.18052,-0.67056 -0.47852,-0.85156l-5,-3.05469c-0.666,-0.407 -1.52148,0.07251 -1.52148,0.85352v20.59375l-2,1.22266l-2,-1.22266v-20.59375c0,-0.58575 -0.48052,-1.00233 -1.00195,-1.00195z"></path>
                </g>
              </g>
            </svg>
          </Logo>
          <BrandTitle>WitchDesk</BrandTitle>
          <BrandSubtitle>
            Sistema completo de gestão de tickets e atendimento ao cliente
          </BrandSubtitle>
          <FeaturesList>
            <FeatureItem>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4" />
                <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3" />
                <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3" />
                <path d="M12 21c0-1-1-3-3-3s-3 2-3 3 1 3 3 3 3-2 3-3z" />
                <path d="M12 3c0 1-1 3-3 3S6 4 6 3 7 0 9 0s3 2 3 3z" />
              </svg>
              <span>Gestão completa de tickets</span>
            </FeatureItem>
            <FeatureItem>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>Segurança e privacidade</span>
            </FeatureItem>
            <FeatureItem>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              <span>Interface moderna e intuitiva</span>
            </FeatureItem>
          </FeaturesList>
        </BrandContainer>
      </LeftPanel>
      <RightPanel>
        <Card aria-labelledby="login-title">
          <CardHeader>
            <Title id="login-title">Bem-vindo</Title>
            <Subtitle>Entre com suas credenciais para continuar</Subtitle>
          </CardHeader>
          <form onSubmit={onSubmit}>
            <Field>
              <Label htmlFor="email">E-mail</Label>
              <InputWrapper>
                <InputIcon>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </InputIcon>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  aria-required="true"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </InputWrapper>
            </Field>
            <Field>
              <Label htmlFor="password">Senha</Label>
              <InputWrapper>
                <InputIcon>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </InputIcon>
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  aria-required="true"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <PasswordToggle
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </PasswordToggle>
              </InputWrapper>
            </Field>
            {requiresTwoFactor && (
              <Field>
                <Label htmlFor="twoFactorCode">Código de Verificação</Label>
                <InputWrapper>
                  <InputIcon>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </InputIcon>
                  <Input
                    id="twoFactorCode"
                    name="twoFactorCode"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    aria-required="true"
                    placeholder="000000"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ""))}
                    autoFocus
                  />
                </InputWrapper>
                {twoFactorMessage && (
                  <p style={{ marginTop: "8px", fontSize: "0.875rem", color: "#667eea" }}>
                    {twoFactorMessage}
                  </p>
                )}
              </Field>
            )}
            {error && (
              <ErrorText role="alert">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </ErrorText>
            )}
            <PrimaryButton type="submit" disabled={loading} aria-busy={loading}>
              {loading && <LoadingSpinner />}
              {loading ? "Entrando..." : "Entrar"}
            </PrimaryButton>
          </form>
          <LinkLine>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setShowForgotPassword(true);
              }}
              aria-label="Recuperar senha"
            >
              Esqueceu a senha?
            </a>
            <span>Ajuda</span>
          </LinkLine>
        </Card>
      </RightPanel>
      {showForgotPassword && (
        <ModalBackdrop onClick={() => setShowForgotPassword(false)}>
          <ModalDialog onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <h2>Recuperar Senha</h2>
              <button onClick={() => setShowForgotPassword(false)} aria-label="Fechar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </ModalHeader>
            <form onSubmit={onForgotPassword}>
              <Field>
                <Label htmlFor="forgot-email">E-mail</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  required
                  placeholder="seu@email.com"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                />
              </Field>
              {forgotPasswordMessage && (
                <p style={{ marginTop: "8px", fontSize: "0.875rem", color: forgotPasswordMessage.includes("Erro") ? "#ef4444" : "#667eea" }}>
                  {forgotPasswordMessage}
                </p>
              )}
              <PrimaryButton type="submit" disabled={forgotPasswordLoading} style={{ marginTop: "16px", width: "100%" }}>
                {forgotPasswordLoading ? "Enviando..." : "Enviar Link de Recuperação"}
              </PrimaryButton>
            </form>
          </ModalDialog>
        </ModalBackdrop>
      )}
    </Wrapper>
  );
}