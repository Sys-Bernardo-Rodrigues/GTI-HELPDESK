# Página de Configurações

A página `/config` fornece um layout responsivo com header reutilizável, menu lateral categorizado e conteúdo de seção com feedback visual de carregamento e tratamento de erros.

## Componentes

- `src/ui/AppHeader.tsx`
  - Logo/identificação do sistema.
  - Navegação principal (`/home`, `/config`).
  - Área de usuário com avatar (resolve URL de avatar e exibe inicial como fallback).

- `src/components/StandardLayout.tsx`
  - Layout principal com menu lateral (Início, Tickets, Base, Agenda, etc.).
  - Item `Config` com submenu para:
    - `Usuários` (`/users`)
    - `Formulários` (`/config?section=forms`)
    - `Webhooks` (`/config?section=webhooks`)
    - `Atualizar` (`/config?section=update`)
    - `Configurar .env` (`/config?section=env`)
    - `Acessos` (`/config/acessos`)

- `src/app/config/page.tsx`
  - Estrutura da página com grid responsivo e card central de conteúdo.
  - Seções principais:
    - `general`: Configurações gerais (nome do sistema, timezone).
    - `appearance`: Tema e aparência.
    - `notifications`: Preferências de notificações.
    - `security`: Política de senha.
    - `integrations`: Integrações básicas.
    - `update`: Atualização do código via Git (`/api/system/update`).
    - `env`: Edição visual das principais variáveis do `.env` (`/api/system/env`).
    - `forms` e `webhooks`: Gerenciamento avançado.
  - Carregamento: skeleton com transição suave ao trocar de seção.
  - Erros: exibe mensagem quando `section` inválida.

## Uso

- Acesse `http://localhost:3000/config?section=general` para a tela inicial de configurações.
- Use o submenu `Config` no layout principal para navegar direto para:
  - `/config?section=forms` (Formulários)
  - `/config?section=webhooks` (Webhooks)
  - `/config?section=update` (Atualizar via Git)
  - `/config?section=env` (Configurar `.env`)

## Extensão

- Para adicionar novas seções:
  - Inclua a nova chave em `SectionKey` em `config/page.tsx`.
  - Adicione um novo `case` no `switch (section)` com o conteúdo desejado.
  - Opcional: adicione item correspondente no submenu de `StandardLayout`.

## Testes

- Testes unitários em `src/app/config/__tests__/config.test.tsx` usando `@testing-library/react` + `vitest`.
- Cobrem troca de seção, estado ativo e exibição de skeleton durante carregamento.