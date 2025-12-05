import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

async function main() {
  const email = process.env.DEFAULT_USER_EMAIL;
  const password = process.env.DEFAULT_USER_PASSWORD;
  const name = process.env.DEFAULT_USER_NAME || "Admin";
  const twoFactor = process.env.DEFAULT_USER_TWO_FACTOR === "true" || process.env.DEFAULT_USER_TWO_FACTOR === undefined;

  if (!email || !password) {
    console.warn("Seed: DEFAULT_USER_EMAIL/PASSWORD não definidos, pulando seed.");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash, twoFactor },
    create: { email, name, passwordHash, twoFactor },
  });

  console.log(`Seed: usuário padrão garantido (${email}). 2FA: ${twoFactor ? "Habilitado" : "Desabilitado"}`);
}

main()
  .catch((e) => {
    console.error("Falha no seed do usuário padrão:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });