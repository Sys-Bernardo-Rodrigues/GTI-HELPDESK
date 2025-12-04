# RootDesk – Sistema de Helpdesk

Sistema completo de helpdesk desenvolvido com Next.js, TypeScript, Prisma e suporte para MariaDB/PostgreSQL. Inclui assistente virtual (Dobby) com suporte a IA local via Ollama.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Requisitos do Sistema](#requisitos-do-sistema)
- [Instalação em Novo Servidor](#instalação-em-novo-servidor)
  - [Opção 1: Instalação com Docker (Recomendado)](#opção-1-instalação-com-docker-recomendado)
  - [Opção 2: Instalação Nativa](#opção-2-instalação-nativa)
- [Configuração Inicial](#configuração-inicial)
- [Execução](#execução)
- [Configuração Adicional](#configuração-adicional)
- [Scripts Disponíveis](#scripts-disponíveis)
- [Troubleshooting](#troubleshooting)
- [Documentação Adicional](#documentação-adicional)

---

## Visão Geral

O **RootDesk** é um sistema completo de helpdesk que oferece:

- ✅ Gestão de tickets e categorias
- ✅ Sistema de autenticação seguro (JWT)
- ✅ Assistente virtual (Dobby) com IA local (Ollama)
- ✅ Gestão de formulários personalizados
- ✅ Sistema de webhooks
- ✅ Vault de senhas criptografado
- ✅ Gestão de documentos e arquivos
- ✅ Sistema de notificações por email
- ✅ Interface moderna e responsiva

---

## Requisitos do Sistema

### Mínimos

- **Sistema Operacional**: Linux (Ubuntu 20.04+, Debian 11+, ou similar) / Windows Server / macOS
- **Node.js**: 18.x ou superior (recomendado 20.x LTS)
- **Memória RAM**: 2 GB (mínimo), 4 GB (recomendado)
- **Espaço em Disco**: 10 GB livres
- **Processador**: 2 cores (mínimo), 4 cores (recomendado)

### Para IA Local (Ollama - Opcional)

- **RAM Adicional**: +8 GB (para modelos básicos como llama3:8b)
- **Espaço Adicional**: +10 GB (para modelos de IA)

### Software Necessário

#### Se usar Docker (Opção 1):
- Docker Engine 20.10+
- Docker Compose 2.0+

#### Se usar instalação nativa (Opção 2):
- MariaDB 10.6+ ou PostgreSQL 13+ (ou MySQL 8.0+)
- Servidor de banco de dados configurado e acessível

---

## Instalação em Novo Servidor

Escolha uma das opções abaixo conforme sua preferência:

### Opção 1: Instalação com Docker (Recomendado)

Esta opção é mais simples e recomendada para a maioria dos casos, pois gerencia automaticamente o banco de dados e o Ollama via containers Docker.

#### 1.1. Preparar o Servidor

```bash
# Atualizar o sistema (Ubuntu/Debian)
sudo apt update && sudo apt upgrade -y

# Instalar dependências básicas
sudo apt install -y curl git build-essential

# Instalar Node.js 20.x LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar instalação
node --version  # Deve mostrar v20.x ou superior
npm --version   # Deve mostrar 10.x ou superior
```

#### 1.2. Instalar Docker e Docker Compose

```bash
# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Adicionar seu usuário ao grupo docker (para não precisar usar sudo)
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verificar instalação
docker --version
docker compose version

# IMPORTANTE: Faça logout e login novamente para o grupo docker ter efeito
# Ou execute: newgrp docker
```

#### 1.3. Clonar o Repositório

```bash
# Criar diretório para aplicações
sudo mkdir -p /opt/rootdesk
sudo chown $USER:$USER /opt/rootdesk

# Clonar o repositório (ou baixar e extrair o código)
cd /opt/rootdesk
git clone https://github.com/seu-usuario/rootdesk.git .
# OU, se você já tem o código localmente:
# scp -r /caminho/local/rootdesk user@servidor:/opt/rootdesk
```

#### 1.4. Instalar Dependências do Node.js

```bash
cd /opt/rootdesk

# Instalar dependências
npm install
```

#### 1.5. Configurar Variáveis de Ambiente

```bash
# Copiar arquivo de exemplo
cp env.example .env

# Editar o arquivo .env
nano .env  # ou use seu editor preferido (vim, code, etc.)
```

Configure pelo menos estas variáveis essenciais:

```env
# Configuração Docker
USE_DOCKER_DB=true
USE_DOCKER_OLLAMA=true

# Banco de Dados (será usado pelo Docker)
DB_HOST=localhost
DB_USER=rootdesk_user
DB_PASSWORD=senha_forte_aqui
DB_NAME=rootdesk
DB_ROOT_PASSWORD=senha_root_forte_aqui
DB_PORT=3306

# Autenticação (GERAR UMA CHAVE FORTE!)
AUTH_SECRET=gerar-chave-aleatoria-com-openssl-rand-base64-32-minimo-32-chars

# Usuário Administrador Padrão
DEFAULT_USER_EMAIL=admin@seudominio.com
DEFAULT_USER_PASSWORD=senha_admin_forte
DEFAULT_USER_NAME=Administrador

# URLs do Sistema
APP_URL=http://seu-servidor.com
NEXT_PUBLIC_APP_URL=http://seu-servidor.com
PUBLIC_APP_URL=http://seu-servidor.com
NODE_ENV=production

# Criptografia (GERAR UMA CHAVE!)
ENCRYPTION_KEY=gerar-chave-hex-64-chars-node-scripts-generate-encryption-key-js
```

**Gerar chaves seguras:**

```bash
# Gerar AUTH_SECRET
openssl rand -base64 32

# Gerar ENCRYPTION_KEY
node scripts/generate-encryption-key.js
```

#### 1.6. Iniciar Serviços Docker

```bash
# Subir banco de dados MariaDB e Ollama
npm run docker:up

# Verificar se os containers estão rodando
docker ps

# Ver logs (se necessário)
npm run docker:logs
```

#### 1.7. Configurar Banco de Dados

```bash
# Gerar cliente Prisma
npm run db:generate

# Aplicar schema do banco de dados
npm run db:push

# Ou, para usar migrações versionadas:
# npm run db:migrate
```

#### 1.8. Baixar Modelo de IA (Opcional)

Se você habilitou o Ollama via Docker:

```bash
# Baixar modelo de IA (llama3:8b é recomendado)
docker exec -it rootdesk-ollama ollama pull llama3:8b

# Configurar no .env
# LOCAL_AI_ENABLED=true
# LOCAL_AI_URL=http://localhost:11434
# LOCAL_AI_MODEL=llama3:8b
```

#### 1.9. Build da Aplicação

```bash
# Fazer build para produção
npm run build
```

#### 1.10. Iniciar o Servidor

```bash
# Iniciar em produção
npm start
```

O servidor estará disponível em `http://seu-servidor:3000` (ou a porta configurada).

---

### Opção 2: Instalação Nativa

Use esta opção se preferir instalar o banco de dados diretamente no sistema operacional.

#### 2.1. Preparar o Servidor

Siga os passos [1.1](#11-preparar-o-servidor) e [1.2](#12-instalar-docker-e-docker-compose) da Opção 1 (ou pule o Docker se não for usar).

#### 2.2. Instalar MariaDB/PostgreSQL

**Para MariaDB (Ubuntu/Debian):**

```bash
# Instalar MariaDB
sudo apt install -y mariadb-server

# Configurar MariaDB
sudo mysql_secure_installation

# Criar banco de dados e usuário
sudo mysql -u root -p

# No prompt do MySQL, execute:
CREATE DATABASE rootdesk CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'rootdesk_user'@'localhost' IDENTIFIED BY 'senha_forte_aqui';
GRANT ALL PRIVILEGES ON rootdesk.* TO 'rootdesk_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

**Para PostgreSQL:**

```bash
# Instalar PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Criar banco e usuário
sudo -u postgres psql

# No prompt do PostgreSQL, execute:
CREATE DATABASE rootdesk;
CREATE USER rootdesk_user WITH PASSWORD 'senha_forte_aqui';
GRANT ALL PRIVILEGES ON DATABASE rootdesk TO rootdesk_user;
\q
```

#### 2.3. Clonar e Configurar

Siga os passos [1.3](#13-clonar-o-repositório) e [1.4](#14-instalar-dependências-do-nodejs) da Opção 1.

#### 2.4. Configurar Variáveis de Ambiente

No arquivo `.env`, configure:

```env
# Configuração Docker
USE_DOCKER_DB=false
USE_DOCKER_OLLAMA=false  # ou true se quiser Ollama via Docker

# Banco de Dados (conexão nativa)
DB_HOST=localhost
DB_USER=rootdesk_user
DB_PASSWORD=senha_forte_aqui
DB_NAME=rootdesk
DB_PORT=3306  # ou 5432 para PostgreSQL

# Para MariaDB/MySQL:
DATABASE_URL="mysql://rootdesk_user:senha_forte_aqui@localhost:3306/rootdesk?schema=public"

# Para PostgreSQL:
# DATABASE_URL="postgresql://rootdesk_user:senha_forte_aqui@localhost:5432/rootdesk?schema=public"

# ... outras configurações como na Opção 1 ...
```

#### 2.5. Configurar Banco de Dados

```bash
# Gerar cliente Prisma
npm run db:generate

# Aplicar schema
npm run db:push
```

#### 2.6. Instalar Ollama (Opcional - Nativo)

Se você não usar Docker para o Ollama, siga o guia completo em [`docs/INSTALACAO_OLLAMA.md`](docs/INSTALACAO_OLLAMA.md).

#### 2.7. Build e Iniciar

Siga os passos [1.9](#19-build-da-aplicação) e [1.10](#110-iniciar-o-servidor) da Opção 1.

---

## Configuração Inicial

### 1. Configurar Email (SMTP)

Edite o arquivo `.env` e configure:

```env
EMAIL_ENABLED=true
SMTP_HOST=smtp.gmail.com  # ou seu servidor SMTP
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-email@exemplo.com
SMTP_PASSWORD=sua-senha-ou-app-password
EMAIL_FROM=noreply@seudominio.com
EMAIL_FROM_NAME=RootDesk
```

**Para Gmail:**
1. Ative verificação em duas etapas
2. Crie uma "Senha de App": https://myaccount.google.com/apppasswords
3. Use a senha de app no `SMTP_PASSWORD`

### 2. Acessar o Sistema

1. Acesse `http://seu-servidor:3000`
2. Faça login com as credenciais configuradas em `DEFAULT_USER_EMAIL` e `DEFAULT_USER_PASSWORD`
3. Altere a senha padrão imediatamente após o primeiro acesso

### 3. Configurar Proxy Reverso (Recomendado para Produção)

Use Nginx ou Apache para servir o sistema em uma porta padrão (80/443) com SSL:

**Exemplo Nginx:**

```nginx
server {
    listen 80;
    server_name seu-servidor.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Para SSL com Let's Encrypt:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d seu-servidor.com
```

---

## Execução

### Desenvolvimento

```bash
npm run dev
```

Acesse `http://localhost:3000`

### Produção

```bash
# Build
npm run build

# Iniciar
npm start
```

### Com PM2 (Recomendado para Produção)

```bash
# Instalar PM2 globalmente
sudo npm install -g pm2

# Iniciar aplicação
pm2 start npm --name "rootdesk" -- start

# Salvar configuração para iniciar no boot
pm2 save
pm2 startup

# Ver logs
pm2 logs rootdesk

# Ver status
pm2 status

# Reiniciar
pm2 restart rootdesk

# Parar
pm2 stop rootdesk
```

---

## Configuração Adicional

### Configurar IA Local (Ollama)

Veja o guia completo: [`docs/INSTALACAO_OLLAMA.md`](docs/INSTALACAO_OLLAMA.md)

Resumo rápido:

```env
LOCAL_AI_ENABLED=true
LOCAL_AI_URL=http://localhost:11434
LOCAL_AI_MODEL=llama3:8b
```

### Configurar Atualização Automática

```env
ALLOW_GIT_UPDATE=true
ALLOWED_REPO_URL=https://github.com/seu-usuario/rootdesk.git
```

### Permitir Edição de .env pela Interface

```env
ALLOW_ENV_EDIT=true
```

⚠️ **Atenção**: Use essas opções apenas em ambientes controlados!

---

## Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Inicia servidor de desenvolvimento com hot-reload |
| `npm run build` | Faz build da aplicação para produção |
| `npm run start` | Inicia servidor de produção |
| `npm run docker:up` | Sobe containers Docker (MariaDB + Ollama) |
| `npm run docker:down` | Para e remove containers Docker |
| `npm run docker:logs` | Mostra logs dos containers |
| `npm run db:generate` | Gera cliente Prisma |
| `npm run db:push` | Aplica schema no banco (desenvolvimento) |
| `npm run db:migrate` | Cria/aplica migrações versionadas |
| `npm run db:deploy` | Aplica migrações pendentes (produção) |
| `npm run db:studio` | Abre Prisma Studio (interface visual do banco) |

---

## Troubleshooting

### Problema: Porta 3000 já está em uso

```bash
# Verificar qual processo está usando a porta
sudo lsof -i :3000

# Matar o processo ou mudar a porta
# No Next.js, você pode definir: PORT=3001 npm start
```

### Problema: Erro de conexão com banco de dados

1. Verifique se o banco está rodando:
   - Docker: `docker ps | grep mariadb`
   - Nativo: `sudo systemctl status mariadb` ou `sudo systemctl status postgresql`

2. Verifique as credenciais no `.env`

3. Teste a conexão:
   ```bash
   npm run db:generate
   tsx scripts/check-db.ts
   ```

### Problema: Erro ao fazer build

```bash
# Limpar cache e node_modules
rm -rf .next node_modules package-lock.json
npm install
npm run build
```

### Problema: Ollama não responde

1. Verifique se está rodando:
   ```bash
   docker ps | grep ollama
   # ou, se nativo:
   curl http://localhost:11434/api/tags
   ```

2. Verifique `LOCAL_AI_URL` no `.env`

3. Veja logs: `docker logs rootdesk-ollama` (se Docker)

### Verificar Saúde do Sistema

Acesse: `http://seu-servidor:3000/api/health`

Deve retornar: `{"ok":true,"db":true,"durationMs":<tempo>}`

---

## Documentação Adicional

- 📖 [Guia de Instalação do Ollama](docs/INSTALACAO_OLLAMA.md) - Instalação e configuração do Ollama
- 📖 [Documentação do Sistema](docs/README.md) - Documentação técnica completa
- 📖 [Configurações](docs/settings.md) - Detalhes sobre configurações do sistema
- 📖 [Criptografia](docs/ENCRYPTION.md) - Sistema de criptografia de arquivos
- 📖 [Transcrição de Áudio](docs/AUDIO_TRANSCRIPTION.md) - Configuração de APIs de transcrição

---

## Suporte

Para mais informações, consulte:
- Issues no GitHub
- Documentação em `docs/`
- Logs do sistema

---

## Licença

[Especificar licença do projeto]

---

**Última atualização**: Janeiro 2025
