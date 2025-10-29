# Página de Configurações

A página `/config` fornece um layout responsivo com header reutilizável, menu lateral categorizado e conteúdo de seção com feedback visual de carregamento e tratamento de erros.

## Componentes

- `src/ui/AppHeader.tsx`
  - Logo/identificação do sistema.
  - Navegação principal (`/home`, `/config`).
  - Área de usuário com avatar (resolve URL de avatar e exibe inicial como fallback).

- `src/ui/SettingsSideMenu.tsx`
  - Menu lateral de configurações com categorias: Geral, Aparência, Notificações, Segurança, Integrações.
  - Acessibilidade: `aria-current`, foco ao abrir, navegação por teclado (`button`).
  - Persistência: estado de abertura do sidebar salvo em `localStorage`.
  - Navegação cliente-side: atualiza `section` na query string via `router.replace`.

- `src/app/config/page.tsx`
  - Estrutura da página com grid responsivo, overlay em mobile e card de conteúdo.
  - Carregamento: skeleton com transição suave ao trocar de seção.
  - Erros: exibe mensagem quando `section` inválida.

## Uso

- Acesse `http://localhost:3000/config`.
- Troque de seção pelo menu lateral; a URL será atualizada com `?section=<key>`.
- O estado de abertura do menu é preservado em navegações.

## Extensão

- Adicionar novos itens ao menu em `SettingsSideMenu.tsx` e o conteúdo correspondente no `switch` de `page.tsx`.
- Integrar com APIs reais para salvar preferências por seção.

## Testes

- Testes unitários em `src/app/config/__tests__/config.test.tsx` usando `@testing-library/react` + `vitest`.
- Cobrem troca de seção, estado ativo e exibição de skeleton durante carregamento.