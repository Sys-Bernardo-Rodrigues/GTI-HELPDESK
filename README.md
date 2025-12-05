# RootDesk - Sistema de Helpdesk Profissional

[![Next.js](https://img.shields.io/badge/Next.js-16.0-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.18-2D3748)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/license-Private-red)]()

Sistema completo de helpdesk desenvolvido com Next.js, TypeScript e Prisma. Inclui gestão de tickets, formulários personalizados, assistente virtual com IA local, vault de senhas criptografado, webhooks, projetos e muito mais.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Características](#características)
- [Requisitos do Sistema](#requisitos-do-sistema)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Uso](#uso)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [API](#api)
- [Desenvolvimento](#desenvolvimento)
- [Troubleshooting](#troubleshooting)
- [Segurança](#segurança)
- [Licença](#licença)

---

## 🎯 Visão Geral

O **RootDesk** é uma solução completa de helpdesk que oferece:

- ✅ **Gestão de Tickets**: Sistema completo de tickets com categorias, status, atribuições e atualizações
- ✅ **Formulários Personalizados**: Crie formulários públicos com campos customizados e sistema de aprovação
- ✅ **Assistente Virtual (Dobby)**: IA local integrada via Ollama para respostas inteligentes
- ✅ **Vault de Senhas**: Armazenamento seguro e criptografado de credenciais
- ✅ **Base de Conhecimento**: Documentos e arquivos criptografados
- ✅ **Webhooks**: Integração com sistemas externos
- ✅ **Projetos e Tarefas**: Gestão completa de projetos com tarefas e subtarefas
- ✅ **Agenda e Eventos**: Sistema de calendário integrado
- ✅ **Relatórios**: Análises e estatísticas detalhadas
- ✅ **Autenticação Segura**: JWT com 2FA obrigatório
- ✅ **Perfis de Acesso**: Controle granular de permissões

---

## ✨ Características

### Gestão de Tickets
- Criação, edição e exclusão de tickets
- Categorização e filtros avançados
- Atribuição de responsáveis
- Agendamento de tickets
- Histórico completo de atualizações
- Notificações em tempo real

### Formulários Personalizados
- Criação de formulários públicos com slug único
- Campos customizados (texto, número, data, seleção, etc.)
- Sistema de aprovação multi-usuário
- Submissões vinculadas a tickets automaticamente
- Validação de campos obrigatórios

### Assistente Virtual (Dobby)
- Integração com Ollama para IA local
- Respostas contextuais baseadas em regras
- Ações automatizadas (criar tickets, buscar senhas, etc.)
- Transcrição de áudio (AssemblyAI, Deepgram, Google Speech)
- Feedback de qualidade das respostas

### Segurança
- Autenticação JWT com cookies seguros
- 2FA obrigatório para todos os usuários
- Criptografia AES-256-GCM para arquivos sensíveis
- Vault de senhas com criptografia
- Perfis de acesso granulares

### Base de Conhecimento
- Documentos e arquivos criptografados
- Upload e download seguro
- Preview de arquivos (PDF, imagens, etc.)
- Organização por categorias

---

## 💻 Requisitos do Sistema

### Mínimos
- **Sistema Operacional**: Linux (Ubuntu 20.04+, Debian 11+), Windows Server ou macOS
- **Node.js**: 18.x ou superior (recomendado 20.x LTS)
- **Memória RAM**: 2 GB (mínimo), 4 GB (recomendado)
- **Espaço em Disco**: 10 GB livres
- **Processador**: 2 cores (mínimo), 4 cores (recomendado)

### Para IA Local (Opcional)
- **RAM Adicional**: +8 GB (para modelos básicos como llama3:8b)
- **Espaço Adicional**: +10 GB (para modelos de IA)

### Software Necessário

#### Com Docker (Recomendado)
- Docker Engine 20.10+
- Docker Compose 2.0+

#### Sem Docker
- PostgreSQL 12+ (recomendado PostgreSQL 17+)
- Node.js 18+ e npm

---

## 🚀 Instalação

### Opção 1: Instalação com Docker (Recomendado)

1. **Clone o repositório**
```bash
git clone <repository-url>
cd GTI-HELPDESK
```

2. **Configure as variáveis de ambiente**
```bash
cp env.example .env
# Edite o .env com suas configurações
```

3. **Configure o banco de dados no .env**
```env
USE_DOCKER_DB=true
DB_HOST=localhost
DB_USER=helpdesk_user
DB_PASSWORD=helpdesk_password
DB_NAME=helpdesk
DB_PORT=5432
```

4. **Inicie os serviços Docker**
```bash
npm run docker:up
```

5. **Instale as dependências e configure o banco**
```bash
npm install
npm run predev
```

6. **Inicie o servidor de desenvolvimento**
```bash
npm run dev
```

O sistema estará disponível em `http://localhost:3000`

### Opção 2: Instalação Nativa

1. **Instale o PostgreSQL**
   - Linux: `sudo apt install postgresql postgresql-contrib`
   - macOS: `brew install postgresql@17`
   - Windows: Baixe de https://www.postgresql.org/download/

2. **Crie o banco de dados**
```sql
-- Conecte-se ao PostgreSQL como superusuário
sudo -u postgres psql

-- Execute os comandos:
CREATE DATABASE helpdesk;
CREATE USER helpdesk_user WITH PASSWORD 'helpdesk_password';
GRANT ALL PRIVILEGES ON DATABASE helpdesk TO helpdesk_user;
\q
```

3. **Configure o .env**
```bash
cp env.example .env
# Configure USE_DOCKER_DB=false e as credenciais do banco
```

4. **Instale e configure**
```bash
npm install
npm run predev
npm run dev
```

---

## ⚙️ Configuração

### Variáveis de Ambiente Essenciais

Copie `env.example` para `.env` e configure:

#### Banco de Dados
```env
DATABASE_URL="postgresql://user:password@localhost:5432/helpdesk?schema=public"
```

#### Autenticação
```env
AUTH_SECRET="sua-chave-secreta-minimo-32-caracteres"
# Gere com: openssl rand -base64 32
```

#### Usuário Padrão
```env
DEFAULT_USER_EMAIL=admin@example.com
DEFAULT_USER_PASSWORD=admin123
DEFAULT_USER_NAME=Administrador
```

#### Email (Opcional)
```env
EMAIL_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-email@gmail.com
SMTP_PASSWORD=sua-senha-de-app
EMAIL_FROM=noreply@rootdesk.com
```

#### IA Local - Ollama (Opcional)
```env
LOCAL_AI_ENABLED=true
LOCAL_AI_URL=http://localhost:11434
LOCAL_AI_MODEL=llama3:8b
```

#### Criptografia
```env
ENCRYPTION_KEY="sua-chave-de-64-caracteres-hexadecimais"
# Gere com: node scripts/generate-encryption-key.js
# ou: openssl rand -hex 32
```

### Configuração do Ollama

Se desejar usar IA local:

1. **Instale o Ollama** (se não usar Docker)
   - Linux: `curl -fsSL https://ollama.com/install.sh | sh`
   - Windows: Baixe de https://ollama.com
   - macOS: `brew install ollama`

2. **Baixe um modelo**
```bash
ollama pull llama3:8b
```

3. **Configure no .env**
```env
USE_DOCKER_OLLAMA=false  # se instalado nativamente
LOCAL_AI_ENABLED=true
LOCAL_AI_URL=http://localhost:11434
LOCAL_AI_MODEL=llama3:8b
```

---

## 📖 Uso

### Primeiro Acesso

1. Acesse `http://localhost:3000`
2. Faça login com as credenciais do usuário padrão configurado no `.env`
3. O sistema solicitará código 2FA (enviado por email se configurado)

### Principais Funcionalidades

#### Gestão de Tickets
- Acesse **Tickets** no menu lateral
- Crie novos tickets ou visualize existentes
- Filtre por status, categoria, responsável
- Atribua tickets a usuários
- Agende tickets para data futura

#### Formulários
- Acesse **Configurações > Formulários**
- Crie formulários personalizados
- Configure campos e aprovadores
- Compartilhe o link público (slug)
- Aprove ou rejeite submissões

#### Base de Conhecimento
- Acesse **Base de Conhecimento**
- Adicione documentos e arquivos
- Organize por categorias
- Busque conteúdo criptografado

#### Assistente Virtual
- Acesse o chat na página inicial
- Faça perguntas ao Dobby
- Use comandos de voz (se configurado)
- Receba respostas inteligentes

---

## 📁 Estrutura do Projeto

```
GTI-HELPDESK/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # Rotas da API
│   │   ├── home/               # Dashboard principal
│   │   ├── tickets/            # Gestão de tickets
│   │   ├── forms/              # Formulários públicos
│   │   ├── base/               # Base de conhecimento
│   │   ├── projetos/           # Gestão de projetos
│   │   ├── agenda/             # Calendário e eventos
│   │   ├── relatorios/         # Relatórios e estatísticas
│   │   ├── config/             # Configurações do sistema
│   │   ├── profile/            # Perfil do usuário
│   │   └── users/              # Gestão de usuários
│   ├── components/             # Componentes React reutilizáveis
│   ├── lib/                    # Bibliotecas e utilitários
│   │   ├── auth.ts             # Autenticação JWT
│   │   ├── prisma.ts           # Cliente Prisma
│   │   ├── encryption.ts      # Criptografia
│   │   ├── email.ts            # Envio de emails
│   │   └── localAi.ts          # Integração Ollama
│   ├── ui/                     # Componentes de UI
│   └── generated/              # Código gerado (Prisma)
├── prisma/
│   └── schema.prisma           # Schema do banco de dados
├── scripts/                     # Scripts utilitários
├── public/                     # Arquivos estáticos
├── docker-compose.yml           # Configuração Docker
├── package.json                # Dependências
└── .env                        # Variáveis de ambiente (não versionado)
```

---

## 🔌 API

### Autenticação

#### Login
```http
POST /api/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password",
  "twoFactorCode": "123456"
}
```

#### Verificar Sessão
```http
GET /api/session
```

### Tickets

#### Listar Tickets
```http
GET /api/tickets
```

#### Criar Ticket
```http
POST /api/tickets
Content-Type: application/json

{
  "title": "Novo Ticket",
  "description": "Descrição do problema",
  "categoryId": 1
}
```

#### Atualizar Ticket
```http
PUT /api/tickets/[id]
Content-Type: application/json

{
  "status": "IN_PROGRESS",
  "assignedToId": 2
}
```

### Formulários

#### Listar Formulários
```http
GET /api/forms
```

#### Criar Formulário
```http
POST /api/forms
Content-Type: application/json

{
  "title": "Formulário de Contato",
  "description": "Descrição",
  "isPublic": true,
  "fields": [
    {
      "label": "Nome",
      "type": "TEXT",
      "required": true
    }
  ]
}
```

#### Submeter Formulário (Público)
```http
POST /api/forms/[id]/submit
Content-Type: application/json

{
  "data": {
    "campo1": "valor1"
  }
}
```

### Webhooks

#### Criar Webhook
```http
POST /api/webhooks
Content-Type: application/json

{
  "name": "Meu Webhook",
  "description": "Descrição",
  "link": "https://exemplo.com/webhook"
}
```

#### Receber Webhook
```http
POST /api/webhooks/receive/[token]
Content-Type: application/json

{
  "title": "Título do Ticket",
  "description": "Descrição"
}
```

---

## 🛠️ Desenvolvimento

### Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev              # Inicia servidor de desenvolvimento
npm run dev:watch       # Inicia com logs do Docker

# Build e Produção
npm run build           # Build de produção
npm run start           # Inicia servidor de produção

# Banco de Dados
npm run db:migrate      # Cria migração
npm run db:deploy       # Aplica migrações (produção)
npm run db:generate     # Gera cliente Prisma
npm run db:push         # Sincroniza schema (desenvolvimento)
npm run db:studio       # Abre Prisma Studio

# Docker
npm run docker:up       # Inicia containers
npm run docker:down     # Para containers
npm run docker:logs     # Visualiza logs

# Testes
npm run test            # Executa testes
npm run lint            # Verifica código
```

### Estrutura de Desenvolvimento

1. **Banco de Dados**: Use `prisma db push` para desenvolvimento rápido
2. **Migrações**: Use `prisma migrate dev` para criar migrações formais
3. **Tipos**: O Prisma gera tipos TypeScript automaticamente em `src/generated/prisma`

### Adicionando Novas Funcionalidades.

1. **Criar Modelo no Prisma**
   - Edite `prisma/schema.prisma`
   - Execute `npm run db:generate`

2. **Criar Rotas da API**
   - Adicione arquivos em `src/app/api/[rota]/route.ts`
   - Use `getAuthenticatedUser()` para autenticação

3. **Criar Páginas**
   - Adicione em `src/app/[rota]/page.tsx`
   - Use `StandardLayout` para layout consistente

---

## 🔧 Troubleshooting

### Problemas de Conexão com Banco

1. **Verifique se o banco está rodando**
```bash
npm run docker:logs
# ou
psql -U helpdesk_user -d helpdesk -h localhost
```

2. **Teste a conexão**
```bash
npm run db:generate
tsx scripts/check-db.ts
```

3. **Verifique as variáveis de ambiente**
```bash
cat .env | grep DATABASE
```

### Problemas com Prisma

1. **Regenere o cliente**
```bash
npm run db:generate
```

2. **Sincronize o schema**
```bash
npm run db:push
```

### Problemas com IA Local

1. **Verifique se o Ollama está rodando**
```bash
curl http://localhost:11434/api/tags
```

2. **Verifique se o modelo está instalado**
```bash
ollama list
```

3. **Teste o modelo**
```bash
ollama run llama3:8b "Olá"
```

### Erros de Criptografia

1. **Gere uma nova chave**
```bash
node scripts/generate-encryption-key.js
```

2. **Atualize o .env**
```env
ENCRYPTION_KEY="nova-chave-gerada"
```

---

## 🔒 Segurança

### Boas Práticas

1. **Produção**
   - Use `AUTH_SECRET` forte (mínimo 32 caracteres)
   - Use `ENCRYPTION_KEY` gerada aleatoriamente
   - Configure HTTPS
   - Desabilite `ALLOW_GIT_UPDATE` e `ALLOW_ENV_EDIT`
   - Use senhas fortes para o banco de dados

2. **Autenticação**
   - 2FA é obrigatório para todos os usuários
   - Tokens JWT expiram automaticamente
   - Cookies são httpOnly e secure em produção

3. **Criptografia**
   - Arquivos sensíveis são criptografados com AES-256-GCM
   - Chave de criptografia deve ser guardada com segurança
   - Perda da chave = perda permanente dos dados

4. **Banco de Dados**
   - Use usuário com privilégios mínimos necessários
   - Configure firewall adequadamente
   - Faça backups regulares

---

## 📝 Licença

Este projeto é privado e proprietário. Todos os direitos reservados.

---

## 🤝 Suporte

Para suporte, entre em contato com a equipe de desenvolvimento.

---

**Desenvolvido com ❤️ usando Next.js, TypeScript e Prisma**

