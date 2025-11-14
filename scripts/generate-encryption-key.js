#!/usr/bin/env node

/**
 * Script para gerar uma chave de criptografia segura
 * Execute: node scripts/generate-encryption-key.js
 */

const crypto = require("crypto");

function generateEncryptionKey() {
  return crypto.randomBytes(32).toString("hex");
}

console.log("\n🔐 Gerador de Chave de Criptografia\n");
console.log("Chave gerada (adicione ao seu .env):");
console.log("=" .repeat(64));
console.log(`ENCRYPTION_KEY=${generateEncryptionKey()}`);
console.log("=" .repeat(64));
console.log("\n⚠️  IMPORTANTE:");
console.log("1. Mantenha esta chave em segredo!");
console.log("2. Não compartilhe ou commite no Git");
console.log("3. Use variáveis de ambiente em produção");
console.log("4. Faça backup seguro desta chave");
console.log("5. Sem esta chave, os dados criptografados não poderão ser recuperados!\n");

