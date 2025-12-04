# Análise Completa do Sistema RootDesk

## 📋 Sumário Executivo

O **RootDesk** é um sistema completo de gerenciamento de suporte técnico e projetos desenvolvido em **Next.js 16** com **TypeScript**, utilizando **Prisma** como ORM sobre um banco relacional (padrão **MariaDB**, com suporte a configuração via `DATABASE_URL` para outros providers compatíveis como **PostgreSQL**). O sistema oferece funcionalidades abrangentes para gestão de tickets, projetos, formulários, base de conhecimento, agenda, e muito mais.

---

## 🏗️ Arquitetura e Tecnologias

### Stack Tecnológico
- **Framework**: Next.js 16.0.0 (App Router)
- **Linguagem**: TypeScript 5+
- **UI**: Styled Components 6.1.8
- **Banco de Dados**: MariaDB (via Docker) por padrão, configurável via `DATABASE_URL` para outros bancos suportados pelo Prisma (ex.: PostgreSQL)
- **ORM**: Prisma 6.18.0
- **Autenticação**: JWT (jsonwebtoken)
- **Segurança**: bcryptjs para hash de senhas
- **Testes**: Vitest + Testing Library

### Infraestrutura
- **Containerização**: Docker Compose para MariaDB (pode ser adaptado para PostgreSQL ou outro banco suportado)
- **Deploy**: Pronto para produção com migrações Prisma
- **Healthcheck**: Endpoint `/api/health` para monitoramento

---

## 📊 Modelos de Dados (Prisma Schema)

### 1. **User** (Usuário)
**Campos principais:**
- Informações básicas: `id`, `email`, `name`, `passwordHash`
- Perfil: `phone`, `jobTitle`, `company`, `avatarUrl`
- Segurança: `twoFactor`, `phoneVerified`, `emailVerifiedAt`
- Integrações: `discordTag`, `newsletter`
- Relacionamentos: Tickets, Formulários, Projetos, Eventos, Documentos, Arquivos, Senhas, Webhooks

### 2. **Ticket** (Chamado)
**Status disponíveis:**
- `OPEN` - Aberto
- `IN_PROGRESS` - Em Andamento
- `OBSERVATION` - Em Observação
- `RESOLVED` - Resolvido
- `CLOSED` - Fechado

**Funcionalidades:**
- Atribuição de responsável (`assignedToId`)
- Categorização (`categoryId`)
- Agendamento (`scheduledAt`, `scheduledNote`)
- Vinculação a projetos (`projectId`)
- Histórico de atualizações (`TicketUpdate`)
- Vinculação a submissões de formulários

### 3. **Category** (Categoria)
- Categorização de tickets
- `name` (único), `description`

### 4. **Form** (Formulário)
**Funcionalidades:**
- Formulários públicos ou privados (`isPublic`)
- Sistema de aprovação (`requiresApproval`)
- Slug único para URLs amigáveis
- Campos dinâmicos (`FormField`)
- Submissões (`FormSubmission`)
- Aprovadores (`FormApprover`)
- Aprovações (`FormApproval`)

**Tipos de campos:**
- `TEXT`, `TEXTAREA`, `SELECT`, `RADIO`, `CHECKBOX`, `FILE`

**Status de aprovação:**
- `PENDING` - Pendente
- `APPROVED` - Aprovado
- `REJECTED` - Rejeitado

### 5. **Project** (Projeto)
**Status disponíveis:**
- `PLANNING` - Planejamento
- `IN_PROGRESS` - Em Andamento
- `ON_HOLD` - Em Espera
- `COMPLETED` - Concluído
- `CANCELLED` - Cancelado

**Funcionalidades:**
- Progresso automático baseado em tarefas (`progress`)
- Datas de início e fim (`startDate`, `endDate`)
- Cor personalizada (`color`)
- Membros do projeto (`ProjectMember`)
- Tarefas (`ProjectTask`)
- Tickets vinculados

### 6. **ProjectTask** (Tarefa de Projeto)
**Status disponíveis:**
- `TODO` - A Fazer
- `IN_PROGRESS` - Em Andamento
- `DONE` - Concluído
- `CANCELLED` - Cancelado

**Prioridades:**
- `LOW` - Baixa
- `MEDIUM` - Média
- `HIGH` - Alta
- `URGENT` - Urgente

**Funcionalidades:**
- Hierarquia de tarefas (subtarefas via `parentTaskId`)
- Atribuição de responsável (`assignedToId`)
- Data de vencimento (`dueDate`)
- Ordenação (`order`)
- Descrição e metadados

### 7. **Event** (Evento/Agenda)
**Funcionalidades:**
- Eventos com data/hora de início e fim
- Eventos de dia inteiro (`isAllDay`)
- Localização (`location`)
- Cor personalizada (`color`)
- Descrição

### 8. **Document** (Documento/Base de Conhecimento)
- Título, conteúdo (`@db.LongText`)
- Categorização (`category`, `tags`)
- Rastreamento de criação

### 9. **File** (Arquivo)
- Metadados: `name`, `originalName`, `mimeType`, `size`, `path`
- Organização: `category`, `tags`, `description`
- Upload e gerenciamento

### 10. **PasswordVault** (Cofre de Senhas)
- Armazenamento seguro de credenciais
- Campos: `title`, `username`, `password`, `url`, `notes`
- Categorização: `category`, `tags`
- Criptografia (via `src/lib/encryption.ts`)

### 11. **Webhook** (Webhook)
- Integrações externas
- Token único para autenticação
- Ativação/desativação (`isActive`)
- Endpoint de recebimento: `/api/webhooks/receive/[token]`

---

## 🎯 Módulos e Funcionalidades

### 1. **Autenticação e Sessão**
**Rotas:**
- `POST /api/login` - Login com email/senha
- `POST /api/logout` - Logout
- `GET /api/session` - Verificar sessão atual

**Segurança:**
- JWT armazenado em cookie HTTP-only
- Hash de senha com bcryptjs
- Verificação de token em rotas protegidas

### 2. **Gestão de Usuários** (`/users`)
**Funcionalidades:**
- Listagem de usuários
- Criação de novos usuários
- Edição de usuários
- Visualização de perfil
- Gerenciamento de permissões (estrutura preparada)

**API:**
- `GET /api/users` - Listar usuários
- `POST /api/users` - Criar usuário
- `GET /api/users/[id]` - Obter usuário
- `PUT /api/users/[id]` - Atualizar usuário

### 3. **Gestão de Tickets** (`/tickets`)
**Funcionalidades:**
- Criação, edição e exclusão de tickets
- Atribuição de responsáveis
- Categorização
- Agendamento de tickets
- Histórico de atualizações (`TicketUpdate`)
- Filtros por status, categoria, responsável
- Vinculação a projetos
- Vinculação a submissões de formulários

**API:**
- `GET /api/tickets` - Listar tickets
- `POST /api/tickets` - Criar ticket
- `GET /api/tickets/[id]` - Obter ticket
- `PUT /api/tickets/[id]` - Atualizar ticket
- `POST /api/tickets/[id]/updates` - Adicionar atualização

### 4. **Gestão de Projetos** (`/projetos`)
**Funcionalidades:**
- Criação e edição de projetos
- Gerenciamento de membros do projeto
- Progresso automático baseado em tarefas concluídas
- Visualização de projetos com cards modernos
- Filtros por status
- Cores personalizadas
- Datas de início e fim

**Tarefas de Projeto:**
- Criação de tarefas principais e subtarefas
- Atribuição de responsáveis
- Definição de prioridades
- Status de progresso
- Data de vencimento
- Deadlines aparecem automaticamente na agenda
- Progresso do projeto calculado automaticamente

**API:**
- `GET /api/projects` - Listar projetos
- `POST /api/projects` - Criar projeto
- `GET /api/projects/[id]` - Obter projeto
- `PUT /api/projects/[id]` - Atualizar projeto
- `DELETE /api/projects/[id]` - Deletar projeto
- `GET /api/projects/[id]/tasks` - Listar tarefas
- `POST /api/projects/[id]/tasks` - Criar tarefa
- `GET /api/projects/[id]/tasks/[taskId]` - Obter tarefa
- `PUT /api/projects/[id]/tasks/[taskId]` - Atualizar tarefa
- `DELETE /api/projects/[id]/tasks/[taskId]` - Deletar tarefa

### 5. **Agenda/Calendário** (`/agenda`)
**Funcionalidades:**
- Visualização mensal de eventos
- Criação e edição de eventos
- Eventos de dia inteiro ou com horário específico
- Localização e descrição
- Cores personalizadas
- Filtro "Apenas meus eventos"
- **Integração automática:**
  - Deadlines de projetos aparecem automaticamente
  - Deadlines de tarefas aparecem automaticamente
  - Tickets agendados aparecem na agenda
- Visualização de dia específico com lista de eventos

**API:**
- `GET /api/events` - Listar eventos (com filtros de data)
- `POST /api/events` - Criar evento
- `GET /api/events/[id]` - Obter evento
- `PUT /api/events/[id]` - Atualizar evento
- `DELETE /api/events/[id]` - Deletar evento

### 6. **Formulários** (`/config` - seção Forms)
**Funcionalidades:**
- Criação de formulários dinâmicos
- Campos configuráveis (texto, textarea, select, radio, checkbox, arquivo)
- Formulários públicos ou privados
- Sistema de aprovação configurável
- Aprovadores múltiplos
- Submissões de formulários
- Geração automática de tickets a partir de submissões
- URLs amigáveis via slug

**API:**
- `GET /api/forms` - Listar formulários
- `POST /api/forms` - Criar formulário
- `GET /api/forms/[id]` - Obter formulário
- `PUT /api/forms/[id]` - Atualizar formulário
- `DELETE /api/forms/[id]` - Deletar formulário
- `GET /api/forms/by-slug?slug=xxx` - Obter formulário público por slug
- `POST /api/forms/[id]/submit` - Submeter formulário

### 7. **Aprovações** (`/aprovacoes`)
**Funcionalidades:**
- Listagem de submissões pendentes de aprovação
- Aprovação ou rejeição de submissões
- Histórico de aprovações
- Geração automática de tickets aprovados

**API:**
- `GET /api/approvals` - Listar aprovações
- `PUT /api/approvals/[id]` - Aprovar/rejeitar

### 8. **Base de Conhecimento** (`/base`)
**Funcionalidades:**
- Documentos de conhecimento
- Categorização e tags
- Busca e filtros
- Gerenciamento de arquivos
- Preview de arquivos
- Download de arquivos
- Cofre de senhas (criptografado)

**API:**
- `GET /api/base` - Listar documentos
- `POST /api/base` - Criar documento
- `GET /api/base/[id]` - Obter documento
- `PUT /api/base/[id]` - Atualizar documento
- `DELETE /api/base/[id]` - Deletar documento
- `GET /api/base/files` - Listar arquivos
- `POST /api/base/files` - Upload de arquivo
- `GET /api/base/files/[id]` - Obter arquivo
- `GET /api/base/files/[id]/download` - Download
- `GET /api/base/files/[id]/preview` - Preview
- `GET /api/base/passwords` - Listar senhas
- `POST /api/base/passwords` - Criar senha
- `GET /api/base/passwords/[id]` - Obter senha
- `PUT /api/base/passwords/[id]` - Atualizar senha
- `DELETE /api/base/passwords/[id]` - Deletar senha

### 9. **Perfil do Usuário** (`/profile`)
**Funcionalidades:**
- Visualização e edição de perfil
- Upload de avatar
- Alteração de senha
- Verificação de email
- Verificação de telefone (com código SMS)
- Vinculação de Discord
- Configurações de notificações

**API:**
- `GET /api/profile` - Obter perfil
- `PUT /api/profile` - Atualizar perfil
- `POST /api/profile/avatar` - Upload de avatar
- `POST /api/profile/password` - Alterar senha
- `POST /api/profile/email` - Alterar email
- `POST /api/profile/email/verify` - Verificar email
- `POST /api/profile/phone` - Alterar telefone
- `POST /api/profile/phone/request-code` - Solicitar código SMS
- `POST /api/profile/phone/verify` - Verificar telefone
- `POST /api/profile/discord` - Vincular Discord

### 10. **Configurações** (`/config`)
**Seções:**
- **Geral**: Configurações básicas do sistema
- **Aparência**: Temas e personalização
- **Notificações**: Configurações de alertas
- **Segurança**: Configurações de segurança
- **Integrações**: Integrações externas
- **Formulários**: Gerenciamento de formulários
- **Webhooks**: Configuração de webhooks

### 11. **Webhooks** (`/config` - seção Webhooks)
**Funcionalidades:**
- Criação de webhooks
- Tokens únicos para autenticação
- Ativação/desativação
- Endpoint de recebimento: `/api/webhooks/receive/[token]`

**API:**
- `GET /api/webhooks` - Listar webhooks
- `POST /api/webhooks` - Criar webhook
- `GET /api/webhooks/[id]` - Obter webhook
- `PUT /api/webhooks/[id]` - Atualizar webhook
- `DELETE /api/webhooks/[id]` - Deletar webhook
- `POST /api/webhooks/receive/[token]` - Receber webhook

### 12. **Relatórios** (`/relatorios`)
**Funcionalidades:**
- Relatórios de tickets
- Estatísticas de projetos
- Métricas de desempenho
- Exportação de dados

### 13. **Histórico** (`/history`)
**Funcionalidades:**
- Histórico de ações do sistema
- Auditoria de mudanças
- Rastreamento de atividades

### 14. **Chat/Audio** (`/api/chat`)
**Funcionalidades:**
- Sistema de chat
- Transcrição de áudio
- Processamento de mensagens

**API:**
- `POST /api/chat` - Enviar mensagem
- `POST /api/chat/audio` - Processar áudio

---

## 🔐 Segurança

### Autenticação
- JWT em cookies HTTP-only
- Hash de senhas com bcryptjs
- Verificação de token em todas as rotas protegidas
- Middleware de autenticação (`getAuthenticatedUser`)

### Criptografia
- Cofre de senhas com criptografia (`src/lib/encryption.ts`)
- Arquivos podem ser criptografados
- Chaves de criptografia configuráveis

### Validação
- Validação de dados de entrada
- Sanitização de inputs
- Proteção contra SQL injection (via Prisma)
- Validação de tipos TypeScript

---

## 📁 Estrutura de Arquivos

```
ROOTDESK/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx           # Página de login
│   │   ├── layout.tsx         # Layout raiz
│   │   ├── home/              # Dashboard
│   │   ├── tickets/           # Gestão de tickets
│   │   ├── projetos/          # Gestão de projetos
│   │   ├── agenda/            # Calendário/Agenda
│   │   ├── users/             # Gestão de usuários
│   │   ├── profile/           # Perfil do usuário
│   │   ├── config/            # Configurações
│   │   ├── base/              # Base de conhecimento
│   │   ├── aprovacoes/        # Aprovações
│   │   ├── relatorios/        # Relatórios
│   │   ├── history/           # Histórico
│   │   └── api/               # API Routes
│   │       ├── login/
│   │       ├── logout/
│   │       ├── session/
│   │       ├── users/
│   │       ├── tickets/
│   │       ├── projects/
│   │       ├── events/
│   │       ├── forms/
│   │       ├── approvals/
│   │       ├── base/
│   │       ├── profile/
│   │       ├── webhooks/
│   │       ├── chat/
│   │       └── health/
│   ├── lib/                    # Bibliotecas utilitárias
│   │   ├── auth.ts            # Autenticação JWT
│   │   ├── prisma.ts          # Cliente Prisma
│   │   ├── encryption.ts      # Criptografia
│   │   ├── notifications.ts   # Notificações
│   │   ├── projectProgress.ts # Cálculo de progresso
│   │   ├── slug.ts            # Geração de slugs
│   │   └── sounds.ts          # Sons do sistema
│   ├── components/             # Componentes React
│   │   └── NotificationBell.tsx
│   ├── ui/                     # Componentes UI
│   │   ├── AppHeader.tsx
│   │   ├── GlobalStyles.ts
│   │   └── SettingsSideMenu.tsx
│   └── generated/              # Código gerado
│       └── prisma/             # Prisma Client
├── prisma/
│   └── schema.prisma          # Schema do banco
├── scripts/                    # Scripts utilitários
│   ├── check-db.ts
│   ├── seed-default-user.ts
│   └── generate-encryption-key.js
├── docs/                       # Documentação
│   ├── system-audit.md
│   ├── ENCRYPTION.md
│   ├── AUDIO_TRANSCRIPTION.md
│   └── settings.md
├── public/                     # Arquivos estáticos
│   ├── uploads/               # Uploads de usuários
│   └── icon.png
├── docker-compose.yml          # Configuração Docker
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🚀 Funcionalidades Principais por Módulo

### Dashboard (`/home`)
- Visão geral do sistema
- Cards com estatísticas
- Acesso rápido aos módulos principais
- Navegação lateral com menu

### Tickets
- ✅ Criação, edição, exclusão
- ✅ Atribuição de responsáveis
- ✅ Categorização
- ✅ Agendamento
- ✅ Histórico de atualizações
- ✅ Vinculação a projetos
- ✅ Status workflow completo

### Projetos
- ✅ Gestão completa de projetos
- ✅ Membros do projeto
- ✅ Tarefas hierárquicas (subtarefas)
- ✅ Progresso automático
- ✅ Prioridades e status
- ✅ Deadlines
- ✅ Integração com agenda

### Agenda
- ✅ Calendário mensal
- ✅ Eventos personalizados
- ✅ Deadlines automáticas de projetos
- ✅ Deadlines automáticas de tarefas
- ✅ Tickets agendados
- ✅ Filtros e visualizações

### Formulários
- ✅ Formulários dinâmicos
- ✅ Múltiplos tipos de campos
- ✅ Sistema de aprovação
- ✅ Geração automática de tickets
- ✅ URLs públicas

### Base de Conhecimento
- ✅ Documentos
- ✅ Arquivos
- ✅ Cofre de senhas
- ✅ Categorização
- ✅ Busca

### Usuários
- ✅ CRUD completo
- ✅ Perfis
- ✅ Permissões (estrutura preparada)

---

## 🔄 Integrações e Fluxos

### Fluxo de Formulário → Ticket
1. Usuário preenche formulário público
2. Submissão criada
3. Se requer aprovação → vai para `/aprovacoes`
4. Após aprovação → ticket criado automaticamente
5. Ticket vinculado à submissão

### Fluxo de Projeto → Agenda
1. Projeto criado com `endDate`
2. Deadline aparece automaticamente na agenda dos membros
3. Tarefas com `dueDate` também aparecem
4. Atualização automática quando datas mudam

### Fluxo de Tarefa → Progresso
1. Tarefa criada/atualizada
2. Progresso do projeto recalculado automaticamente
3. Baseado em tarefas de nível superior concluídas
4. Atualização em tempo real na UI

---

## 📈 Métricas e Estatísticas

### Banco de Dados
- **11 modelos principais** (User, Ticket, Project, Form, etc.)
- **Múltiplos enums** para status e tipos
- **Relacionamentos complexos** entre entidades
- **Índices otimizados** para performance

### API
- **50+ endpoints** REST
- **Autenticação** em todas as rotas protegidas
- **Validação** de dados
- **Tratamento de erros** padronizado

### Frontend
- **13 páginas principais**
- **Styled Components** para UI moderna
- **Responsive design**
- **Navegação intuitiva**

---

## 🛠️ Scripts e Comandos

```bash
# Desenvolvimento
npm run dev              # Inicia servidor de desenvolvimento
npm run dev:watch        # Dev + logs do Docker

# Docker
npm run docker:up        # Sobe MariaDB
npm run docker:down      # Para e remove volumes
npm run docker:logs      # Logs do MariaDB

# Banco de Dados
npm run db:push          # Sincroniza schema (dev)
npm run db:migrate       # Cria migrações (dev)
npm run db:deploy        # Aplica migrações (prod)
npm run db:generate      # Gera Prisma Client
npm run db:studio        # Abre Prisma Studio

# Testes
npm test                 # Executa testes
npm run lint             # Linter
```

---

## 🔮 Funcionalidades Futuras (Estrutura Preparada)

### Permissões
- Modelo `Permission` e `UserPermission` no schema
- Estrutura preparada para sistema de permissões granular
- Função `hasPermission` pode ser implementada

### Notificações
- Biblioteca `src/lib/notifications.ts` preparada
- Sistema de notificações em tempo real
- Componente `NotificationBell` implementado

### Chat/Audio
- Endpoints de chat e transcrição de áudio
- Estrutura para integração com IA

---

## 📝 Observações Importantes

### Correções Recentes
1. **Fuso horário em deadlines**: Corrigido problema de datas aparecendo no dia anterior
2. **Progresso automático**: Implementado cálculo baseado em tarefas
3. **Integração agenda-projetos**: Deadlines aparecem automaticamente
4. **Z-index de modais**: Corrigido para aparecerem acima de outros elementos

### Melhorias de UI
- Design moderno e profissional
- Animações e transições suaves
- Responsive design
- Feedback visual para ações do usuário

---

## 🎯 Conclusão

O **RootDesk** é um sistema completo e robusto, com funcionalidades abrangentes para gestão de suporte técnico, projetos, formulários e muito mais. A arquitetura é escalável, o código é bem organizado e o sistema está pronto para uso em produção.

**Pontos fortes:**
- ✅ Arquitetura moderna (Next.js App Router)
- ✅ TypeScript para type safety
- ✅ Banco de dados bem estruturado
- ✅ API REST completa
- ✅ UI moderna e responsiva
- ✅ Segurança implementada
- ✅ Integrações automáticas entre módulos

**Áreas de melhoria futura:**
- Sistema de permissões granular
- Notificações em tempo real
- Dashboard com mais métricas
- Exportação de relatórios em PDF/Excel
- API GraphQL (opcional)

---

**Última atualização**: Dezembro 2024
**Versão do sistema**: 0.1.0





