import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ConfigPage from "../../config/page";

describe("Settings /config page", () => {
  it("renderiza header e sidebar iguais ao /home", async () => {
    render(<ConfigPage />);
    // Header básico
    expect(await screen.findByRole("navigation", { name: /Barra de navegação/i })).toBeInTheDocument();
    // Sidebar com navegação principal
    const nav = screen.getByRole("navigation", { name: /Navegação principal/i });
    expect(nav).toBeInTheDocument();
    // Links principais
    expect(screen.getByRole("link", { name: /Início/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Tickets/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Usuários/i })).toBeInTheDocument();
    const cfg = screen.getByRole("link", { name: /Configurações/i });
    expect(cfg).toBeInTheDocument();
    expect(cfg).toHaveAttribute("aria-current", "page");
    // Título da página
    expect(screen.getByRole("heading", { name: /Configurações/i })).toBeInTheDocument();
  });

  it("exibe conteúdo de Configurações Gerais", async () => {
    render(<ConfigPage />);
    expect(await screen.findByRole("heading", { name: /Configurações Gerais/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Nome do sistema/i)).toBeInTheDocument();
  });
});