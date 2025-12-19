/**
 * Paleta de cores vibrantes e contrastantes para usuários
 */
const USER_COLORS = [
  "#3b82f6", // Azul
  "#10b981", // Verde
  "#f59e0b", // Amarelo/Laranja
  "#ef4444", // Vermelho
  "#8b5cf6", // Roxo
  "#ec4899", // Rosa
  "#06b6d4", // Ciano
  "#84cc16", // Verde-limão
  "#f97316", // Laranja
  "#6366f1", // Índigo
  "#14b8a6", // Teal
  "#a855f7", // Violeta
  "#eab308", // Amarelo
  "#22c55e", // Verde-esmeralda
  "#f43f5e", // Rosa-vermelho
  "#0ea5e9", // Azul-sky
];

/**
 * Gera uma cor consistente para um usuário baseado no ID
 */
export function getUserColor(userId: number): string {
  return USER_COLORS[userId % USER_COLORS.length];
}

/**
 * Gera uma cor consistente para um usuário baseado no nome
 * (útil quando não há ID disponível)
 */
export function getUserColorByName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

/**
 * Gera uma cor para um usuário (usa ID se disponível, senão usa nome)
 */
export function getUserColorForUser(user: { id?: number; name: string }): string {
  if (user.id !== undefined) {
    return getUserColor(user.id);
  }
  return getUserColorByName(user.name);
}
