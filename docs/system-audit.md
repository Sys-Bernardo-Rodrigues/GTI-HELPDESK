# Auditoria do Sistema – GTI Helpdesk

Este documento registra o mapeamento completo, classificação de arquivos, ações de limpeza e métricas de otimização realizadas.

## 1) Mapeamento completo

- Framework: `Next.js (App Router)` com `TypeScript`.
- UI: `styled-components` com `GlobalStyles` e `StyledComponentsRegistry`.
- Autenticação: JWT em cookie `auth_token`, utilitário `src/lib/auth.ts`.
- Banco: `MariaDB` via `Prisma` (`src/lib/prisma.ts`, `prisma/schema.prisma`).
- API: rotas em `src/app/api/*` para `login`, `logout`, `session`, `health`, `profile` (avatar, email, discord, phone, password).
- Scripts: `scripts/check-db.ts` (health DB) e `scripts/seed-default-user.ts` (seed do usuário padrão).
- Testes: `vitest` + `@testing-library` com `src/app/home/__tests__/home.test.tsx` e `vitest.setup.ts`.
- Docker: `docker-compose.yml` para serviço `mariadb`.

### Diagrama (organização por camadas)

```
root
├─ src
│  ├─ app (Next App Router)
│  │  ├─ page.tsx (login)
│  │  ├─ layout.tsx (GlobalStyles + styled registry)
│  │  ├─ home/ (layout + UI rica)
│  │  ├─ profile/ (layout + page protegida)
│  │  └─ api/
│  │     ├─ health/route.ts
│  │     ├─ login/route.ts
│  │     ├─ logout/route.ts
│  │     ├─ session/route.ts
│  │     └─ profile/
│  │        ├─ route.ts
│  │        ├─ avatar/route.ts
│  │        ├─ email/route.ts + verify/route.ts
│  │        ├─ discord/route.ts
│  │        ├─ phone/route.ts + request-code/route.ts + verify/route.ts
│  │        └─ password/route.ts
│  ├─ lib
│  │  ├─ prisma.ts (cliente Prisma singleton)
│  │  └─ auth.ts (JWT + cookies -> usuário autenticado)
│  └─ ui
│     └─ GlobalStyles.ts
├─ prisma
│  └─ schema.prisma (User/Category/Ticket/Status)
├─ scripts (setup/dev)
├─ tests (Vitest setup em `vitest.setup.ts`)
├─ docker-compose.yml
├─ package.json / package-lock.json
├─ tsconfig.json / eslint.config.mjs
└─ README.md / .env.example / .gitignore
```

## 2) Classificação de arquivos

- Essenciais:
  - `src/app/**`, `src/lib/**`, `src/ui/GlobalStyles.ts`.
  - `prisma/schema.prisma`, `src/generated/prisma` (gerado, não versionado).
  - `docker-compose.yml`, `.env` (local, não versionar), `.env.example`.
  - `package.json`, `tsconfig.json`, `eslint.config.mjs`.
  - Testes: `vitest.config.ts`, `vitest.setup.ts`, `src/app/home/__tests__/*`.
- Opcionais:
  - `.vscode/settings.json`, `README.md` (documentação), `prisma.config.ts` (configuração auxiliar do Prisma).
- Obsoletos/Inúteis:
  - Conteúdo de `.next/` (artefatos de build e desenvolvimento) – removidos.
  - Duplicidade em `.gitignore` (`node_modules` repetido) – saneado.
  - Entradas duplicadas de `.next/dev/types` no `tsconfig.json` – saneadas.
  - Dependência dev não utilizada: `cross-env` – removida.

### Duplicados/Redundantes

- `.gitignore`: duas linhas `node_modules` e ausência de `.next/` – corrigido.
- `tsconfig.json`: entradas repetidas e com barras invertidas para `.next\dev/types` – padronizado.

### Dependências não utilizadas

- Removida: `cross-env` (não referenciada nos scripts nem no código).
- Demais dependências confirmadas em uso (`styled-components`, `jsonwebtoken`, `bcryptjs`, `@prisma/client`, `next`, `react`, `react-dom`, e libs de teste).

## 3) Limpeza realizada

- Remoção de `.next/` e inclusão de `.next/` no `.gitignore` para evitar versionamento futuro.
- Saneamento de `.gitignore` (remoção de duplicidades, padronização de caminhos).
- Saneamento de `tsconfig.json` (remoção de entradas duplicadas e padronização de includes do Next).
- Remoção da dependência dev `cross-env` e atualização de `package-lock.json` via `npm uninstall`.

## 4) Métricas de otimização

- Espaço liberado: ~41.8 MB (43,799,749 bytes) ao remover `.next/`.
- Redução de arquivos: conteúdo completo de `.next/` (dezenas/centenas de arquivos) eliminado do repositório.
- Redução de dependências: -1 devDependency (`cross-env`).

## 5) Garantia de funcionalidade

- Nenhuma funcionalidade essencial foi comprometida: `.next/` é reconstruída pelo `next dev/build`.
- Dependências em uso mantidas; scripts `dev/build/start/test` permanecem operacionais.

## 6) Recomendações futuras

- Rodar `npm audit` periodicamente e avaliar correções.
- Manter `.next/` fora do versionamento (já configurado).
- Considerar migrações Prisma (`migrate`) para versionamento de schema quando sair de ambiente dev.