"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [showRight, setShowRight] = useState(true);
  const [isRemoving, setIsRemoving] = useState(false);
  const [showTitle, setShowTitle] = useState(true);
  const [isRemovingTitle, setIsRemovingTitle] = useState(false);
  const [ariaMessage, setAriaMessage] = useState<string>("");
  const [showToast, setShowToast] = useState(false);
  const [toastText, setToastText] = useState<string>("");
  const router = useRouter();
  const mainRef = useRef<HTMLElement | null>(null);
  const rightRef = useRef<HTMLElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);

  // Safeguard: ensure any residual '.overlay' elements are removed synchronously post-mount
  useEffect(() => {
    try {
      document.querySelectorAll(".overlay").forEach((el) => {
        // Removing the node also drops event listeners bound to it
        el.remove();
      });
    } catch {
      // no-op: defensive guard only
    }
  }, []);

  // Remove the right login section safely with animation and a11y feedback
  useEffect(() => {
    try {
      const section = rightRef.current;
      if (!section) return;
      section.setAttribute("aria-hidden", "true");

      // Trigger React-driven CSS animation
      setIsRemoving(true);

      const onEnd = () => {
        section.removeEventListener("transitionend", onEnd);
        setShowRight(false);
        mainRef.current?.classList.add("no-right");
        setAriaMessage("Painel direito removido.");
        setToastText("Painel removido");
        setShowToast(true);
        window.setTimeout(() => setShowToast(false), 1200);
      };
      // Fallback timeout in case transitionend doesn't fire
      const timeout = window.setTimeout(onEnd, 350);
      section.addEventListener(
        "transitionend",
        () => {
          window.clearTimeout(timeout);
          onEnd();
        },
        { once: true }
      );
    } catch {
      // If anything goes wrong, fallback to simply not rendering the section
      setShowRight(false);
    }
  }, []);

  // Remove the login title (h1) safely with animation and a11y feedback
  useEffect(() => {
    try {
      const title = titleRef.current;
      if (!title) return;
      title.setAttribute("aria-hidden", "true");
      setIsRemovingTitle(true);

      const onEnd = () => {
        title.removeEventListener("transitionend", onEnd);
        setShowTitle(false);
        setAriaMessage("Título removido.");
        setToastText("Título removido");
        setShowToast(true);
        window.setTimeout(() => setShowToast(false), 1200);
      };
      const timeout = window.setTimeout(onEnd, 250);
      title.addEventListener(
        "transitionend",
        () => {
          window.clearTimeout(timeout);
          onEnd();
        },
        { once: true }
      );
    } catch {
      setShowTitle(false);
    }
  }, []);

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
    <main ref={mainRef} className="login-page">
      <div className="sr-only" role="status" aria-live="polite">{ariaMessage}</div>
      {showToast && (
        <div style={{
          position: "fixed",
          bottom: "1rem",
          left: "1rem",
          padding: ".5rem .75rem",
          borderRadius: "8px",
          background: "rgba(0,0,0,0.6)",
          color: "#fff",
          fontSize: ".875rem",
          boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
          zIndex: 50
        }}>
          {toastText || "Removido"}
        </div>
      )}
      {redirecting && <div className="transition-overlay show">Entrando...</div>}
      {/* Coluna esquerda: formulário */}
      <section className="login-left">
        <div className={`login-container${!showTitle ? " no-title" : ""}`}>
          {showTitle && (
            <h1 ref={titleRef} className={`login-title${isRemovingTitle ? " removing" : ""}`}>
              <span className="gradient">Faça seu login</span>
              <span className="dot" />
            </h1>
          )}

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
      {showRight && (
        <section
          ref={rightRef}
          className={`login-right${isRemoving ? " removing" : ""}`}
        >
          <div className="stars" />
        </section>
      )}
    </main>
  );
}
