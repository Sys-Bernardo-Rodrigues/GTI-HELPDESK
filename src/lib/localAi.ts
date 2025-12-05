const LOCAL_AI_ENABLED = String(process.env.LOCAL_AI_ENABLED || "false").toLowerCase() === "true";
const LOCAL_AI_URL = process.env.LOCAL_AI_URL || "http://localhost:11434";
const LOCAL_AI_MODEL = process.env.LOCAL_AI_MODEL || "llama3";
const LOCAL_AI_TIMEOUT_MS = Number(process.env.LOCAL_AI_TIMEOUT_MS || 15000);

export type LocalAiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OllamaChatResponse = {
  message?: { role: string; content: string };
  response?: string;
  error?: string;
};

function getBaseUrl(): string {
  return LOCAL_AI_URL.replace(/\/$/, "");
}

export function isLocalAiEnabled(): boolean {
  return LOCAL_AI_ENABLED;
}

export async function callLocalAi(
  messages: LocalAiMessage[],
  options?: { temperature?: number }
): Promise<string | null> {
  if (!LOCAL_AI_ENABLED) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LOCAL_AI_TIMEOUT_MS);

  try {
    const res = await fetch(`${getBaseUrl()}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: LOCAL_AI_MODEL,
        stream: false,
        messages,
        options: {
          temperature: options?.temperature ?? 0.4,
        },
      }),
    });

    if (!res.ok) {
      console.error("[local-ai] Falha ao chamar modelo local:", res.status, res.statusText);
      return null;
    }

    const data = (await res.json()) as OllamaChatResponse;
    return data.message?.content ?? data.response ?? null;
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      console.error("[local-ai] Tempo limite atingido");
    } else {
      console.error("[local-ai] Erro ao chamar modelo local:", error);
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}






