/**
 * Sistema de efeitos sonoros para o Helpdesk
 * Gerencia reprodução de sons para feedback de ações do usuário
 */

type SoundType = 
  | "success" 
  | "error" 
  | "info" 
  | "notification" 
  | "ticket-created" 
  | "ticket-updated" 
  | "ticket-closed"
  | "click";

class SoundManager {
  private enabled: boolean = true;
  private volume: number = 0.5;
  private audioContext: AudioContext | null = null;

  constructor() {
    // Verificar se está no navegador
    if (typeof window !== "undefined") {
      // Carregar preferências do localStorage
      try {
        const savedEnabled = localStorage.getItem("sounds_enabled");
        const savedVolume = localStorage.getItem("sounds_volume");
        
        if (savedEnabled !== null) {
          this.enabled = savedEnabled === "true";
        }
        if (savedVolume !== null) {
          this.volume = parseFloat(savedVolume) || 0.5;
        }
      } catch (e) {
        // Ignorar erros de localStorage
      }
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    
    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.warn("AudioContext não disponível:", e);
        return null;
      }
    }
    
    return this.audioContext;
  }

  /**
   * Gera um tom usando Web Audio API
   */
  private playTone(frequency: number, duration: number, type: OscillatorType = "sine"): void {
    if (!this.enabled) return;
    
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      // Retomar contexto se estiver suspenso (necessário após interação do usuário)
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = type;

      // Envelope ADSR simples
      const now = ctx.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(this.volume, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

      oscillator.start(now);
      oscillator.stop(now + duration);
    } catch (e) {
      console.warn("Erro ao reproduzir som:", e);
    }
  }

  /**
   * Toca um som de sucesso
   */
  playSuccess(): void {
    this.playTone(523.25, 0.1, "sine"); // C5
    setTimeout(() => this.playTone(659.25, 0.15, "sine"), 50); // E5
  }

  /**
   * Toca um som de erro
   */
  playError(): void {
    this.playTone(220, 0.2, "sawtooth"); // A3
  }

  /**
   * Toca um som informativo
   */
  playInfo(): void {
    this.playTone(440, 0.1, "sine"); // A4
  }

  /**
   * Toca um som de notificação
   */
  playNotification(): void {
    this.playTone(523.25, 0.1, "sine"); // C5
    setTimeout(() => this.playTone(659.25, 0.1, "sine"), 100); // E5
    setTimeout(() => this.playTone(783.99, 0.15, "sine"), 200); // G5
  }

  /**
   * Toca um som quando um ticket é criado
   */
  playTicketCreated(): void {
    this.playTone(392, 0.1, "sine"); // G4
    setTimeout(() => this.playTone(523.25, 0.15, "sine"), 80); // C5
  }

  /**
   * Toca um som quando um ticket é atualizado
   */
  playTicketUpdated(): void {
    this.playTone(440, 0.08, "sine"); // A4
  }

  /**
   * Toca um som quando um ticket é fechado
   */
  playTicketClosed(): void {
    this.playTone(523.25, 0.1, "sine"); // C5
    setTimeout(() => this.playTone(392, 0.15, "sine"), 100); // G4
  }

  /**
   * Toca um som de clique
   */
  playClick(): void {
    this.playTone(800, 0.05, "sine"); // Som curto e agudo
  }

  /**
   * Toca um som baseado no tipo
   */
  play(type: SoundType): void {
    switch (type) {
      case "success":
        this.playSuccess();
        break;
      case "error":
        this.playError();
        break;
      case "info":
        this.playInfo();
        break;
      case "notification":
        this.playNotification();
        break;
      case "ticket-created":
        this.playTicketCreated();
        break;
      case "ticket-updated":
        this.playTicketUpdated();
        break;
      case "ticket-closed":
        this.playTicketClosed();
        break;
      case "click":
        this.playClick();
        break;
    }
  }

  /**
   * Habilita ou desabilita os sons
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("sounds_enabled", String(enabled));
      } catch (e) {
        // Ignorar erros de localStorage
      }
    }
  }

  /**
   * Define o volume (0.0 a 1.0)
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("sounds_volume", String(this.volume));
      } catch (e) {
        // Ignorar erros de localStorage
      }
    }
  }

  /**
   * Retorna se os sons estão habilitados
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Retorna o volume atual
   */
  getVolume(): number {
    return this.volume;
  }
}

// Instância singleton
export const soundManager = new SoundManager();

// Hook para usar em componentes React
export function useSound() {
  return {
    play: (type: SoundType) => soundManager.play(type),
    playSuccess: () => soundManager.playSuccess(),
    playError: () => soundManager.playError(),
    playInfo: () => soundManager.playInfo(),
    playNotification: () => soundManager.playNotification(),
    playTicketCreated: () => soundManager.playTicketCreated(),
    playTicketUpdated: () => soundManager.playTicketUpdated(),
    playTicketClosed: () => soundManager.playTicketClosed(),
    playClick: () => soundManager.playClick(),
    setEnabled: (enabled: boolean) => soundManager.setEnabled(enabled),
    setVolume: (volume: number) => soundManager.setVolume(volume),
    isEnabled: () => soundManager.isEnabled(),
    getVolume: () => soundManager.getVolume(),
  };
}

