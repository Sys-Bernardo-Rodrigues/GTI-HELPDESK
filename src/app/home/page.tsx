"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import StandardLayout from "@/components/StandardLayout";

const Content = styled.main`
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 16px;
`;

const Card = styled.section`
  grid-column: span 12;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: box-shadow 0.2s ease;

  @media (min-width: 960px) {
    grid-column: span 4;
  }

  &:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
`;

const CardTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const CardIcon = styled.div`
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

const Muted = styled.p`
  color: #64748b;
  margin: 0;
  font-size: 0.875rem;
`;

const CardLink = styled.a`
  color: var(--primary-600);
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: color 0.2s ease;

  &:hover {
    color: var(--primary-700);
    text-decoration: underline;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: #94a3b8;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const EmptyIcon = styled.div`
  margin-bottom: 12px;
  opacity: 0.5;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  svg {
    width: 48px;
    height: 48px;
    color: #94a3b8;
  }
`;

const EmptyText = styled.p`
  font-size: 0.875rem;
  margin: 0;
`;

const ItemsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ItemCard = styled.div`
  padding: 14px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  background: #f8fafc;
  transition: all 0.2s ease;
  cursor: pointer;

  &:hover {
    background: #f1f5f9;
    border-color: var(--primary-300);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
`;

const ItemHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
`;

const ItemTitle = styled.h3`
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0;
  color: #1e293b;
  flex: 1;
`;

const ItemBadge = styled.span<{ $color: string; $bg: string }>`
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${(p) => p.$color};
  background: ${(p) => p.$bg};
  white-space: nowrap;
`;

const ItemMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.75rem;
  color: #64748b;
`;

const ItemTime = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const ItemUser = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const ItemAvatar = styled.div`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 600;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const CountBadge = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 8px;
  border-radius: 12px;
  background: var(--primary-600);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  margin-left: 8px;
`;

const UrgentBadge = styled.span`
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 700;
  background: #fee2e2;
  color: #dc2626;
  margin-left: auto;
`;

const ChatContainer = styled.div`
  grid-column: span 12;
  height: 600px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);

  @media (max-width: 960px) {
    height: 500px;
  }
`;

const ChatHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--border);
  background: linear-gradient(135deg, var(--primary-600), var(--primary-800));
  color: #fff;
  border-radius: 16px 16px 0 0;
`;

const ChatHeaderTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  font-size: 1rem;
  
  svg {
    flex-shrink: 0;
    opacity: 0.9;
  }
`;

const ChatHeaderActions = styled.div`
  display: flex;
  gap: 8px;
`;

const ChatClearButton = styled.button`
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const ChatMessages = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #f8fafc;
`;

const ChatMessage = styled.div<{ $isUser: boolean }>`
  display: flex;
  justify-content: ${(p) => (p.$isUser ? "flex-end" : "flex-start")};
`;

const MessageBubble = styled.div<{ $isUser: boolean }>`
  max-width: 80%;
  padding: 12px 16px;
  border-radius: 16px;
  background: ${(p) => (p.$isUser ? "var(--primary-600)" : "#fff")};
  color: ${(p) => (p.$isUser ? "#fff" : "#1e293b")};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  font-size: 0.875rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-wrap: break-word;
`;

const ChatInputContainer = styled.div`
  padding: 16px;
  border-top: 1px solid var(--border);
  background: #fff;
  border-radius: 0 0 16px 16px;
`;

const ChatInputForm = styled.form`
  display: flex;
  gap: 8px;
`;

const ChatInput = styled.input`
  flex: 1;
  padding: 12px 16px;
  border: 1px solid var(--border);
  border-radius: 12px;
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.2s ease;

  &:focus {
    border-color: var(--primary-600);
  }
`;

const ChatSendButton = styled.button`
  padding: 12px 20px;
  border: none;
  background: var(--primary-600);
  color: #fff;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover:not(:disabled) {
    background: var(--primary-700);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ChatAudioButton = styled.button<{ $recording: boolean }>`
  width: 40px;
  height: 40px;
  border: none;
  background: ${(p) => (p.$recording ? "#ef4444" : "var(--primary-600)")};
  color: #fff;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease, transform 0.2s ease;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    background: ${(p) => (p.$recording ? "#dc2626" : "var(--primary-700)")};
    transform: scale(1.05);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  ${(p) =>
    p.$recording &&
    `
    animation: pulse 1.5s ease-in-out infinite;
    
    @keyframes pulse {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.1);
      }
    }
  `}
`;

const RecordingTime = styled.span`
  font-size: 0.75rem;
  color: #ef4444;
  font-weight: 600;
  margin-left: 8px;
`;


const LoadingDots = styled.div`
  display: flex;
  gap: 4px;
  padding: 12px 16px;

  span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #94a3b8;
    animation: bounce 1.4s infinite ease-in-out both;

    &:nth-child(1) {
      animation-delay: -0.32s;
    }

    &:nth-child(2) {
      animation-delay: -0.16s;
    }

    &:nth-child(3) {
      animation-delay: 0s;
    }
  }

  @keyframes bounce {
    0%, 80%, 100% {
      transform: scale(0);
    }
    40% {
      transform: scale(1);
    }
  }
`;

type TicketItem = {
  id: number;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  scheduledAt?: string | null;
  userId: number;
  requester: { id: number; name: string | null; email: string | null; avatarUrl: string | null } | null;
  assignedTo: { id: number; name: string | null; email: string | null; avatarUrl: string | null } | null;
};

type EventItem = {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  isAllDay: boolean;
  color: string;
  userAvatar: string | null;
  userName: string | null;
};

const STATUS_DETAILS: Record<string, { label: string; color: string; background: string }> = {
  OPEN: { label: "Novo", color: "#1d4ed8", background: "rgba(37, 99, 235, 0.12)" },
  IN_PROGRESS: { label: "Em andamento", color: "#b45309", background: "rgba(234, 179, 8, 0.14)" },
  OBSERVATION: { label: "Em observação", color: "#0369a1", background: "rgba(3, 105, 161, 0.16)" },
  RESOLVED: { label: "Resolvido", color: "#047857", background: "rgba(16, 185, 129, 0.14)" },
  CLOSED: { label: "Encerrado", color: "#334155", background: "rgba(148, 163, 184, 0.16)" },
};

const OVERDUE_THRESHOLD_MS = 48 * 60 * 60 * 1000; // 48 horas

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: number; email: string; name: string | null } | null>(null);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [chatInput, setChatInput] = useState<string>("");
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const chatMessagesEndRef = useRef<HTMLDivElement | null>(null);
  const chatInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const transcribedTextRef = useRef<string>("");

  // Buscar usuário da sessão
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/session");
        if (res.ok) {
          const json = await res.json();
          setUser(json.user);
        } else {
          console.error("Erro ao carregar sessão:", res.status);
        }
      } catch (error) {
        console.error("Erro ao carregar sessão:", error);
      }
    })();
  }, []);

  // Recarregar dados quando a página voltar ao foco
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "visible" && user?.id) {
        // Recarregar dados quando a página voltar ao foco
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
        
        Promise.all([
          fetch("/api/tickets").then((res) => res.ok ? res.json() : null),
          fetch(`/api/events?startDate=${startOfDay.toISOString()}&endDate=${endOfDay.toISOString()}&onlyMine=true`).then((res) => res.ok ? res.json() : null),
        ]).then(([ticketsData, eventsData]) => {
          if (ticketsData?.items) {
            setTickets(ticketsData.items);
          }
          if (eventsData?.items) {
            const eventsList = eventsData.items || [];
            const scheduledTickets = (ticketsData?.items || []).filter((ticket: TicketItem) => {
              if (!ticket.scheduledAt) return false;
              const scheduledDate = new Date(ticket.scheduledAt);
              const isToday = scheduledDate >= startOfDay && scheduledDate <= endOfDay;
              const isMine = ticket.userId === user.id || ticket.assignedTo?.id === user.id;
              return isToday && isMine;
            });
            const ticketEvents = scheduledTickets.map((ticket: TicketItem) => ({
              id: ticket.id + 1000000,
              title: ticket.title,
              startDate: ticket.scheduledAt!,
              endDate: ticket.scheduledAt!,
              isAllDay: false,
              color: "#3b82f6",
              userAvatar: ticket.assignedTo?.avatarUrl || ticket.requester?.avatarUrl || null,
              userName: ticket.assignedTo?.name || ticket.requester?.name || null,
              type: "ticket",
            }));
            setEvents([...eventsList, ...ticketEvents]);
          }
        }).catch((error) => {
          console.error("Erro ao recarregar dados:", error);
        });
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [user?.id]);

  // Buscar tickets e eventos
  useEffect(() => {
    if (!user?.id) return;
    async function loadData() {
      setLoading(true);
      try {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
        
        // Buscar tickets e eventos em paralelo
        const [ticketsRes, eventsRes] = await Promise.all([
          fetch("/api/tickets"),
          fetch(`/api/events?startDate=${startOfDay.toISOString()}&endDate=${endOfDay.toISOString()}&onlyMine=true`),
        ]);

        let ticketsList: TicketItem[] = [];
        if (ticketsRes.ok) {
          const ticketsData = await ticketsRes.json();
          ticketsList = ticketsData.items || [];
          setTickets(ticketsList);
        }

        if (eventsRes.ok) {
          const eventsData = await eventsRes.json();
          const eventsList = eventsData.items || [];
          
          // Filtrar tickets agendados para hoje do usuário logado
          const scheduledTickets = ticketsList.filter((ticket) => {
            if (!ticket.scheduledAt) return false;
            const scheduledDate = new Date(ticket.scheduledAt);
            const isToday = scheduledDate >= startOfDay && scheduledDate <= endOfDay;
            // Mostrar tickets criados pelo usuário ou atribuídos a ele
            const isMine = ticket.userId === user.id || ticket.assignedTo?.id === user.id;
            return isToday && isMine;
          });
          
          // Converter tickets agendados para formato de evento
          const ticketEvents = scheduledTickets.map((ticket) => ({
            id: ticket.id + 1000000,
            title: ticket.title,
            startDate: ticket.scheduledAt!,
            endDate: ticket.scheduledAt!,
            isAllDay: false,
            color: "#3b82f6",
            userAvatar: ticket.assignedTo?.avatarUrl || ticket.requester?.avatarUrl || null,
            userName: ticket.assignedTo?.name || ticket.requester?.name || null,
            type: "ticket",
          }));
          
          setEvents([...eventsList, ...ticketEvents]);
        } else {
          console.error("Erro ao carregar eventos:", eventsRes.status, await eventsRes.text());
        }
        
        if (!ticketsRes.ok) {
          console.error("Erro ao carregar tickets:", ticketsRes.status, await ticketsRes.text());
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user?.id]);

  // Filtrar tickets em atraso
  const overdueTickets = useMemo(() => {
    const now = Date.now();
    return tickets.filter((ticket) => {
      if (ticket.status === "CLOSED" || ticket.status === "RESOLVED") return false;
      const updatedAt = new Date(ticket.updatedAt).getTime();
      const age = now - updatedAt;
      return age > OVERDUE_THRESHOLD_MS;
    });
  }, [tickets]);

  // Filtrar eventos do dia atual
  const todayEvents = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    return events.filter((event) => {
      const eventDate = new Date(event.startDate).toISOString().split("T")[0];
      return eventDate === todayStr;
    });
  }, [events]);

  // Filtrar tickets novos (aguardando atendimento)
  const newTickets = useMemo(() => {
    return tickets.filter((ticket) => ticket.status === "OPEN");
  }, [tickets]);

  function formatTime(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  }

  function formatDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    } catch {
      return "";
    }
  }

  function getHoursAgo(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      const now = Date.now();
      const diffMs = now - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours < 1) return "Menos de 1h";
      if (diffHours < 24) return `${diffHours}h atrás`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d atrás`;
    } catch {
      return "";
    }
  }

  function resolveAvatarUrl(u?: string | null): string {
    if (!u) return "";
    const val = String(u);
    if (val.startsWith("data:")) return val;
    if (/^https?:\/\//i.test(val)) return val;
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      if (val.startsWith("/")) return `${origin}${val}`;
      return `${origin}/${val}`;
    }
    return val;
  }

  // Scroll para o final das mensagens do chat
  useEffect(() => {
    if (chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  // Focar no input quando o chat abrir
  useEffect(() => {
    if (chatInputRef.current) {
      setTimeout(() => chatInputRef.current?.focus(), 100);
    }
  }, []);
  
  // Cleanup: parar gravação se o componente desmontar
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current) {
        try {
          if (mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
          }
        } catch (e) {
          // Ignorar erros ao parar
        }
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignorar erros ao parar
        }
      }
    };
  }, []);

  // Limpar mensagens do chat
  function handleClearChat() {
    setChatMessages([]);
    setChatInput("");
  }

  // Iniciar gravação de áudio
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await processAudio(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Iniciar contador de tempo
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
      
      // Limpar texto transcrito anterior
      transcribedTextRef.current = "";
      setChatInput("");
      
      // Iniciar transcrição em tempo real usando Web Speech API (opcional, para feedback visual)
      if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = "pt-BR";
        recognition.continuous = true;
        recognition.interimResults = true;
        
        recognition.onresult = (event: any) => {
          let interimTranscript = "";
          let finalTranscript = "";
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + " ";
            } else {
              interimTranscript += transcript;
            }
          }
          
          if (finalTranscript) {
            transcribedTextRef.current += finalTranscript;
          }
          
          const displayText = transcribedTextRef.current.trim() + (interimTranscript ? " " + interimTranscript : "");
          setChatInput(displayText || "🎤 Gravando...");
        };
        
        recognition.onerror = () => {
          // Ignorar erros silenciosamente
        };
        
        recognition.onend = () => {
          if (mediaRecorderRef.current?.state === "recording") {
            try {
              recognition.start();
            } catch (e) {
              // Ignorar erros
            }
          }
        };
        
        try {
          recognition.start();
          recognitionRef.current = recognition;
        } catch (error) {
          // Ignorar erros ao iniciar
        }
      }
    } catch (error) {
      console.error("Erro ao iniciar gravação:", error);
      alert("Não foi possível acessar o microfone. Verifique as permissões.");
    }
  }

  // Parar gravação de áudio
  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      
      // Parar reconhecimento se estiver ativo (não é mais necessário, mas mantido para limpeza)
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
          recognitionRef.current = null;
        } catch (e) {
          // Ignorar erros
        }
      }
    }
  }

  // Processar áudio gravado - enviar diretamente para o Dobby entender
  async function processAudio(audioBlob: Blob) {
    try {
      setChatLoading(true);
      
      // Aguardar um pouco para garantir que a transcrição finalizou (se disponível)
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      // Pegar texto transcrito se disponível
      const transcribedText = transcribedTextRef.current.trim() || chatInput.trim().replace(/🎤.*$/i, "").trim();
      
      // Mostrar mensagem de áudio enviado
      const userMessage = transcribedText 
        ? `🎤 [Áudio: "${transcribedText}"]`
        : "🎤 [Áudio enviado]";
      setChatMessages((prev) => [...prev, { role: "user", content: userMessage }]);
      
      // Enviar áudio para a API do Dobby processar
      const formData = new FormData();
      formData.append("audio", audioBlob, "audio.webm");
      if (transcribedText) {
        formData.append("transcript", transcribedText);
      }
      
      const response = await fetch("/api/chat/audio", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Erro ao processar áudio");
      }
      
      const data = await response.json();
      
      // Adicionar resposta do Dobby
      setChatMessages((prev) => [...prev, { role: "assistant", content: data.message }]);
      
      // Limpar input e referências
      setChatInput("");
      transcribedTextRef.current = "";
    } catch (error) {
      console.error("Erro ao processar áudio:", error);
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Desculpe, ocorreu um erro ao processar o áudio. Tente novamente ou digite sua mensagem." },
      ]);
    } finally {
      setChatLoading(false);
      transcribedTextRef.current = "";
    }
  }

  // Função auxiliar para enviar mensagem
  async function sendChatMessage(message: string) {
    if (!message.trim() || chatLoading) return;
    
    setChatMessages((prev) => [...prev, { role: "user", content: message }]);
    setChatLoading(true);
    
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      
      if (!response.ok) {
        throw new Error("Erro ao enviar mensagem");
      }
      
      const data = await response.json();
      setChatMessages((prev) => [...prev, { role: "assistant", content: data.message }]);
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente." },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  // Enviar mensagem no chat
  async function handleChatSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setChatLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      if (res.ok) {
        const data = await res.json();
        setChatMessages((prev) => [...prev, { role: "assistant", content: data.message }]);
      } else {
        const error = await res.json();
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Erro: ${error.error || "Não foi possível processar sua mensagem"}` },
        ]);
      }
    } catch (error) {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Erro ao conectar com o assistente. Tente novamente." },
      ]);
    } finally {
      setChatLoading(false);
    }
  }



  return (
    <StandardLayout>
      <Content>
          <ChatContainer>
            <ChatHeader>
              <ChatHeaderTitle>
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0,0,256,256">
                  <g fill="none" fillRule="evenodd" stroke="none" strokeWidth="1" strokeLinecap="butt" strokeLinejoin="miter" strokeMiterlimit="10" strokeDasharray="" strokeDashoffset="0" fontFamily="none" fontWeight="none" fontSize="none" textAnchor="none" style={{mixBlendMode: "normal"}}>
                    <g transform="scale(5.33333,5.33333)">
                      <path d="M0,16.998v2.001h48.001v-2.001z" fill="currentColor"></path>
                      <path d="M9,41.998v2.001h30.001v-2.001z" fill="currentColor"></path>
                      <path d="M8.996,43.997c0,-3.939 3.112,-8.493 7.384,-11.123l-2.212,-3.32c-0.525,-0.787 -0.967,-1.647 -1.337,-2.556h-0.829c-2.275,0 -3.709,-1.256 -4.749,-2.291c-1.097,-1.092 -1.645,-1.709 -2.251,-1.709c-0.704,0 -1.501,0.529 -2.163,1.545c-0.421,0.648 -1.391,0.592 -1.733,-0.1c-0.923,-1.859 -1.104,-3.425 -1.104,-5.445c0,-6.032 7.508,-9.3 13.9,-9.899c2.559,-2.445 6.441,-4.101 10.1,-4.101c3.632,0 7.511,1.66 10.076,4.101c6.372,0.593 13.919,3.844 13.919,9.899c0,2.02 -0.183,3.587 -1.105,5.445c-0.343,0.692 -1.312,0.748 -1.733,0.1c-0.661,-1.016 -1.459,-1.545 -2.161,-1.545c-0.245,0 -0.517,0.101 -0.904,0.409c-0.415,0.328 -0.796,0.749 -1.348,1.3c-1.04,1.035 -2.475,2.291 -4.748,2.291h-0.827c-0.371,0.909 -0.812,1.769 -1.336,2.556l-2.216,3.324c4.268,2.632 7.384,7.188 7.384,11.119c0,1.656 -1.344,3.001 -3,3.001h-24.007c-1.657,0 -3,-1.345 -3,-3.001z" fill="currentColor"></path>
                      <path d="M36.001,43.998h-24.005c-1.104,0 -2,-0.897 -2,-2.001c0,-4.645 5.019,-10.581 11,-12h6.005c5.981,1.419 11,7.355 11,12c0,1.104 -0.896,2.001 -2,2.001z" fill="currentColor"></path>
                      <path d="M8.996,41.997c0,-5.199 5.42,-11.467 11.768,-12.972c0.076,-0.019 0.153,-0.028 0.232,-0.028h6.005c0.077,0 0.155,0.009 0.231,0.028c6.341,1.504 11.769,7.783 11.769,12.972c0,1.656 -1.344,3.001 -3,3.001h-24.005c-1.657,0 -3,-1.345 -3,-3.001zM37.001,41.997c0,-3.835 -4.059,-9 -9.192,-10.728l-0.948,-0.272h-5.728l-0.948,0.272c-5.139,1.728 -9.189,6.885 -9.189,10.728c0,0.553 0.448,1.001 1,1.001h24.005c0.551,0 1,-0.448 1,-1.001z" fill="currentColor"></path>
                      <path d="M14.001,42.989v-9.551c0,-0.551 0.448,-1 1,-1c0.551,0 1,0.449 1,1v9.551c0,0.552 -0.449,1 -1,1c-0.552,0 -1,-0.448 -1,-1z" fill="currentColor"></path>
                      <path d="M25.473,37.574c-2.632,-1.109 -4.427,-2.951 -6.247,-5.683c-0.305,-0.459 -0.181,-1.08 0.279,-1.387c0.459,-0.305 1.08,-0.181 1.387,0.279c1.705,2.56 3.228,4.051 5.359,4.948c2.181,0.92 5.113,1.267 9.751,1.267c0.551,0 1,0.449 1,1c0,0.552 -0.449,1 -1,1c-4.666,0 -7.95,-0.336 -10.529,-1.424z" fill="currentColor"></path>
                      <path d="M16.001,7.998c-6.491,0 -15,3.171 -15,9c0,1.939 0.173,3.333 1,5c0.739,-1.136 1.8,-2 3,-2c2.259,0 3.293,4 7,4h5z" fill="currentColor"></path>
                      <path d="M1.001,21.002c0,-2.679 1.476,-4.956 3.671,-6.527c2.191,-1.568 5.151,-2.481 8.329,-2.481c0.551,0 1,0.449 1,1c0,0.552 -0.449,1 -1,1c-2.815,0 -5.355,0.812 -7.165,2.108c-1.808,1.293 -2.835,3.02 -2.835,4.9c0,0.552 -0.449,1 -1,1c-0.552,0 -1,-0.448 -1,-1z" fill="currentColor"></path>
                      <path d="M7.252,22.707c-1.097,-1.092 -1.645,-1.709 -2.251,-1.709c-0.704,0 -1.501,0.529 -2.163,1.545c-0.421,0.648 -1.391,0.592 -1.733,-0.1c-0.923,-1.859 -1.104,-3.425 -1.104,-5.445c0,-6.711 9.291,-10 16,-10c0.527,0 0.964,0.412 0.997,0.939l1,16c0.036,0.575 -0.421,1.061 -0.997,1.061h-5c-2.274,0 -3.709,-1.256 -4.749,-2.291zM15.936,22.998l-0.873,-13.971l-0.26,0.007c-6.047,0.356 -12.802,3.349 -12.802,7.964c0,0.929 0.04,1.7 0.173,2.423l0.169,0.66l0.407,-0.325c0.645,-0.457 1.401,-0.757 2.251,-0.757c2.924,0 3.719,4 7,4h3.935z" fill="currentColor"></path>
                      <path d="M31.996,7.998c6.491,0 15,3.171 15,9c0,1.939 -0.173,3.333 -1,5c-0.739,-1.136 -1.8,-2 -3,-2c-2.259,0 -3.293,4 -7,4h-5z" fill="currentColor"></path>
                      <path d="M44.996,21.002c0,-1.88 -1.028,-3.607 -2.836,-4.9c-1.811,-1.296 -4.351,-2.108 -7.164,-2.108c-0.552,0 -1,-0.448 -1,-1c0,-0.551 0.448,-1 1,-1c3.177,0 6.137,0.913 8.328,2.481c2.195,1.571 3.672,3.848 3.672,6.527c0,0.552 -0.449,1 -1,1c-0.552,0 -1,-0.448 -1,-1z" fill="currentColor"></path>
                      <path d="M29.997,23.937l1,-16c0.033,-0.527 0.471,-0.939 0.999,-0.939c6.672,0 16,3.267 16,10c0,2.02 -0.183,3.587 -1.105,5.445c-0.343,0.692 -1.312,0.748 -1.733,0.1c-0.661,-1.016 -1.459,-1.545 -2.161,-1.545c-0.245,0 -0.517,0.101 -0.904,0.409c-0.415,0.328 -0.796,0.749 -1.348,1.3c-1.04,1.035 -2.475,2.291 -4.748,2.291h-5c-0.578,0 -1.036,-0.487 -1,-1.061zM42.996,18.998c0.848,0 1.603,0.3 2.248,0.757l0.407,0.325l0.171,-0.66c0.133,-0.723 0.175,-1.493 0.175,-2.423c0,-4.633 -6.787,-7.609 -12.809,-7.964l-0.255,-0.008l-0.873,13.973h3.936c3.231,0 4.137,-4 7,-4z" fill="currentColor"></path>
                      <path d="M24.001,35.998c-1.953,0 -3.923,-1.384 -5,-3l-4,-6c-2.467,-3.7 -3,-9.228 -3,-14c0,-4.497 6.155,-9 12,-9c5.845,0 12,4.503 12,9c0,4.772 -0.533,10.3 -3,14l-4,6c-1.077,1.616 -3.046,3 -5,3z" fill="currentColor"></path>
                      <path d="M18.168,33.554l-4,-6c-2.648,-3.972 -3.167,-9.776 -3.167,-14.556c0,-5.275 6.821,-10 13,-10c6.147,0 13,4.752 13,10c0,4.78 -0.52,10.584 -3.168,14.556l-4,6c-1.201,1.8 -3.445,3.444 -5.832,3.444c-2.388,0 -4.632,-1.644 -5.833,-3.444zM28.168,32.443l4,-6c2.285,-3.428 2.833,-8.68 2.833,-13.445c0,-3.719 -5.488,-8 -11,-8c-5.543,0 -11,4.255 -11,8c0,4.765 0.547,10.017 2.832,13.445l4,6c0.953,1.432 2.648,2.555 4.168,2.555c1.519,0 3.214,-1.123 4.167,-2.555z" fill="currentColor"></path>
                      <path d="M13.86,18.607c-1.021,-0.776 -1.86,-1.915 -1.861,-3.109c0.001,-1.197 0.836,-2.328 1.861,-3.108c1.064,-0.808 2.523,-1.392 4.141,-1.392c1.617,0 3.076,0.584 4.14,1.392c1.021,0.776 1.86,1.915 1.861,3.108c-0.001,1.199 -0.836,2.329 -1.861,3.109c-1.064,0.808 -2.523,1.391 -4.14,1.391c-1.618,0 -3.077,-0.583 -4.141,-1.391zM20.931,17.015c0.789,-0.599 1.071,-1.211 1.071,-1.517c0,-0.3 -0.287,-0.92 -1.071,-1.516c-0.747,-0.567 -1.788,-0.984 -2.929,-0.984c-1.143,0 -2.184,0.417 -2.931,0.984c-0.79,0.599 -1.071,1.211 -1.071,1.516c0,0.301 0.287,0.921 1.071,1.517c0.747,0.567 1.788,0.983 2.931,0.983c1.141,0 2.182,-0.416 2.929,-0.983z" fill="currentColor"></path>
                      <path d="M25.857,18.607c-1.021,-0.776 -1.86,-1.915 -1.861,-3.109c0.001,-1.197 0.836,-2.328 1.861,-3.108c1.064,-0.808 2.523,-1.392 4.141,-1.392c1.617,0 3.076,0.584 4.14,1.392c1.021,0.776 1.86,1.915 1.861,3.108c-0.001,1.199 -0.836,2.329 -1.861,3.109c-1.064,0.808 -2.523,1.391 -4.14,1.391c-1.618,0 -3.077,-0.583 -4.141,-1.391zM32.928,17.015c0.789,-0.599 1.071,-1.211 1.071,-1.517c0,-0.3 -0.287,-0.92 -1.071,-1.516c-0.747,-0.567 -1.788,-0.984 -2.929,-0.984c-1.143,0 -2.184,0.417 -2.931,0.984c-0.789,0.599 -1.071,1.211 -1.071,1.516c0,0.301 0.287,0.921 1.071,1.517c0.747,0.567 1.788,0.983 2.931,0.983c1.141,0 2.182,-0.416 2.929,-0.983z" fill="currentColor"></path>
                      <path d="M18.001,12.997c1.104,0 2.001,0.897 2.001,2.001c0,1.104 -0.897,2.001 -2.001,2.001c-1.104,0 -2.001,-0.897 -2.001,-2.001c0,-1.104 0.897,-2.001 2.001,-2.001z" fill="currentColor"></path>
                      <path d="M30,12.998c1.104,0 2.001,0.897 2.001,2.001c0,1.104 -0.897,2.002 -2.001,2.002c-1.104,0 -2.001,-0.897 -2.001,-2.001c0,-1.104 0.897,-2.002 2.001,-2.002z" fill="currentColor"></path>
                      <path d="M21.175,27.998h-0.173c-1.656,0 -3,-1.341 -3,-2.999c0,-1.552 1.18,-2.831 2.693,-2.985l0.183,-0.009l0.053,-0.228c0.088,-0.352 0.184,-0.711 0.289,-1.063c0.157,-0.529 0.715,-0.831 1.243,-0.673c0.529,0.157 0.831,0.715 0.673,1.243c-0.191,0.64 -0.352,1.312 -0.477,1.917c-0.096,0.467 -0.507,0.8 -0.981,0.799l-0.676,-0.001c-0.551,0 -1,0.451 -1,1.001c0,0.552 0.447,0.999 1,0.999h1c0.551,0 1,0.449 1,1c0,0.553 0.449,1.003 1.001,1.003c0.548,0 0.999,-0.448 0.999,-1.003c0,-0.552 0.449,-1.001 1.003,-0.999l0.997,0.001c0.549,0 1,-0.449 1,-1.001c0,-0.551 -0.451,-1.001 -1.001,-1.001l-0.681,0.001c-0.475,0.001 -0.884,-0.332 -0.981,-0.796c-0.125,-0.608 -0.288,-1.28 -0.479,-1.92c-0.157,-0.528 0.144,-1.085 0.673,-1.243c0.528,-0.157 1.085,0.144 1.243,0.673c0.104,0.352 0.2,0.711 0.288,1.061l0.053,0.229l0.189,0.009c1.513,0.155 2.696,1.433 2.696,2.985c0,1.657 -1.345,3.001 -3.004,3.001h-0.172l-0.06,0.165c-0.455,1.077 -1.519,1.835 -2.763,1.835c-1.244,0 -2.311,-0.757 -2.767,-1.835z" fill="currentColor"></path>
                      <path d="M21.001,31.998c0,-0.551 0.448,-1 1,-1h4c0.551,0 1,0.449 1,1c0,0.552 -0.449,1 -1,1h-4c-0.552,0 -1,-0.448 -1,-1z" fill="currentColor"></path>
                    </g>
                  </g>
                </svg>
                <span>Dobby</span>
              </ChatHeaderTitle>
              <ChatHeaderActions>
                <ChatClearButton onClick={handleClearChat} aria-label="Limpar conversa" title="Limpar conversa">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </ChatClearButton>
              </ChatHeaderActions>
            </ChatHeader>
            <ChatMessages>
              {chatMessages.length === 0 && (
                <ChatMessage $isUser={false}>
                  <MessageBubble $isUser={false}>
                    Olá! Sou o Dobby, assistente virtual do sistema. Posso ajudá-lo a encontrar informações sobre:
                    {"\n\n"}
                    📚 Base de conhecimento (descriptografada)
                    {"\n"}
                    📁 Arquivos e downloads
                    {"\n"}
                    🎫 Tickets e chamados
                    {"\n"}
                    📅 Agenda e compromissos
                    {"\n"}
                    🔐 Senhas e credenciais (descriptografadas)
                    {"\n"}
                    📝 Histórico e atualizações
                    {"\n"}
                    📊 Estatísticas do sistema
                    {"\n"}
                    📈 Relatórios detalhados
                    {"\n\n"}
                    Como posso ajudá-lo hoje?
                  </MessageBubble>
                </ChatMessage>
              )}
              {chatMessages.map((msg, idx) => (
                <ChatMessage key={idx} $isUser={msg.role === "user"}>
                  <MessageBubble $isUser={msg.role === "user"}>{msg.content}</MessageBubble>
                </ChatMessage>
              ))}
              {chatLoading && (
                <ChatMessage $isUser={false}>
                  <LoadingDots>
                    <span></span>
                    <span></span>
                    <span></span>
                  </LoadingDots>
                </ChatMessage>
              )}
              <div ref={chatMessagesEndRef} />
            </ChatMessages>
            <ChatInputContainer>
              <ChatInputForm onSubmit={handleChatSubmit}>
                <ChatInput
                  ref={chatInputRef}
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={isRecording ? "Gravando..." : "Digite sua pergunta ou grave um áudio..."}
                  disabled={chatLoading || isRecording}
                />
                {isRecording ? (
                  <>
                    <ChatAudioButton
                      type="button"
                      $recording={true}
                      onClick={stopRecording}
                      aria-label="Parar gravação"
                      title="Parar gravação"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="6" width="12" height="12" rx="2" />
                      </svg>
                    </ChatAudioButton>
                    <RecordingTime>{Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, "0")}</RecordingTime>
                  </>
                ) : (
                  <>
                    <ChatAudioButton
                      type="button"
                      $recording={false}
                      onClick={startRecording}
                      aria-label="Gravar áudio"
                      title="Gravar áudio"
                      disabled={chatLoading}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                      </svg>
                    </ChatAudioButton>
                    <ChatSendButton type="submit" disabled={chatLoading || !chatInput.trim()}>
                      Enviar
                    </ChatSendButton>
                  </>
                )}
              </ChatInputForm>
            </ChatInputContainer>
          </ChatContainer>

          <Card>
            <CardHeader>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <CardIcon>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 0 0-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z"/>
                  </svg>
                </CardIcon>
                <div>
                  <CardTitle>
                    Tickets Novos
                    {newTickets.length > 0 && <CountBadge>{newTickets.length}</CountBadge>}
                  </CardTitle>
                  <Muted>Aguardando atendimento</Muted>
                </div>
              </div>
              <CardLink href="/tickets">Ver todos →</CardLink>
            </CardHeader>
            {loading ? (
              <EmptyState>
                <EmptyText>Carregando...</EmptyText>
              </EmptyState>
            ) : newTickets.length === 0 ? (
              <EmptyState>
                <EmptyIcon>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                </EmptyIcon>
                <EmptyText>Nenhum ticket novo aguardando atendimento</EmptyText>
              </EmptyState>
            ) : (
              <ItemsList>
                {newTickets.slice(0, 5).map((ticket) => {
                  const statusInfo = STATUS_DETAILS[ticket.status] || STATUS_DETAILS.OPEN;
                  const displayUser = ticket.assignedTo || ticket.requester;
                  return (
                    <ItemCard
                      key={ticket.id}
                      onClick={() => router.push("/tickets")}
                    >
                      <ItemHeader>
                        <ItemTitle>{ticket.title}</ItemTitle>
                        <ItemBadge $color={statusInfo.color} $bg={statusInfo.background}>
                          {statusInfo.label}
                        </ItemBadge>
                      </ItemHeader>
                      <ItemMeta>
                        <ItemTime>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                          </svg>
                          {getHoursAgo(ticket.createdAt)}
                        </ItemTime>
                        {displayUser && (
                          <ItemUser>
                            <ItemAvatar>
                              {displayUser.avatarUrl ? (
                                <img src={resolveAvatarUrl(displayUser.avatarUrl)} alt={displayUser.name || ""} />
                              ) : (
                                (displayUser.name?.[0] || displayUser.email?.[0] || "U").toUpperCase()
                              )}
                            </ItemAvatar>
                            <span>{displayUser.name || displayUser.email || "Usuário"}</span>
                          </ItemUser>
                        )}
                      </ItemMeta>
                    </ItemCard>
                  );
                })}
              </ItemsList>
            )}
          </Card>

          <Card>
            <CardHeader>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <CardIcon>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                  </svg>
                </CardIcon>
                <div>
                  <CardTitle>
                    Tickets em Atraso
                    {overdueTickets.length > 0 && <CountBadge>{overdueTickets.length}</CountBadge>}
                  </CardTitle>
                  <Muted>Tickets sem atualização há mais de 48 horas</Muted>
                </div>
              </div>
              <CardLink href="/tickets">Ver todos →</CardLink>
            </CardHeader>
            {loading ? (
              <EmptyState>
                <EmptyText>Carregando...</EmptyText>
              </EmptyState>
            ) : overdueTickets.length === 0 ? (
              <EmptyState>
                <EmptyIcon>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                </EmptyIcon>
                <EmptyText>Nenhum ticket em atraso</EmptyText>
              </EmptyState>
            ) : (
              <ItemsList>
                {overdueTickets.slice(0, 5).map((ticket) => {
                  const statusInfo = STATUS_DETAILS[ticket.status] || STATUS_DETAILS.OPEN;
                  const displayUser = ticket.assignedTo || ticket.requester;
                  return (
                    <ItemCard
                      key={ticket.id}
                      onClick={() => router.push("/tickets")}
                    >
                      <ItemHeader>
                        <ItemTitle>{ticket.title}</ItemTitle>
                        <ItemBadge $color={statusInfo.color} $bg={statusInfo.background}>
                          {statusInfo.label}
                        </ItemBadge>
                        <UrgentBadge>URGENTE</UrgentBadge>
                      </ItemHeader>
                      <ItemMeta>
                        <ItemTime>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                          </svg>
                          {getHoursAgo(ticket.updatedAt)}
                        </ItemTime>
                        {displayUser && (
                          <ItemUser>
                            <ItemAvatar>
                              {displayUser.avatarUrl ? (
                                <img src={resolveAvatarUrl(displayUser.avatarUrl)} alt={displayUser.name || ""} />
                              ) : (
                                (displayUser.name?.[0] || displayUser.email?.[0] || "U").toUpperCase()
                              )}
                            </ItemAvatar>
                            <span>{displayUser.name || displayUser.email || "Usuário"}</span>
                          </ItemUser>
                        )}
                      </ItemMeta>
                    </ItemCard>
                  );
                })}
              </ItemsList>
            )}
          </Card>

          <Card>
            <CardHeader>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <CardIcon>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM5 7V6h14v1H5zm7 6H7v-2h5v2z"/>
                  </svg>
                </CardIcon>
                <div>
                  <CardTitle>
                    Agenda de Hoje
                    {todayEvents.length > 0 && <CountBadge>{todayEvents.length}</CountBadge>}
                  </CardTitle>
                  <Muted>Compromissos agendados para hoje</Muted>
                </div>
              </div>
              <CardLink href="/agenda">Ver agenda →</CardLink>
            </CardHeader>
            {loading ? (
              <EmptyState>
                <EmptyText>Carregando...</EmptyText>
              </EmptyState>
            ) : todayEvents.length === 0 ? (
              <EmptyState>
                <EmptyIcon>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM5 7V6h14v1H5zm7 6H7v-2h5v2z"/>
                  </svg>
                </EmptyIcon>
                <EmptyText>Nenhum compromisso agendado para hoje</EmptyText>
              </EmptyState>
            ) : (
              <ItemsList>
                {todayEvents.slice(0, 5).map((event) => (
                  <ItemCard
                    key={event.id}
                    onClick={() => router.push("/agenda")}
                  >
                    <ItemHeader>
                      <ItemTitle>{event.title}</ItemTitle>
                      <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: event.color, flexShrink: 0 }} />
                    </ItemHeader>
                    <ItemMeta>
                      <ItemTime>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        {event.isAllDay ? "Dia inteiro" : `${formatTime(event.startDate)} - ${formatTime(event.endDate)}`}
                      </ItemTime>
                      {event.userName && (
                        <ItemUser>
                          <ItemAvatar>
                            {event.userAvatar ? (
                              <img src={resolveAvatarUrl(event.userAvatar)} alt={event.userName} />
                            ) : (
                              event.userName[0].toUpperCase()
                            )}
                          </ItemAvatar>
                          <span>{event.userName}</span>
                        </ItemUser>
                      )}
                    </ItemMeta>
                  </ItemCard>
                ))}
              </ItemsList>
            )}
          </Card>
      </Content>
    </StandardLayout>
  );
}