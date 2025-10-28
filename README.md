# GTI Helpdesk – Next.js + MariaDB (Docker) + Prisma

Projeto Next.js com TypeScript, banco MariaDB em Docker e ORM Prisma. Inclui modelos básicos (User, Category, Ticket), sincronização de schema, healthcheck de banco e scripts de automação para desenvolvimento.

## Requisitos
- Node.js 18+ (recomendado 20+)
- Docker + Docker Compose

## Configuração
1) Copie o arquivo de exemplo e ajuste suas variáveis:
```bash
cp .env.example .env
# Edite usuário, senha e nome do banco se desejar
```

2) Suba o banco de dados:
```bash
npm run docker:up
# Ver logs do banco
npm run docker:logs
```

3) Inicie o ambiente de desenvolvimento:
```bash
npm run dev
```
O script `predev` faz:
- `prisma generate`: gera o cliente Prisma
- `tsx scripts/check-db.ts`: valida a conexão com o banco
- `prisma db push`: sincroniza o schema do Prisma no banco (dev)

Acesse `http://localhost:3000`.

### Usuário padrão (login)
- Configure no `.env`:
  - `DEFAULT_USER_EMAIL`
  - `DEFAULT_USER_PASSWORD`
  - `DEFAULT_USER_NAME`
- O script de seed roda automaticamente no `npm run dev` e garante o usuário padrão.
- Depois, use esses dados na tela de login (raiz do site).

## Banco de Dados
- Serviço MariaDB definido em `docker-compose.yml` com volume persistente e variáveis `.env`.
- Usuário de app: `DB_USER` com acesso ao banco `DB_NAME`.
- Para desenvolvimento usamos `prisma db push` (rápido e sem shadow DB).
- Para migrações versionadas, use Prisma Migrate:
  - Configure `SHADOW_DATABASE_URL` com usuário root (ex.: do `.env.example`).
  - Rode: `npx prisma migrate dev --name <nome>` (se falhar por permissão do usuário app, execute com URL de root ou ajuste permissões).
  - Em produção, use: `npm run db:deploy`.

## Modelos
Definidos em `prisma/schema.prisma`:
- `User(id, email, name, passwordHash, createdAt, tickets)`
- `Category(id, name, description, tickets)`
- `Ticket(id, title, description, status, userId, categoryId, createdAt, updatedAt)`
- `TicketStatus` enum: `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`

## Conexão e Pooling
- Cliente Prisma singleton em `src/lib/prisma.ts`.
- URL é construída a partir de `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.
- Pool configurado via parâmetros de conexão: `connection_limit=10`, `pool_timeout=30`, etc.

## Healthcheck
- Endpoint: `GET /api/health` retorna `{ ok, db, durationMs }`.
- Útil para monitoramento de disponibilidade do banco na aplicação.

## Scripts NPM
- `dev`: inicia Next com hot-reload (executa `predev` antes)
- `docker:up`: sobe o MariaDB
- `docker:down`: derruba e remove volumes
- `docker:logs`: acompanha logs do MariaDB
- `db:push`: sincroniza schema (dev)
- `db:migrate`: cria/aplica migrações (dev)
- `db:deploy`: aplica migrações pendentes (prod)
- `db:generate`: gera cliente Prisma
- `db:studio`: abre Prisma Studio

## Estrutura
- `src/app/...`: App Router do Next.js
- `src/app/api/health/route.ts`: rota de healthcheck
- `src/lib/prisma.ts`: cliente Prisma singleton e validação
- `prisma/schema.prisma`: modelos do banco
- `docker-compose.yml`: serviço MariaDB + volume
- `.env`: variáveis do projeto (não versionar)

## Dicas
- Caso mude credenciais no `.env`, reinicie o container: `npm run docker:down && npm run docker:up`.
- Se alterar o schema do Prisma, rode `npm run db:push` (ou `npm run db:migrate`).
- Para testes locais, use `npm run db:studio` para visualizar dados.
