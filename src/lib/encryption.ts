import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 16 bytes para AES
const SALT_LENGTH = 64; // 64 bytes para salt
const TAG_LENGTH = 16; // 16 bytes para GCM auth tag
const KEY_LENGTH = 32; // 32 bytes para AES-256
const ITERATIONS = 100000; // PBKDF2 iterations

/**
 * Obtém a chave de criptografia do ambiente ou gera uma nova
 * IMPORTANTE: Em produção, defina ENCRYPTION_KEY como variável de ambiente
 */
function getEncryptionKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;
  
  if (envKey) {
    // Se a chave está em hex, converter para buffer
    if (/^[0-9a-f]{64}$/i.test(envKey)) {
      return Buffer.from(envKey, "hex");
    }
    // Se não está em hex, usar como base para derivar chave
    return crypto.pbkdf2Sync(envKey, "base-knowledge-salt", ITERATIONS, KEY_LENGTH, "sha512");
  }
  
  // Fallback: usar uma chave derivada de uma string fixa (NÃO SEGURO para produção)
  // Em produção, SEMPRE defina ENCRYPTION_KEY
  console.warn("⚠️  ENCRYPTION_KEY não definida. Usando chave derivada (NÃO SEGURO para produção)");
  return crypto.pbkdf2Sync(
    "default-encryption-key-change-in-production",
    "base-knowledge-salt",
    ITERATIONS,
    KEY_LENGTH,
    "sha512"
  );
}

/**
 * Gera um salt aleatório
 */
function generateSalt(): Buffer {
  return crypto.randomBytes(SALT_LENGTH);
}

/**
 * Deriva uma chave a partir de uma senha e salt usando PBKDF2
 */
function deriveKey(password: Buffer, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, "sha512");
}

/**
 * Criptografa dados usando AES-256-GCM
 * Retorna: salt + iv + tag + dados criptografados (tudo em base64)
 */
export function encrypt(data: string | Buffer): string {
  try {
    const dataBuffer = typeof data === "string" ? Buffer.from(data, "utf8") : data;
    const masterKey = getEncryptionKey();
    const salt = generateSalt();
    const key = deriveKey(masterKey, salt);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(dataBuffer);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    const tag = cipher.getAuthTag();
    
    // Combinar: salt (64 bytes) + iv (16 bytes) + tag (16 bytes) + encrypted
    const combined = Buffer.concat([
      salt,
      iv,
      tag,
      encrypted
    ]);
    
    return combined.toString("base64");
  } catch (error: any) {
    throw new Error(`Erro ao criptografar: ${error?.message || String(error)}`);
  }
}

/**
 * Descriptografa dados usando AES-256-GCM
 * Espera: salt + iv + tag + dados criptografados (tudo em base64)
 */
export function decrypt(encryptedData: string): Buffer {
  try {
    const combined = Buffer.from(encryptedData, "base64");
    
    // Extrair componentes
    let offset = 0;
    const salt = combined.slice(offset, offset + SALT_LENGTH);
    offset += SALT_LENGTH;
    
    const iv = combined.slice(offset, offset + IV_LENGTH);
    offset += IV_LENGTH;
    
    const tag = combined.slice(offset, offset + TAG_LENGTH);
    offset += TAG_LENGTH;
    
    const encrypted = combined.slice(offset);
    
    // Derivar chave
    const masterKey = getEncryptionKey();
    const key = deriveKey(masterKey, salt);
    
    // Descriptografar
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted;
  } catch (error: any) {
    throw new Error(`Erro ao descriptografar: ${error?.message || String(error)}`);
  }
}

/**
 * Criptografa um arquivo e retorna o buffer criptografado
 * Formato: salt (64 bytes) + iv (16 bytes) + tag (16 bytes) + encrypted data
 */
export function encryptFile(fileBuffer: Buffer): Buffer {
  try {
    const masterKey = getEncryptionKey();
    const salt = generateSalt();
    const key = deriveKey(masterKey, salt);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(fileBuffer);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    const tag = cipher.getAuthTag();
    
    // Combinar: salt (64 bytes) + iv (16 bytes) + tag (16 bytes) + encrypted
    return Buffer.concat([
      salt,
      iv,
      tag,
      encrypted
    ]);
  } catch (error: any) {
    throw new Error(`Erro ao criptografar arquivo: ${error?.message || String(error)}`);
  }
}

/**
 * Descriptografa um arquivo e retorna o buffer descriptografado
 * Suporta dois formatos:
 * 1. Novo formato: salt (64 bytes) + iv (16 bytes) + tag (16 bytes) + encrypted data
 * 2. Formato antigo: buffer contendo string base64 que precisa ser descriptografada
 */
export function decryptFile(encryptedBuffer: Buffer): Buffer {
  // Tentar formato novo primeiro (formato binário direto)
  try {
    if (encryptedBuffer.length >= SALT_LENGTH + IV_LENGTH + TAG_LENGTH) {
      // Extrair componentes do formato novo
      let offset = 0;
      const salt = encryptedBuffer.slice(offset, offset + SALT_LENGTH);
      offset += SALT_LENGTH;
      
      const iv = encryptedBuffer.slice(offset, offset + IV_LENGTH);
      offset += IV_LENGTH;
      
      const tag = encryptedBuffer.slice(offset, offset + TAG_LENGTH);
      offset += TAG_LENGTH;
      
      const encrypted = encryptedBuffer.slice(offset);
      
      // Derivar chave
      const masterKey = getEncryptionKey();
      const key = deriveKey(masterKey, salt);
      
      // Descriptografar
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      return decrypted;
    }
  } catch (error: any) {
    // Se falhar, tentar formato antigo
    console.warn(`Tentando formato antigo de criptografia: ${error?.message}`);
  }

  // Tentar formato antigo (buffer contém dados que, quando convertidos para base64, formam a string esperada por decrypt)
  try {
    // O formato antigo salvava: Buffer.from(encrypt(fileBuffer), "base64")
    // Então precisamos converter o buffer de volta para base64 e passar para decrypt
    const encryptedString = encryptedBuffer.toString("base64");
    return decrypt(encryptedString);
  } catch (error: any) {
    // Se ambos os formatos falharem, pode ser:
    // 1. Arquivo não criptografado (formato antigo antes da criptografia)
    // 2. Arquivo corrompido
    // 3. Chave de criptografia diferente
    const errorMsg = error?.message || String(error);
    console.error(`Falha ao descriptografar arquivo (formatos novo e antigo):`, errorMsg);
    throw new Error(`Erro ao descriptografar arquivo: ${errorMsg}. Verifique se o arquivo foi criptografado e se a chave ENCRYPTION_KEY está correta.`);
  }
}

/**
 * Gera uma nova chave de criptografia (hex, 64 caracteres)
 * Use isso para gerar ENCRYPTION_KEY para produção
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString("hex");
}

