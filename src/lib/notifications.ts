/**
 * Sistema de notificações do sistema operacional
 * Usa Web Notification API para notificar o usuário em Windows, Linux e Mac
 */

type NotificationType = 
  | "new-ticket" 
  | "ticket-assigned" 
  | "ticket-overdue" 
  | "ticket-scheduled";

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
}

class NotificationManager {
  private permission: NotificationPermission = "default";
  private enabled: boolean = true;
  private checkInterval: number | null = null;
  private lastCheckedTickets: Set<number> = new Set();
  private scheduledTickets: Map<number, number> = new Map(); // ticketId -> scheduledTime

  constructor() {
    if (typeof window !== "undefined") {
      this.permission = Notification.permission;
      
      // Carregar preferências do localStorage
      try {
        const savedEnabled = localStorage.getItem("notifications_enabled");
        if (savedEnabled !== null) {
          this.enabled = savedEnabled === "true";
        }
      } catch (e) {
        // Ignorar erros de localStorage
      }

      // Solicitar permissão automaticamente quando o usuário interagir com a página
      if (this.permission === "default") {
        // Aguardar interação do usuário antes de solicitar permissão
        document.addEventListener("click", this.requestPermissionOnce.bind(this), { once: true });
      }
    }
  }

  private requestPermissionOnce() {
    if (this.permission === "default" && typeof Notification !== "undefined") {
      Notification.requestPermission().then((permission) => {
        this.permission = permission;
      });
    }
  }

  /**
   * Solicita permissão para notificações
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === "undefined" || typeof Notification === "undefined") {
      return "denied";
    }

    if (this.permission === "default") {
      this.permission = await Notification.requestPermission();
    }

    return this.permission;
  }

  /**
   * Verifica se as notificações estão disponíveis e permitidas
   */
  isAvailable(): boolean {
    if (typeof window === "undefined" || typeof Notification === "undefined") {
      return false;
    }
    return this.permission === "granted" && this.enabled;
  }

  /**
   * Habilita ou desabilita as notificações
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("notifications_enabled", String(enabled));
      } catch (e) {
        // Ignorar erros de localStorage
      }
    }
  }

  /**
   * Retorna se as notificações estão habilitadas
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Retorna o status da permissão
   */
  getPermission(): NotificationPermission {
    return this.permission;
  }

  /**
   * Cria e exibe uma notificação
   */
  async show(options: NotificationOptions): Promise<Notification | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || "/favicon.ico",
        tag: options.tag,
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false,
        badge: "/favicon.ico",
      });

      // Fechar automaticamente após 5 segundos
      setTimeout(() => {
        notification.close();
      }, 5000);

      // Adicionar evento de clique para focar na janela
      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return notification;
    } catch (error) {
      console.warn("Erro ao exibir notificação:", error);
      return null;
    }
  }

  /**
   * Notifica sobre um novo ticket
   */
  async notifyNewTicket(ticket: { id: number; title: string; form?: { title: string } | null }): Promise<void> {
    const message = ticket.form ? `Formulário: ${ticket.form.title}` : "";
    await this.show({
      title: "🎫 Novo Ticket Criado",
      body: `${ticket.title}${message ? `\n${message}` : ""}`,
      tag: `ticket-${ticket.id}`,
      requireInteraction: false,
    });
    
    // Disparar evento customizado para o componente de notificações
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("notification-created", {
          detail: {
            type: "new-ticket",
            title: "Novo Ticket Criado",
            message: `${ticket.title}${message ? ` - ${message}` : ""}`,
            ticketId: ticket.id,
          },
        })
      );
    }
  }

  /**
   * Notifica sobre ticket atribuído ao usuário
   */
  async notifyTicketAssigned(ticket: { id: number; title: string; assignedTo?: { name: string | null } | null }): Promise<void> {
    const message = ticket.assignedTo?.name ? `Atribuído para: ${ticket.assignedTo.name}` : "";
    await this.show({
      title: "👤 Ticket Atribuído",
      body: `${ticket.title}${message ? `\n${message}` : ""}`,
      tag: `ticket-assigned-${ticket.id}`,
      requireInteraction: true,
    });
    
    // Disparar evento customizado para o componente de notificações
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("notification-created", {
          detail: {
            type: "ticket-assigned",
            title: "Ticket Atribuído",
            message: `${ticket.title}${message ? ` - ${message}` : ""}`,
            ticketId: ticket.id,
          },
        })
      );
    }
  }

  /**
   * Notifica sobre ticket em atraso
   */
  async notifyTicketOverdue(ticket: { id: number; title: string; createdAt: string }): Promise<void> {
    const ageHours = Math.floor((Date.now() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60));
    const message = `Aberto há ${ageHours} horas`;
    await this.show({
      title: "⚠️ Ticket em Atraso",
      body: `${ticket.title}\n${message}`,
      tag: `ticket-overdue-${ticket.id}`,
      requireInteraction: true,
    });
    
    // Disparar evento customizado para o componente de notificações
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("notification-created", {
          detail: {
            type: "ticket-overdue",
            title: "Ticket em Atraso",
            message: `${ticket.title} - ${message}`,
            ticketId: ticket.id,
          },
        })
      );
    }
  }

  /**
   * Notifica sobre ticket agendado chegando no horário
   */
  async notifyTicketScheduled(ticket: { id: number; title: string; scheduledAt: string }): Promise<void> {
    const scheduledDate = new Date(ticket.scheduledAt);
    const timeStr = scheduledDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const message = `Horário: ${timeStr}`;
    await this.show({
      title: "📅 Ticket Agendado",
      body: `${ticket.title}\n${message}`,
      tag: `ticket-scheduled-${ticket.id}`,
      requireInteraction: true,
    });
    
    // Disparar evento customizado para o componente de notificações
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("notification-created", {
          detail: {
            type: "ticket-scheduled",
            title: "Ticket Agendado",
            message: `${ticket.title} - ${message}`,
            ticketId: ticket.id,
          },
        })
      );
    }
  }

  /**
   * Inicia verificação periódica de tickets atrasados e agendados
   */
  startChecking(tickets: Array<{ id: number; title: string; createdAt: string; status: string; scheduledAt: string | null }>): void {
    if (this.checkInterval !== null) {
      clearInterval(this.checkInterval);
    }

    // Verificar a cada minuto
    this.checkInterval = window.setInterval(() => {
      if (!this.isAvailable()) return;

      const now = Date.now();
      const OVERDUE_THRESHOLD_MS = 48 * 60 * 60 * 1000; // 48 horas

      tickets.forEach((ticket) => {
        // Verificar tickets em atraso
        if (ticket.status !== "CLOSED") {
          const ageMs = now - new Date(ticket.createdAt).getTime();
          if (ageMs >= OVERDUE_THRESHOLD_MS && !this.lastCheckedTickets.has(ticket.id)) {
            this.notifyTicketOverdue(ticket);
            this.lastCheckedTickets.add(ticket.id);
          }
        }

        // Verificar tickets agendados
        if (ticket.scheduledAt) {
          const scheduledTime = new Date(ticket.scheduledAt).getTime();
          const timeUntilScheduled = scheduledTime - now;
          const fiveMinutes = 5 * 60 * 1000; // 5 minutos antes

          // Notificar 5 minutos antes e no horário exato
          if (timeUntilScheduled <= fiveMinutes && timeUntilScheduled >= 0) {
            const lastNotified = this.scheduledTickets.get(ticket.id) || 0;
            // Notificar apenas uma vez por período de 5 minutos
            if (now - lastNotified > fiveMinutes) {
              this.notifyTicketScheduled(ticket);
              this.scheduledTickets.set(ticket.id, now);
            }
          }

          // Notificar no horário exato (com tolerância de 1 minuto)
          if (Math.abs(timeUntilScheduled) <= 60 * 1000) {
            const lastNotified = this.scheduledTickets.get(ticket.id) || 0;
            if (now - lastNotified > 60 * 1000) {
              this.notifyTicketScheduled(ticket);
              this.scheduledTickets.set(ticket.id, now);
            }
          }
        }
      });
    }, 60000); // Verificar a cada minuto
  }

  /**
   * Para a verificação periódica
   */
  stopChecking(): void {
    if (this.checkInterval !== null) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Limpa o cache de tickets verificados
   */
  clearCheckedTickets(): void {
    this.lastCheckedTickets.clear();
    this.scheduledTickets.clear();
  }
}

// Instância singleton
export const notificationManager = new NotificationManager();

// Hook para usar em componentes React
export function useNotifications() {
  return {
    requestPermission: () => notificationManager.requestPermission(),
    isAvailable: () => notificationManager.isAvailable(),
    isEnabled: () => notificationManager.isEnabled(),
    setEnabled: (enabled: boolean) => notificationManager.setEnabled(enabled),
    getPermission: () => notificationManager.getPermission(),
    notifyNewTicket: (ticket: { id: number; title: string; form?: { title: string } | null }) => 
      notificationManager.notifyNewTicket(ticket),
    notifyTicketAssigned: (ticket: { id: number; title: string; assignedTo?: { name: string | null } | null }) => 
      notificationManager.notifyTicketAssigned(ticket),
    notifyTicketOverdue: (ticket: { id: number; title: string; createdAt: string }) => 
      notificationManager.notifyTicketOverdue(ticket),
    notifyTicketScheduled: (ticket: { id: number; title: string; scheduledAt: string }) => 
      notificationManager.notifyTicketScheduled(ticket),
    startChecking: (tickets: Array<{ id: number; title: string; createdAt: string; status: string; scheduledAt: string | null }>) => 
      notificationManager.startChecking(tickets),
    stopChecking: () => notificationManager.stopChecking(),
    clearCheckedTickets: () => notificationManager.clearCheckedTickets(),
  };
}

