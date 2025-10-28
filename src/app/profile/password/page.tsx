import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";

export default async function ChangePasswordPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/");
  return (
    <main className="profile-page" style={{ maxWidth: 640, margin: "0 auto", padding: "2rem 1rem" }}>
      <h1 className="profile-title">Alterar senha</h1>
      <p>Funcionalidade de alteração de senha não implementada neste protótipo.</p>
      <p>
        Por enquanto, utilize os mecanismos de recuperação de senha do sistema principal ou
        contate o administrador.
      </p>
      <a className="btn-secondary" href="/profile">Voltar ao perfil</a>
    </main>
  );
}