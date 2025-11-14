# Configuração de Transcrição de Áudio

O Elffo suporta transcrição de áudio usando APIs externas gratuitas. Configure pelo menos uma das APIs abaixo para habilitar a transcrição automática de áudio.

## APIs Suportadas

### 1. AssemblyAI (Recomendado)
- **Limite gratuito**: 5 horas de áudio por mês
- **Precisão**: Alta
- **Idiomas**: Português brasileiro suportado
- **Cadastro**: https://www.assemblyai.com/

**Como configurar:**
1. Crie uma conta em https://www.assemblyai.com/
2. Obtenha sua API Key no dashboard
3. Adicione no `.env`:
   ```env
   ASSEMBLYAI_API_KEY=sua_chave_aqui
   ```

### 2. Deepgram (Alternativa)
- **Limite gratuito**: 12.000 minutos por mês
- **Precisão**: Alta
- **Idiomas**: Português brasileiro suportado
- **Cadastro**: https://deepgram.com/

**Como configurar:**
1. Crie uma conta em https://deepgram.com/
2. Obtenha sua API Key no dashboard
3. Adicione no `.env`:
   ```env
   DEEPGRAM_API_KEY=sua_chave_aqui
   ```

### 3. Google Speech-to-Text (Alternativa)
- **Limite gratuito**: 60 minutos por mês
- **Precisão**: Muito alta
- **Idiomas**: Português brasileiro suportado
- **Cadastro**: https://cloud.google.com/speech-to-text

**Como configurar:**
1. Crie um projeto no Google Cloud Platform
2. Habilite a API Speech-to-Text
3. Crie uma chave de API
4. Adicione no `.env`:
   ```env
   GOOGLE_SPEECH_API_KEY=sua_chave_aqui
   ```

## Ordem de Prioridade

O sistema tenta usar as APIs na seguinte ordem:
1. AssemblyAI (se `ASSEMBLYAI_API_KEY` estiver configurado)
2. Deepgram (se `DEEPGRAM_API_KEY` estiver configurado)
3. Google Speech-to-Text (se `GOOGLE_SPEECH_API_KEY` estiver configurado)

## Como Funciona

1. **Gravação**: O usuário grava um áudio no navegador
2. **Transcrição do Cliente**: Se o navegador suportar (Chrome, Edge, Opera), tenta transcrever localmente
3. **Transcrição da API**: Se não houver transcrição do cliente, envia o áudio para a API configurada
4. **Processamento**: O texto transcrito é processado pelo Elffo como uma mensagem de texto normal

## Fallback

Se nenhuma API estiver configurada e o navegador não suportar transcrição local:
- O sistema informará ao usuário para configurar uma API ou digitar a mensagem
- A funcionalidade de áudio ainda funcionará, mas sem transcrição automática

## Exemplo de Uso

```typescript
// O áudio é enviado automaticamente para transcrição
// Se houver API configurada, será transcrito no servidor
// Se não houver, tentará usar a transcrição do navegador
```

## Notas Importantes

- As APIs gratuitas têm limites mensais
- O áudio é enviado para os servidores das APIs (verifique as políticas de privacidade)
- Para produção, considere usar planos pagos para maior limite
- A transcrição do cliente (navegador) é sempre preferida quando disponível

