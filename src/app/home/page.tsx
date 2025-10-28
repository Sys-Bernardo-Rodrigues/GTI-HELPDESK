import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import HeaderBar from "./HeaderBar";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/");
  }

  // Dados necessários: usuário e avisos (mock simples por enquanto)
  const notifications = [
    { id: 1, type: "info", message: "Bem-vindo ao Helpdesk!" },
    { id: 2, type: "warning", message: "Backup agendado para hoje às 23h." },
  ];

  return (
    <main className="home-page">
      {/* Topbar / Nav principal */}
      <HeaderBar user={user} />

      {/* Conteúdo principal + Notificações */}
      <section className="home-content">
      </section>
    </main>
  );
}