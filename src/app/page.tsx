"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";

const Wrapper = styled.main`
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 24px;
`;

const Card = styled.section`
  width: 100%;
  max-width: 420px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 10px 24px rgba(0,0,0,0.04);
`;

const Title = styled.h1`
  margin: 0 0 8px;
  font-size: 1.5rem;
`;

const Subtitle = styled.p`
  margin: 0 0 24px;
  color: var(--muted);
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
  border: 1px solid var(--border);
  border-radius: 999px;
  background: #fff;
  transition: border-color .2s;
  &:focus { border-color: var(--primary-700); }
`;

const PrimaryButton = styled.button`
  width: 100%;
  padding: 12px 16px;
  border: 0;
  border-radius: 999px;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(135deg, var(--primary-600), var(--primary-800));
  box-shadow: 0 6px 12px rgba(20, 93, 191, 0.2);
  &:hover { filter: brightness(1.04); }
  &:disabled { opacity: .6; cursor: not-allowed; }
`;

const LinkLine = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  a { color: var(--primary-700); font-size: 0.95rem; }
`;

 

const ErrorText = styled.p`
  color: #b91c1c;
  margin: 8px 0 0;
`;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || "Falha no login");
        return;
      }
      router.push("/home");
    } catch (err: any) {
      setError(err?.message || "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Wrapper>
      <Card aria-labelledby="login-title">
        <Title id="login-title">Entrar</Title>
        <Subtitle>Acesse o sistema Helpdesk</Subtitle>
        <form onSubmit={onSubmit}>
          <Field>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required aria-required="true" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field>
            <Label htmlFor="password">Senha</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required aria-required="true" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {error ? <ErrorText role="alert">{error}</ErrorText> : null}
          <PrimaryButton type="submit" disabled={loading} aria-busy={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </PrimaryButton>
        </form>
        <LinkLine>
          <a href="#" onClick={(e)=>e.preventDefault()} aria-label="Recuperar senha">Esqueceu a senha?</a>
          <span style={{ color: "var(--muted)", fontSize: ".95rem" }}>Ajuda</span>
        </LinkLine>
        
      </Card>
    </Wrapper>
  );
}