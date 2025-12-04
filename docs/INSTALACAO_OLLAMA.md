# Instalação do Ollama para o RootDesk

Este guia explica como instalar e configurar o Ollama no servidor onde o RootDesk está hospedado, permitindo que o **Dobby assistente virtual (Beta)** utilize modelos de Inteligência Artificial locais.

## Índice

1. [O que é o Ollama?](#o-que-é-o-ollama)
2. [Requisitos de Sistema](#requisitos-de-sistema)
3. [Instalação](#instalação)
   - [Método 1: Instalação Nativa (Linux)](#método-1-instalação-nativa-linux)
   - [Método 2: Docker (Recomendado)](#método-2-docker-recomendado)
   - [Método 3: Instalação Nativa (Windows)](#método-3-instalação-nativa-windows)
   - [Método 4: Instalação Nativa (macOS)](#método-4-instalação-nativa-macos)
4. [Download de Modelos](#download-de-modelos)
5. [Configuração no RootDesk](#configuração-no-rootdesk)
6. [Teste e Verificação](#teste-e-verificação)
7. [Manutenção e Atualização](#manutenção-e-atualização)
8. [Troubleshooting](#troubleshooting)
9. [Segurança e Produção](#segurança-e-produção)

---

## O que é o Ollama?

O **Ollama** é uma ferramenta que permite executar modelos de linguagem grandes (LLMs) localmente no seu servidor. No contexto do RootDesk, ele é usado pelo **Dobby assistente virtual (Beta)** para:

- Processar e responder perguntas dos usuários
- Humanizar respostas automáticas
- Garantir que **nenhum dado saia do servidor interno** (privacidade total)
- Funcionar sem depender de serviços externos de IA

---

## Requisitos de Sistema

### Requisitos Mínimos

- **RAM**: 8 GB (para modelos menores como `llama3:8b`)
- **Espaço em disco**: 10 GB livres (para o Ollama + modelos)
- **CPU**: Processador x86_64 ou ARM64

### Requisitos Recomendados

- **RAM**: 16 GB ou mais (para modelos maiores ou múltiplos modelos)
- **Espaço em disco**: 50 GB livres (para vários modelos)
- **CPU**: Processador multi-core com suporte a instruções modernas
- **GPU**: Opcional, mas acelera significativamente o processamento (NVIDIA com CUDA, AMD com ROCm, ou Apple Silicon)

### Modelos Recomendados

| Modelo | Tamanho | RAM Mínima | Uso |
|--------|---------|------------|-----|
| `llama3:8b` | ~4.7 GB | 8 GB | **Recomendado para produção** |
| `llama3:70b` | ~40 GB | 64 GB | Alta qualidade, requer muito recurso |
| `mistral:7b` | ~4.1 GB | 8 GB | Alternativa leve |
| `codellama:7b` | ~3.8 GB | 8 GB | Boa para código |
| `phi3:mini` | ~2.3 GB | 4 GB | Muito leve, qualidade menor |

**Para a maioria dos casos, recomendamos `llama3:8b`** por oferecer um bom equilíbrio entre qualidade e recursos necessários.

---

## Instalação

Escolha o método de instalação que melhor se adequa ao seu ambiente:

### Método 1: Instalação Nativa (Linux)

Este é o método mais direto para servidores Linux.

#### 1.1. Baixar e Instalar

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

Este script detecta automaticamente sua distribuição Linux e instala o Ollama.

#### 1.2. Iniciar o Serviço

Após a instalação, o Ollama geralmente inicia automaticamente como serviço. Para verificar:

```bash
# Verificar status do serviço
sudo systemctl status ollama

# Se não estiver rodando, iniciar manualmente
sudo systemctl start ollama

# Habilitar para iniciar automaticamente no boot
sudo systemctl enable ollama
```

#### 1.3. Verificar Instalação

```bash
# Verificar versão
ollama --version

# Listar modelos instalados (deve estar vazio inicialmente)
ollama list
```

---

### Método 2: Docker (Recomendado)

Este método é **recomendado** por ser mais fácil de gerenciar e isolar, especialmente se você já usa Docker no servidor.

#### 2.1. Usando o docker-compose.yml do RootDesk

O RootDesk já vem com uma configuração do Ollama no `docker-compose.yml`. Para usar:

1. **Adicione a variável no `.env`** (opcional, se quiser mudar a porta):

```env
LOCAL_AI_PORT=11434
```

2. **Subir o serviço Ollama**:

```bash
# Subir apenas o Ollama (se já tiver o Docker Compose configurado)
docker compose up -d ollama

# Ou, se preferir subir tudo de uma vez
docker compose up -d
```

3. **Verificar se está rodando**:

```bash
# Ver logs
docker compose logs ollama

# Verificar status
docker ps | grep ollama
```

#### 2.2. Instalação Manual via Docker

Se preferir instalar o Ollama via Docker independentemente:

```bash
# Baixar e executar o Ollama
docker run -d \
  --name rootdesk-ollama \
  --restart unless-stopped \
  -p 11434:11434 \
  -v ollama_data:/root/.ollama \
  ollama/ollama:latest

# Verificar logs
docker logs rootdesk-ollama

# Verificar se está respondendo
curl http://localhost:11434/api/tags
```

**Nota**: O volume `ollama_data` armazena os modelos baixados. Se precisar de mais espaço, você pode mapear para um diretório específico:

```bash
docker run -d \
  --name rootdesk-ollama \
  --restart unless-stopped \
  -p 11434:11434 \
  -v /caminho/para/seus/modelos:/root/.ollama \
  ollama/ollama:latest
```

---

### Método 3: Instalação Nativa (Windows)

Para servidores Windows:

1. **Baixe o instalador** em: https://ollama.com/download/OllamaSetup.exe

2. **Execute o instalador** e siga as instruções na tela.

3. **O Ollama será instalado como serviço** e iniciará automaticamente.

4. **Verifique** abrindo um PowerShell:

```powershell
ollama --version
ollama list
```

---

### Método 4: Instalação Nativa (macOS)

Para servidores macOS:

1. **Baixe o instalador** em: https://ollama.com/download/mac

2. **Arraste o Ollama.app** para a pasta Applications.

3. **Execute o Ollama.app** pela primeira vez.

4. **O Ollama iniciará automaticamente** e ficará disponível em `http://localhost:11434`.

5. **Para iniciar automaticamente no login**, vá em:
   - Sistema > Preferências do Sistema > Usuários e Grupos > Itens de Login
   - Adicione o Ollama

---

## Download de Modelos

Após instalar o Ollama, você precisa baixar pelo menos um modelo para usar.

### Modelo Recomendado: llama3:8b

```bash
# Se instalou via método nativo (Linux/Windows/macOS)
ollama pull llama3:8b

# Se instalou via Docker
docker exec -it rootdesk-ollama ollama pull llama3:8b
```

Este processo pode levar alguns minutos, dependendo da sua conexão de internet. O modelo será baixado e armazenado localmente.

### Outros Modelos Disponíveis

```bash
# Listar modelos disponíveis (online)
# Visite: https://ollama.com/library

# Baixar outros modelos
ollama pull mistral:7b          # Alternativa leve
ollama pull codellama:7b        # Focado em código
ollama pull phi3:mini           # Muito leve (menor qualidade)

# Modelos maiores (requerem mais RAM)
ollama pull llama3:70b          # Alta qualidade (requer 64GB+ RAM)
ollama pull mistral:large       # Muito grande
```

### Verificar Modelos Instalados

```bash
# Listar modelos instalados
ollama list

# Saída esperada (exemplo):
# NAME            ID              SIZE    MODIFIED
# llama3:8b       1234567890ab    4.7 GB  2 hours ago
```

---

## Configuração no RootDesk

Após instalar o Ollama e baixar um modelo, configure o RootDesk para utilizá-lo.

### 1. Editar o arquivo `.env`

Abra o arquivo `.env` do RootDesk e configure as seguintes variáveis:

```env
# ============================================
# Inteligência Artificial Local (Ollama/LocalAI)
# ============================================
LOCAL_AI_ENABLED=true
LOCAL_AI_URL=http://localhost:11434
LOCAL_AI_MODEL=llama3:8b
LOCAL_AI_TIMEOUT_MS=15000
```

**Explicação das variáveis**:

- `LOCAL_AI_ENABLED`: Define se a IA local está habilitada (`true` ou `false`)
- `LOCAL_AI_URL`: URL do servidor Ollama (padrão: `http://localhost:11434`)
  - Se o Ollama estiver em outro servidor, use: `http://IP_DO_SERVIDOR:11434`
  - Se estiver em outro container Docker na mesma rede, use o nome do serviço: `http://rootdesk-ollama:11434`
- `LOCAL_AI_MODEL`: Nome do modelo a ser usado (deve corresponder ao nome listado em `ollama list`)
- `LOCAL_AI_TIMEOUT_MS`: Tempo máximo (em milissegundos) para aguardar resposta do modelo (padrão: 15000 = 15 segundos)

### 2. Configuração via Interface Web

Alternativamente, você pode configurar essas variáveis através da interface do RootDesk:

1. Acesse: `http://seu-servidor/config?section=env`
2. Navegue até a seção **"Inteligência Artificial Local"**
3. Preencha os campos:
   - `LOCAL_AI_ENABLED`: `true`
   - `LOCAL_AI_URL`: `http://localhost:11434` (ou a URL do seu servidor Ollama)
   - `LOCAL_AI_MODEL`: `llama3:8b` (ou o modelo que você baixou)
   - `LOCAL_AI_TIMEOUT_MS`: `15000`
4. Clique em **"Salvar configurações"**

**Nota**: Para usar a interface web, é necessário que `ALLOW_ENV_EDIT=true` no `.env`.

### 3. Reiniciar o RootDesk

Após alterar as configurações, reinicie o servidor do RootDesk:

```bash
# Se estiver usando PM2
pm2 restart rootdesk

# Se estiver usando systemd
sudo systemctl restart rootdesk

# Se estiver em desenvolvimento
# Pressione Ctrl+C e execute novamente:
npm run dev

# Ou, se estiver em produção
npm run build
npm run start
```

---

## Teste e Verificação

### 1. Testar o Ollama Diretamente

#### Via linha de comando:

```bash
# Testar o modelo diretamente
ollama run llama3:8b "Olá, como você está?"

# Ou, se estiver usando Docker
docker exec -it rootdesk-ollama ollama run llama3:8b "Olá!"
```

#### Via API HTTP:

```bash
# Testar a API do Ollama
curl http://localhost:11434/api/generate -d '{
  "model": "llama3:8b",
  "prompt": "Por que o céu é azul?",
  "stream": false
}'

# Listar modelos disponíveis via API
curl http://localhost:11434/api/tags
```

**Resposta esperada**: Você deve receber uma resposta do modelo em JSON.

### 2. Testar no RootDesk

1. **Acesse o RootDesk**: `http://seu-servidor/home`

2. **Abra o chat do Dobby**: Clique no ícone do assistente virtual na interface.

3. **Envie uma mensagem de teste**: Por exemplo, "Olá, você está funcionando?"

4. **Verifique a resposta**: 
   - Se o Ollama estiver configurado corretamente, o Dobby responderá usando o modelo local.
   - Se houver erro, o sistema usará um fallback determinístico.

### 3. Verificar Logs

#### Logs do Ollama:

```bash
# Se instalado nativamente (Linux)
sudo journalctl -u ollama -f

# Se instalado via Docker
docker compose logs -f ollama
# ou
docker logs -f rootdesk-ollama
```

#### Logs do RootDesk:

```bash
# Verificar logs do Node.js/Next.js
# Se estiver usando PM2:
pm2 logs rootdesk

# Se estiver rodando diretamente:
# Os logs aparecerão no console onde o servidor está rodando
```

Procure por mensagens como:
- `[local-ai]` - indica uso da IA local
- `[local-ai] Falha ao chamar modelo local` - indica erro na conexão

---

## Manutenção e Atualização

### Atualizar o Ollama

#### Instalação Nativa (Linux):

```bash
# Atualizar via script de instalação (sobrescreve a versão anterior)
curl -fsSL https://ollama.com/install.sh | sh

# Reiniciar o serviço
sudo systemctl restart ollama
```

#### Docker:

```bash
# Parar o container
docker compose stop ollama

# Atualizar a imagem
docker compose pull ollama

# Reiniciar o container
docker compose up -d ollama
```

### Atualizar Modelos

Os modelos são atualizados automaticamente quando você faz `ollama pull` novamente. Para atualizar um modelo existente:

```bash
# Atualizar o modelo (baixa a versão mais recente)
ollama pull llama3:8b

# Se estiver usando Docker
docker exec -it rootdesk-ollama ollama pull llama3:8b
```

### Remover Modelos Antigos

Para liberar espaço em disco:

```bash
# Listar modelos instalados
ollama list

# Remover um modelo
ollama rm nome-do-modelo:tag

# Exemplo:
ollama rm llama3:8b

# Se estiver usando Docker
docker exec -it rootdesk-ollama ollama rm nome-do-modelo:tag
```

### Limpar Cache do Ollama

```bash
# Limpar modelos não utilizados (cuidado: remove todos os modelos não referenciados)
ollama prune

# Se estiver usando Docker
docker exec -it rootdesk-ollama ollama prune
```

---

## Troubleshooting

### Problema: Ollama não inicia

**Sintomas**: O serviço não inicia ou para imediatamente.

**Soluções**:

```bash
# Verificar logs de erro
sudo journalctl -u ollama -n 50  # Linux nativo
docker logs rootdesk-ollama      # Docker

# Verificar se a porta 11434 está em uso
sudo netstat -tulpn | grep 11434
# ou
sudo lsof -i :11434

# Se a porta estiver em uso, pare o processo ou mude a porta no docker-compose.yml
```

### Problema: Modelo não responde ou demora muito

**Sintomas**: O Dobby não responde ou demora muito para responder.

**Soluções**:

1. **Verificar se o modelo está instalado**:

```bash
ollama list
# Deve mostrar o modelo configurado em LOCAL_AI_MODEL
```

2. **Aumentar o timeout no `.env`**:

```env
LOCAL_AI_TIMEOUT_MS=30000  # 30 segundos
```

3. **Verificar recursos do servidor**:

```bash
# Verificar uso de RAM
free -h

# Verificar uso de CPU
top
# ou
htop
```

4. **Testar o modelo diretamente**:

```bash
ollama run llama3:8b "Teste rápido"
```

### Problema: Erro de conexão do RootDesk com o Ollama

**Sintomas**: Logs mostram `[local-ai] Falha ao chamar modelo local` ou erro de conexão.

**Soluções**:

1. **Verificar se o Ollama está rodando**:

```bash
curl http://localhost:11434/api/tags
# Deve retornar JSON com lista de modelos
```

2. **Verificar a URL no `.env`**:

```env
# Se estiver no mesmo servidor
LOCAL_AI_URL=http://localhost:11434

# Se estiver em outro servidor/container
LOCAL_AI_URL=http://IP_DO_SERVIDOR:11434
# ou, se em rede Docker
LOCAL_AI_URL=http://rootdesk-ollama:11434
```

3. **Verificar firewall**:

```bash
# Se o Ollama estiver em outro servidor, garantir que a porta 11434 está aberta
sudo ufw allow 11434/tcp  # Ubuntu/Debian
# ou configure o firewall apropriado para sua distribuição
```

### Problema: Modelo muito lento

**Sintomas**: Respostas do Dobby demoram mais de 30 segundos.

**Soluções**:

1. **Usar um modelo menor**:

```bash
# Trocar para um modelo mais leve
ollama pull phi3:mini

# Atualizar no .env
LOCAL_AI_MODEL=phi3:mini
```

2. **Verificar se há GPU disponível**:

```bash
# NVIDIA GPU
nvidia-smi

# Se tiver GPU, o Ollama deve usá-la automaticamente
# Para forçar CPU apenas (se GPU estiver causando problemas):
export OLLAMA_NUM_GPU=0
```

3. **Aumentar recursos do servidor**: Considere aumentar a RAM ou usar um servidor mais potente.

### Problema: Espaço em disco insuficiente

**Sintomas**: Erro ao baixar modelos ou executar o Ollama.

**Soluções**:

```bash
# Verificar espaço disponível
df -h

# Limpar modelos não utilizados
ollama prune

# Mover dados do Ollama para outro disco (Docker):
# 1. Parar o container
docker compose stop ollama

# 2. Copiar dados
sudo cp -r /var/lib/docker/volumes/ollama_data /novo/caminho/

# 3. Atualizar docker-compose.yml para usar o novo caminho
```

---

## Segurança e Produção

### Recomendações para Ambiente de Produção

1. **Não exponha o Ollama na internet pública**:
   - O Ollama por padrão não tem autenticação
   - Mantenha-o apenas acessível localmente ou via rede interna

2. **Use firewall**:
   - Se o Ollama estiver em outro servidor, restrinja o acesso à porta 11434 apenas para o IP do servidor do RootDesk

3. **Monitore o uso de recursos**:
   - Modelos de IA consomem muita RAM e CPU
   - Configure alertas para uso de recursos

4. **Backup dos modelos** (opcional):
   - Se você personalizou modelos ou configurou fine-tuning, faça backup dos dados do Ollama

5. **Atualize regularmente**:
   - Mantenha o Ollama e os modelos atualizados para correções de segurança

### Exemplo de Configuração de Firewall (Ubuntu/Debian)

```bash
# Permitir acesso apenas do IP do servidor RootDesk
sudo ufw allow from IP_DO_SERVIDOR_ROOTDESK to any port 11434

# Ou, se estiver na mesma rede interna:
sudo ufw allow from 192.168.1.0/24 to any port 11434
```

### Exemplo de Configuração Nginx (Proxy Reverso)

Se precisar expor o Ollama através de um proxy reverso com autenticação:

```nginx
server {
    listen 80;
    server_name ollama.seuservidor.com;

    location / {
        proxy_pass http://localhost:11434;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        
        # Adicionar autenticação básica
        auth_basic "Ollama API";
        auth_basic_user_file /etc/nginx/.htpasswd;
    }
}
```

---

## Recursos Adicionais

- **Documentação Oficial do Ollama**: https://ollama.com/docs
- **Biblioteca de Modelos**: https://ollama.com/library
- **GitHub do Ollama**: https://github.com/ollama/ollama
- **Documentação do RootDesk**: Ver `docs/README.md`

---

## Suporte

Se encontrar problemas não cobertos neste guia:

1. Verifique os logs do Ollama e do RootDesk
2. Consulte a documentação oficial do Ollama
3. Abra uma issue no repositório do RootDesk descrevendo o problema e os passos para reproduzir

---

**Última atualização**: Janeiro 2025

