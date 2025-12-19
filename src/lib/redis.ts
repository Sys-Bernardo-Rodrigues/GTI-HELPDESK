import Redis from "ioredis";

let redis: Redis | null = null;

/**
 * Obtém a URL de conexão do Redis
 */
function getRedisUrl(): string {
  // Se REDIS_URL estiver configurado, usar diretamente
  if (process.env.REDIS_URL && process.env.REDIS_URL.trim()) {
    return process.env.REDIS_URL.trim();
  }
  
  // Determinar o host baseado no ambiente
  // Se USE_DOCKER_REDIS=true mas estamos rodando fora do Docker, usar localhost
  // Se estiver dentro do Docker, usar o nome do serviço "redis"
  let host = process.env.REDIS_HOST || "localhost";
  const port = process.env.REDIS_PORT || "6379";
  const password = process.env.REDIS_PASSWORD;
  
  // Se USE_DOCKER_REDIS está true mas não há REDIS_HOST configurado,
  // tentar detectar se estamos dentro ou fora do Docker
  // Por padrão, se o app está rodando localmente, usar localhost
  if (process.env.USE_DOCKER_REDIS === "true" && !process.env.REDIS_HOST) {
    // Se não estiver dentro de um container Docker, usar localhost
    // (o hostname "redis" só funciona dentro da rede Docker)
    host = "localhost";
  }
  
  if (password) {
    return `redis://:${password}@${host}:${port}`;
  }
  
  return `redis://${host}:${port}`;
}

/**
 * Inicializa e retorna o cliente Redis (singleton)
 */
export function getRedisClient(): Redis | null {
  // Se Redis está desabilitado, retornar null
  if (process.env.REDIS_ENABLED === "false") {
    return null;
  }

  // Se já existe uma instância, retornar
  if (redis) {
    return redis;
  }

  try {
    const url = getRedisUrl();
    
    redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError(err) {
        const targetError = "READONLY";
        if (err.message.includes(targetError)) {
          return true; // Reconectar em caso de erro READONLY
        }
        return false;
      },
      lazyConnect: true, // Conectar sob demanda
    });

    // Tratamento de erros
    redis.on("error", (err) => {
      console.error("[Redis] Erro:", err);
      // Não desconectar, deixar o cliente tentar reconectar
    });

    redis.on("connect", () => {
      console.log("[Redis] Conectado com sucesso");
    });

    redis.on("close", () => {
      console.log("[Redis] Conexão fechada");
    });

    return redis;
  } catch (error) {
    console.error("[Redis] Erro ao inicializar:", error);
    return null;
  }
}

/**
 * Conecta ao Redis (se ainda não estiver conectado)
 */
export async function connectRedis(): Promise<boolean> {
  const client = getRedisClient();
  if (!client) {
    return false;
  }

  try {
    if (client.status !== "ready" && client.status !== "connecting") {
      await client.connect();
    }
    // Testar conexão
    await client.ping();
    return true;
  } catch (error) {
    console.error("[Redis] Erro ao conectar:", error);
    return false;
  }
}

/**
 * Desconecta do Redis
 */
export async function disconnectRedis(): Promise<void> {
  if (redis) {
    try {
      await redis.quit();
    } catch (error) {
      console.error("[Redis] Erro ao desconectar:", error);
    } finally {
      redis = null;
    }
  }
}

/**
 * Helper para executar operações Redis com fallback
 */
async function withRedisFallback<T>(
  operation: (client: Redis) => Promise<T>,
  fallback: () => T | Promise<T>
): Promise<T> {
  const client = getRedisClient();
  if (!client) {
    return fallback();
  }

  try {
    // Garantir conexão
    if (client.status !== "ready" && client.status !== "connecting") {
      await client.connect();
    }
    return await operation(client);
  } catch (error) {
    console.error("[Redis] Erro na operação, usando fallback:", error);
    return fallback();
  }
}

/**
 * Cache de sessões
 */
const SESSION_PREFIX = "session:";
const SESSION_TTL = 60 * 60 * 24 * 7; // 7 dias em segundos

export async function getSession(userId: number): Promise<any | null> {
  return withRedisFallback(
    async (client) => {
      const key = `${SESSION_PREFIX}${userId}`;
      const data = await client.get(key);
      return data ? JSON.parse(data) : null;
    },
    () => null
  );
}

export async function setSession(userId: number, data: any): Promise<void> {
  await withRedisFallback(
    async (client) => {
      const key = `${SESSION_PREFIX}${userId}`;
      await client.setex(key, SESSION_TTL, JSON.stringify(data));
    },
    () => {}
  );
}

export async function deleteSession(userId: number): Promise<void> {
  await withRedisFallback(
    async (client) => {
      const key = `${SESSION_PREFIX}${userId}`;
      await client.del(key);
    },
    () => {}
  );
}

/**
 * Cache de respostas do chat
 */
const CHAT_CACHE_PREFIX = "chat:";
const CHAT_CACHE_TTL = 5 * 60; // 5 minutos em segundos

export async function getChatCache(cacheKey: string): Promise<string | null> {
  return withRedisFallback(
    async (client) => {
      const key = `${CHAT_CACHE_PREFIX}${cacheKey}`;
      return await client.get(key);
    },
    () => null
  );
}

export async function setChatCache(cacheKey: string, response: string): Promise<void> {
  await withRedisFallback(
    async (client) => {
      const key = `${CHAT_CACHE_PREFIX}${cacheKey}`;
      await client.setex(key, CHAT_CACHE_TTL, response);
    },
    () => {}
  );
}

/**
 * Limpar cache do chat (útil para invalidação manual)
 */
export async function clearChatCache(pattern?: string): Promise<void> {
  await withRedisFallback(
    async (client) => {
      const searchPattern = pattern ? `${CHAT_CACHE_PREFIX}*${pattern}*` : `${CHAT_CACHE_PREFIX}*`;
      const keys = await client.keys(searchPattern);
      if (keys.length > 0) {
        await client.del(...keys);
      }
    },
    () => {}
  );
}

