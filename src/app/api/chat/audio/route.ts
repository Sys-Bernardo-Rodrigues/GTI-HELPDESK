import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";

export const runtime = "nodejs";

// Função para transcrever áudio usando API externa
async function transcribeAudio(audioBlob: Blob, audioType: string): Promise<string | null> {
  try {
    // Tentar usar AssemblyAI primeiro (gratuito até 5 horas/mês)
    const assemblyApiKey = process.env.ASSEMBLYAI_API_KEY;
    
    if (assemblyApiKey) {
      return await transcribeWithAssemblyAI(audioBlob, audioType, assemblyApiKey);
    }
    
    // Tentar usar Deepgram como alternativa (gratuito até 12.000 minutos/mês)
    const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
    if (deepgramApiKey) {
      return await transcribeWithDeepgram(audioBlob, audioType, deepgramApiKey);
    }
    
    // Tentar usar Google Speech-to-Text como última opção
    const googleApiKey = process.env.GOOGLE_SPEECH_API_KEY;
    if (googleApiKey) {
      return await transcribeWithGoogle(audioBlob, audioType, googleApiKey);
    }
    
    console.warn("Nenhuma API de transcrição configurada. Configure ASSEMBLYAI_API_KEY, DEEPGRAM_API_KEY ou GOOGLE_SPEECH_API_KEY");
    return null;
  } catch (error) {
    console.error("Erro ao transcrever áudio:", error);
    return null;
  }
}

// Transcrição usando AssemblyAI (recomendado - gratuito até 5h/mês)
async function transcribeWithAssemblyAI(audioBlob: Blob, audioType: string, apiKey: string): Promise<string | null> {
  try {
    // Upload do áudio
    const uploadResponse = await fetch("https://api.assemblyai.com/v2/upload", {
      method: "POST",
      headers: {
        authorization: apiKey,
      },
      body: audioBlob,
    });
    
    if (!uploadResponse.ok) {
      throw new Error("Falha ao fazer upload do áudio");
    }
    
    const { upload_url } = await uploadResponse.json() as { upload_url: string };
    
    // Iniciar transcrição
    const transcriptResponse = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        authorization: apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        audio_url: upload_url,
        language_code: "pt",
      }),
    });
    
    if (!transcriptResponse.ok) {
      throw new Error("Falha ao iniciar transcrição");
    }
    
    const { id } = await transcriptResponse.json() as { id: string };
    
    // Polling para obter resultado
    let transcript = null;
    let attempts = 0;
    const maxAttempts = 60; // 60 tentativas (5 minutos máximo)
    
    while (!transcript && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Aguardar 5 segundos
      
      const statusResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
        headers: {
          authorization: apiKey,
        },
      });
      
      if (!statusResponse.ok) {
        throw new Error("Falha ao verificar status da transcrição");
      }
      
      const statusData = await statusResponse.json() as { status: string; text?: string; error?: string };
      
      if (statusData.status === "completed") {
        transcript = statusData.text;
      } else if (statusData.status === "error") {
        throw new Error(statusData.error || "Erro na transcrição");
      }
      
      attempts++;
    }
    
    return transcript || null;
  } catch (error) {
    console.error("Erro na transcrição AssemblyAI:", error);
    return null;
  }
}

// Transcrição usando Deepgram (alternativa - gratuito até 12k minutos/mês)
async function transcribeWithDeepgram(audioBlob: Blob, audioType: string, apiKey: string): Promise<string | null> {
  try {
    const response = await fetch("https://api.deepgram.com/v1/listen?language=pt-BR&punctuate=true", {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": audioType,
      },
      body: audioBlob,
    });
    
    if (!response.ok) {
      throw new Error("Falha na transcrição Deepgram");
    }
    
    const responseData: any = await response.json();
    const transcript = responseData?.results?.channels?.[0]?.alternatives?.[0]?.transcript;
    return transcript || null;
  } catch (error) {
    console.error("Erro na transcrição Deepgram:", error);
    return null;
  }
}

// Transcrição usando Google Speech-to-Text (alternativa)
async function transcribeWithGoogle(audioBlob: Blob, audioType: string, apiKey: string): Promise<string | null> {
  try {
    // Converter blob para base64
    const arrayBuffer = await audioBlob.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString("base64");
    
    const response = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          config: {
            encoding: "WEBM_OPUS",
            sampleRateHertz: 48000,
            languageCode: "pt-BR",
          },
          audio: {
            content: base64Audio,
          },
        }),
      }
    );
    
    if (!response.ok) {
      throw new Error("Falha na transcrição Google");
    }
    
    const data = await response.json() as { results?: Array<{ alternatives?: Array<{ transcript?: string }> }> };
    
    const transcript = data.results?.[0]?.alternatives?.[0]?.transcript;
    return transcript || null;
  } catch (error) {
    console.error("Erro na transcrição Google:", error);
    return null;
  }
}

// Processar mensagem usando o mesmo sistema do chat principal
async function processMessageWithDobby(message: string, userId: number, authCookie?: string): Promise<string> {
  // Chamar a API do chat normal para processar a mensagem
  // Isso garante que o Dobby entenda o áudio da mesma forma que entende texto
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    // Adicionar cookie de autenticação se disponível
    if (authCookie) {
      headers["Cookie"] = authCookie;
    }
    
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify({ message }),
    });
    
    if (response.ok) {
      const data = await response.json() as { message: string };
      return data.message;
    }
  } catch (error) {
    console.error("Erro ao processar mensagem via chat:", error);
  }
  
  // Fallback: retornar mensagem padrão se não conseguir processar
  return `Recebi seu áudio! Como posso ajudá-lo? Posso buscar informações sobre:\n\n` +
    `📚 Base de conhecimento\n` +
    `📁 Arquivos e downloads\n` +
    `🎫 Tickets e chamados\n` +
    `📅 Agenda e compromissos\n` +
    `🔐 Senhas e credenciais\n` +
    `📝 Histórico e atualizações\n` +
    `📊 Estatísticas do sistema\n` +
    `📈 Relatórios detalhados\n\n` +
    `Faça uma pergunta específica e eu buscarei as informações para você!`;
}

// Função para processar áudio e entender a intenção
async function processAudioIntent(audioFile: File, transcript: string | null, userId: number, authCookie?: string): Promise<string> {
  let finalTranscript = transcript;
  
  // Se não temos transcrição do cliente, tentar transcrever usando API externa
  if (!finalTranscript || finalTranscript.trim().length === 0) {
    console.log("[chat:audio] Tentando transcrever áudio com API externa...");
    const audioBlob = await audioFile.arrayBuffer().then(buf => new Blob([buf], { type: audioFile.type }));
    finalTranscript = await transcribeAudio(audioBlob, audioFile.type);
    
    if (finalTranscript) {
      console.log("[chat:audio] Transcrição obtida:", finalTranscript.substring(0, 100));
    } else {
      console.log("[chat:audio] Não foi possível transcrever o áudio");
    }
  }
  
  // Se temos transcrição (do cliente ou da API), usar ela para entender a intenção através do sistema do Dobby
  if (finalTranscript && finalTranscript.trim().length > 0) {
    return await processMessageWithDobby(finalTranscript.trim(), userId, authCookie);
  }
  
  // Se não temos transcrição, retornar mensagem genérica mas útil
  return `Recebi seu áudio, mas não consegui transcrevê-lo automaticamente. Por favor:\n\n` +
    `• Configure uma API de transcrição (AssemblyAI, Deepgram ou Google Speech-to-Text)\n` +
    `• Ou use um navegador compatível com transcrição de voz (Chrome, Edge ou Opera)\n` +
    `• Ou digite sua pergunta diretamente\n\n` +
    `Posso ajudá-lo com:\n` +
    `📚 Base de conhecimento\n` +
    `📁 Arquivos e downloads\n` +
    `🎫 Tickets e chamados\n` +
    `📅 Agenda e compromissos\n` +
    `🔐 Senhas e credenciais\n` +
    `📝 Histórico e atualizações\n` +
    `📊 Estatísticas do sistema\n` +
    `📈 Relatórios detalhados`;
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json({ error: "Áudio não fornecido" }, { status: 400 });
    }

    // Verificar tamanho do arquivo (máximo 10MB)
    if (audioFile.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Áudio muito grande. Máximo 10MB." }, { status: 400 });
    }

    // Verificar tipo MIME
    if (!audioFile.type.startsWith("audio/")) {
      return NextResponse.json({ error: "Arquivo não é um áudio válido" }, { status: 400 });
    }

    // Pegar transcrição se disponível
    const transcript = formData.get("transcript") as string | null;
    
    // Pegar cookie de autenticação da requisição
    const authCookie = req.headers.get("cookie") || undefined;
    
    // Processar áudio e gerar resposta do Dobby
    const message = await processAudioIntent(audioFile, transcript, user.id, authCookie);
    
    // Tentar obter transcrição se não tivermos do cliente
    let finalTranscript = transcript;
    if (!finalTranscript) {
      const audioBlob = await audioFile.arrayBuffer().then(buf => new Blob([buf], { type: audioFile.type }));
      finalTranscript = await transcribeAudio(audioBlob, audioFile.type);
    }
    
    return NextResponse.json({
      message,
      audioReceived: true,
      audioSize: audioFile.size,
      audioType: audioFile.type,
      transcript: finalTranscript || transcript || null,
      transcribed: !!finalTranscript,
    });
  } catch (error) {
    console.error("[chat:audio:POST]", error);
    return NextResponse.json(
      { error: "Erro ao processar áudio" },
      { status: 500 }
    );
  }
}

