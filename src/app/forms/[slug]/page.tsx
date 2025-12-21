"use client";

import { useEffect, useState, use } from "react";
import styled, { keyframes } from "styled-components";
import { useSound } from "@/lib/sounds";
import { useNotifications } from "@/lib/notifications";
import { Button, Input, Textarea } from "@/components/design-system";

type Field = { id: number; label: string; type: "TEXT"|"TEXTAREA"|"SELECT"|"RADIO"|"CHECKBOX"|"FILE"; options?: string|null; required: boolean };

const slideIn = keyframes`
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

const ToastWrap = styled.div`
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 1000;
`;

const Toast = styled.div<{ $type: "success" | "error" }>`
  min-width: 300px;
  max-width: 420px;
  padding: 16px 20px;
  border-radius: 16px;
  box-shadow: var(--shadow-xl);
  color: #fff;
  font-size: 0.9375rem;
  font-weight: 500;
  line-height: 1.5;
  background: ${({ $type }) => 
    $type === "success" 
      ? "linear-gradient(135deg, var(--success-600) 0%, var(--success-700) 100%)"
      : "linear-gradient(135deg, var(--error-600) 0%, var(--error-700) 100%)"};
  animation: ${slideIn} 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  gap: 12px;

  &::before {
    content: "${({ $type }) => ($type === "success" ? "✓" : "✕")}";
    font-size: 1.25rem;
    font-weight: 700;
    opacity: 0.9;
  }
`;

export default function PublicFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const sounds = useSound();
  const notifications = useNotifications();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [fields, setFields] = useState<Field[]>([]);
  const [success, setSuccess] = useState(false);
  const [ticketId, setTicketId] = useState<number | null>(null);
  const [deactivated, setDeactivated] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const { slug } = use(params);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/forms/by-slug?slug=${encodeURIComponent(slug)}`);
        if (!res.ok) throw new Error("Formulário não encontrado");
        const data = await res.json();
        setTitle(data.title || "");
        setFields((data.fields || []).map((f: any) => ({ id: f.id, label: f.label, type: f.type, options: f.options, required: f.required })));
        setLoading(false);
      } catch (e: any) {
        setError(e?.message || "Erro ao carregar");
        setLoading(false);
      }
    })();
  }, [slug]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const formId = (formEl as any)["data-form-id"]; // not used here
    const formData = new FormData(formEl);
    // submit via API (need form id; fetch by slug first)
    const metaRes = await fetch(`/api/forms/by-slug?slug=${encodeURIComponent(slug)}`);
    if (!metaRes.ok) {
      const err = await metaRes.json().catch(() => null);
      setError(err?.error || "Formulário não encontrado.");
      setToast({ type: "error", message: err?.error || "Formulário não encontrado." });
      return;
    }
    const meta = await metaRes.json();
    const res = await fetch(`/api/forms/${meta.id}/submit`, { method: "POST", body: formData });
    const j = await res.json().catch(() => ({}));
    if (res.ok) {
      setSuccess(true);
      setTicketId(j?.ticketId ?? null);
      setToast({ type: "success", message: "Formulário enviado com sucesso." });
      sounds.playTicketCreated();
      // desativa campos imediatamente após o toast
      setDeactivated(true);
      // ação persistente tratada no servidor; em caso de falha, notificar e reativar
      if (j?.postActionStatus === "error") {
        setToast({ type: "error", message: j?.postActionMessage || "Não foi possível desativar o formulário." });
        setDeactivated(false);
        sounds.playError();
      }
      // limpar e ocultar toast após 2.5s
      setTimeout(() => setToast(null), 2500);
      formEl.reset();
    } else {
      const errMsg = j?.error || "Falha ao enviar formulário.";
      setError(errMsg);
      setToast({ type: "error", message: errMsg });
      sounds.playError();
      setTimeout(() => setToast(null), 2500);
    }
  }

  if (loading) return <Wrapper><Card><h1>Carregando...</h1></Card></Wrapper>;
  if (error) return <Wrapper><Card role="alert"><h1>Erro</h1><p>{error}</p></Card></Wrapper>;

  return (
    <Wrapper>
      <Card>
        <Title>{title}</Title>
        {success && (
          <Success>
            Obrigado! Sua resposta foi enviada.
            {ticketId ? (
              <span style={{ display: "block", marginTop: 8 }}>Ticket gerado: <strong>#{ticketId}</strong>.</span>
            ) : (
              <span style={{ display: "block", marginTop: 8 }}>Ticket registrado no sistema.</span>
            )}
          </Success>
        )}
        <Form onSubmit={onSubmit} data-form-id={slug}>
          <input type="text" name="website" style={{ display: "none" }} tabIndex={-1} aria-hidden />
          {fields.map((f) => (
            <FieldRow key={f.id} $required={f.required}>
              <label>{f.label}</label>
              {f.type === "TEXT" && (
                <Input
                  name={`field_${f.id}`}
                  type="text"
                  required={f.required}
                  disabled={deactivated}
                  placeholder={`Digite ${f.label.toLowerCase()}...`}
                />
              )}
              {f.type === "TEXTAREA" && (
                <Textarea
                  name={`field_${f.id}`}
                  required={f.required}
                  disabled={deactivated}
                  placeholder={`Digite ${f.label.toLowerCase()}...`}
                  rows={4}
                />
              )}
              {f.type === "SELECT" && (
                <select name={`field_${f.id}`} required={f.required} disabled={deactivated}>
                  <option value="">Selecione uma opção...</option>
                  {(f.options || "").split(",").map((opt, i) => (
                    <option key={i} value={opt.trim()}>{opt.trim()}</option>
                  ))}
                </select>
              )}
              {f.type === "RADIO" && (
                <RadioGroup>
                  {(f.options || "").split(",").map((opt, i) => (
                    <label key={i}>
                      <input
                        type="radio"
                        name={`field_${f.id}`}
                        value={opt.trim()}
                        required={f.required}
                        disabled={deactivated}
                      />
                      <span>{opt.trim()}</span>
                    </label>
                  ))}
                </RadioGroup>
              )}
              {f.type === "CHECKBOX" && (
                <CheckboxWrapper>
                  <input
                    type="checkbox"
                    name={`field_${f.id}`}
                    disabled={deactivated}
                  />
                  <span>{f.label}</span>
                </CheckboxWrapper>
              )}
              {f.type === "FILE" && (
                <FileInputWrapper>
                  <input
                    type="file"
                    name={`field_${f.id}`}
                    accept="image/*"
                    required={f.required}
                    disabled={deactivated}
                  />
                </FileInputWrapper>
              )}
            </FieldRow>
          ))}
          <Actions>
            <Button type="submit" disabled={deactivated} size="lg" fullWidth>
              Enviar Formulário
            </Button>
          </Actions>
        </Form>
      </Card>
      {toast && (
        <ToastWrap>
          <Toast $type={toast.type}>{toast.message}</Toast>
        </ToastWrap>
      )}
    </Wrapper>
  );
}

const Wrapper = styled.main`
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--primary-50) 0%, var(--secondary-50) 100%);
  padding: 40px 20px;
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 50%, rgba(2, 132, 199, 0.08) 0%, transparent 50%),
      radial-gradient(circle at 80% 80%, rgba(147, 51, 234, 0.08) 0%, transparent 50%);
    pointer-events: none;
  }
`;

const Card = styled.section`
  width: min(720px, 100%);
  border-radius: 24px;
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-xl);
  padding: 48px 40px;
  position: relative;
  z-index: 1;
  animation: fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1);

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 768px) {
    padding: 32px 24px;
    border-radius: 20px;
  }
`;

const Title = styled.h1`
  font-size: 2.25rem;
  font-weight: 800;
  margin: 0 0 32px;
  color: var(--text);
  line-height: 1.2;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, var(--primary-700) 0%, var(--secondary-700) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;

  @media (max-width: 768px) {
    font-size: 1.875rem;
    margin-bottom: 24px;
  }
`;

const Success = styled.div`
  padding: 20px 24px;
  border-radius: 16px;
  background: linear-gradient(135deg, var(--success-50) 0%, rgba(16, 185, 129, 0.1) 100%);
  border: 2px solid var(--success-500);
  color: var(--success-700);
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.6;
  margin-bottom: 32px;
  display: flex;
  align-items: flex-start;
  gap: 12px;

  &::before {
    content: "✓";
    font-size: 1.5rem;
    color: var(--success-600);
    flex-shrink: 0;
  }

  strong {
    color: var(--success-800);
    font-weight: 700;
  }
`;

const Form = styled.form`
  display: grid;
  gap: 28px;
`;

const FieldRow = styled.div`
  display: grid;
  gap: 10px;

  label {
    font-weight: 600;
    font-size: 0.9375rem;
    color: var(--text);
    display: flex;
    align-items: center;
    gap: 4px;

    &::after {
      content: "*";
      color: var(--error-500);
      font-weight: 700;
      display: ${(p: { $required?: boolean }) => (p.$required ? "inline" : "none")};
    }
  }

  input:not([type="radio"]):not([type="checkbox"]):not([type="file"]),
  textarea,
  select {
    width: 100%;
    padding: 14px 16px;
    border-radius: 12px;
    border: 2px solid var(--border);
    background: var(--surface);
    color: var(--text);
    font-family: inherit;
    font-size: 0.9375rem;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: var(--shadow-sm);

    &:hover:not(:disabled):not(:focus) {
      border-color: var(--border-strong);
    }

    &:focus {
      outline: none;
      border-color: var(--primary-500);
      box-shadow: 
        0 0 0 4px rgba(2, 132, 199, 0.1),
        var(--shadow-md);
      background: var(--surface-elevated);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      background: var(--gray-100);
    }

    &::placeholder {
      color: var(--text-subtle);
    }
  }

  select {
    cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%234b5563' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 14px center;
    padding-right: 40px;
  }
`;

const RadioGroup = styled.div`
  display: grid;
  gap: 12px;
  margin-top: 4px;

  label {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    border-radius: 12px;
    border: 2px solid var(--border);
    background: var(--surface);
    cursor: pointer;
    transition: all 0.2s ease;
    font-weight: 500;

    &:hover {
      background: var(--gray-50);
      border-color: var(--primary-300);
    }

    input[type="radio"] {
      width: 20px;
      height: 20px;
      margin: 0;
      cursor: pointer;
      accent-color: var(--primary-600);
    }

    input[type="radio"]:checked + span {
      color: var(--primary-700);
      font-weight: 600;
    }
  }
`;

const CheckboxWrapper = styled.label`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  border: 2px solid var(--border);
  background: var(--surface);
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 4px;

  &:hover {
    background: var(--gray-50);
    border-color: var(--primary-300);
  }

  input[type="checkbox"] {
    width: 20px;
    height: 20px;
    margin: 0;
    cursor: pointer;
    accent-color: var(--primary-600);
  }
`;

const FileInputWrapper = styled.div`
  position: relative;

  input[type="file"] {
    width: 100%;
    padding: 14px 16px;
    border-radius: 12px;
    border: 2px dashed var(--border);
    background: var(--gray-50);
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 0.9375rem;

    &:hover {
      border-color: var(--primary-400);
      background: var(--primary-50);
    }

    &:focus {
      outline: none;
      border-color: var(--primary-500);
      box-shadow: 
        0 0 0 4px rgba(2, 132, 199, 0.1),
        var(--shadow-md);
    }

    &::file-selector-button {
      padding: 8px 16px;
      border-radius: 8px;
      border: 1px solid var(--primary-300);
      background: var(--primary-600);
      color: white;
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      margin-right: 12px;
      transition: all 0.2s ease;

      &:hover {
        background: var(--primary-700);
      }
    }
  }
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
  padding-top: 24px;
  border-top: 1px solid var(--border);
`;