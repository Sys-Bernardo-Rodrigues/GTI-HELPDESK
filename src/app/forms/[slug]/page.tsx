"use client";

import { useEffect, useState, use } from "react";
import styled from "styled-components";
import { useSound } from "@/lib/sounds";
import { useNotifications } from "@/lib/notifications";

type Field = { id: number; label: string; type: "TEXT"|"TEXTAREA"|"SELECT"|"RADIO"|"CHECKBOX"|"FILE"; options?: string|null; required: boolean };

const ToastWrap = styled.div`
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 1000;
`;

const Toast = styled.div<{ $type: "success" | "error" }>`
  min-width: 280px;
  max-width: 420px;
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
  color: #fff;
  font-size: 14px;
  line-height: 1.4;
  background: ${({ $type }) => ($type === "success" ? "#16a34a" : "#dc2626")};
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
            <FieldRow key={f.id}>
              <label>{f.label}{f.required ? " *" : ""}</label>
              {f.type === "TEXT" && <input name={`field_${f.id}`} required={f.required} disabled={deactivated} />}
              {f.type === "TEXTAREA" && <textarea name={`field_${f.id}`} required={f.required} disabled={deactivated} />}
              {f.type === "SELECT" && (
                <select name={`field_${f.id}`} required={f.required} disabled={deactivated}>
                  {(f.options || "").split(",").map((opt, i) => (
                    <option key={i} value={opt.trim()}>{opt.trim()}</option>
                  ))}
                </select>
              )}
              {f.type === "RADIO" && (
                <div style={{ display: "grid", gap: 8 }}>
                  {(f.options || "").split(",").map((opt, i) => (
                    <label key={i}>
                      <input type="radio" name={`field_${f.id}`} value={opt.trim()} required={f.required} disabled={deactivated} /> {opt.trim()}
                    </label>
                  ))}
                </div>
              )}
              {f.type === "CHECKBOX" && (
                <input type="checkbox" name={`field_${f.id}`} disabled={deactivated} />
              )}
              {f.type === "FILE" && (
                <input type="file" name={`field_${f.id}`} accept="image/*" required={f.required} disabled={deactivated} />
              )}
            </FieldRow>
          ))}
          <Actions>
            <SubmitBtn type="submit" disabled={deactivated}>Enviar</SubmitBtn>
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
  display: grid;
  place-items: center;
  background: var(--bg);
  padding: 16px;
`;

const Card = styled.section`
  width: min(720px, 96vw);
  border-radius: 16px;
  background: #fff;
  border: 1px solid var(--border);
  box-shadow: 0 12px 28px rgba(0,0,0,0.08);
  padding: 16px;
`;

const Title = styled.h1`
  margin: 0 0 12px;
`;

const Success = styled.p`
  color: #0a7b00;
`;

const Form = styled.form`
  display: grid;
  gap: 12px;
`;

const FieldRow = styled.div`
  display: grid;
  gap: 6px;
  label { font-weight: 600; }
  input, textarea, select { padding: 10px 12px; border: 1px solid var(--border); border-radius: 10px; }
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
`;

const SubmitBtn = styled.button`
  padding: 10px 14px;
  border-radius: 10px;
  border: 0;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(135deg, var(--primary-600), var(--primary-800));
`;