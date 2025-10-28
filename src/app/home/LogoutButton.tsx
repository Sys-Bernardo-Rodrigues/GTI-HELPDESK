"use client";

export default function LogoutButton() {
  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
      window.location.href = "/";
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      // Mesmo com erro, redireciona para a página de login
      window.location.href = "/";
    }
  };

  return (
    <button className="logout" onClick={handleLogout}>
      Sair
    </button>
  );
}