"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        // Login bem-sucedido, o cookie de sessão foi definido no response.
        // A página /home fará a validação do cookie no lado do servidor.
        setMessage("Login realizado com sucesso!");
        setRedirecting(true);
        // Atraso para feedback visual antes da transição.
        setTimeout(() => router.push("/home"), 600);
      } else {
        setMessage(data?.error || "Falha no login");
      }
    } catch {
      setMessage("Erro de rede");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      {redirecting && <div className="transition-overlay show">Entrando...</div>}
      {/* Coluna esquerda: formulário */}
      <section className="login-left">
        <div className="login-container">
          <h1 className="login-title">
            <span className="gradient">Faça seu login</span>
            <span className="dot" />
          </h1>

          <form onSubmit={onSubmit} className="login-form">
            {/* Email */}
            <div>
              <label className="field-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="1.5"/><path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.5"/></svg>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@example.com"
                className="field-input"
              />
            </div>

            {/* Senha */}
            <div>
              <label className="field-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M6 10h12v10H6z" stroke="currentColor" strokeWidth="1.5"/><path d="M9 10V7a3 3 0 1 1 6 0v3" stroke="currentColor" strokeWidth="1.5"/></svg>
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="field-input"
              />
            </div>

            <div className="forgot">
              <a href="#">Esqueci minha senha</a>
            </div>

            <button type="submit" disabled={loading} className="login-button">
              {loading ? "Entrando..." : "Entrar"}
            </button>

            <p className="login-footer">Ainda não tenho uma conta</p>
          </form>

          {message && <p className="login-message">{message}</p>}
        </div>
      </section>

      {/* Coluna direita: painel ilustrativo */}
      <section className="login-right">
        <div className="stars" />
        <div className="overlay" />
      </section>
    </main>
  );
}
