import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HomePage from "../../home/page";

describe("HomePage user logout modal", () => {
  test("does not render confirmation dialog by default", () => {
    render(<HomePage />);
    const dialog = screen.queryByRole("dialog", { name: /você deseja realmente sair/i });
    expect(dialog).toBeNull();
  });

  test("renders confirmation dialog only after clicking Sair", async () => {
    const user = userEvent.setup();
    render(<HomePage />);

    // abre o menu do usuário
    const userFooterBtn = screen.getByRole("button", { name: /menu do usuário/i });
    await user.click(userFooterBtn);

    // clica em Sair
    const sairBtn = screen.getByRole("menuitem", { name: /sair/i });
    await user.click(sairBtn);

    // modal deve aparecer
    const dialog = await screen.findByRole("dialog", { name: /você deseja realmente sair/i });
    expect(dialog).toBeInTheDocument();

    // cancelar fecha o modal
    const cancelar = screen.getByRole("button", { name: /cancelar/i });
    await user.click(cancelar);
    expect(screen.queryByRole("dialog", { name: /você deseja realmente sair/i })).toBeNull();
  });
});