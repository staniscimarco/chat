import { Configuration, OpenAIApi } from "openai-edge";
import { Message, OpenAIStream, StreamingTextResponse } from "ai";
import { db } from "@/lib/db";
import { chats, messages as _messages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getEmbeddings } from "@/lib/embeddings";
import { convertToAscii } from "@/lib/utils";
import { nanoid } from "nanoid";
import { ollamaClient, chatWithOllama } from "@/lib/ollama";
import { extractTableFromImage, performTableCalculations, generateChartData } from "@/lib/pdf-extractor";

export const runtime = "nodejs";

const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(config);

async function getMatchesFromEmbeddings(
  embeddings: number[],
  fileKey: string
) {
  try {
    const { Pinecone } = await import("@pinecone-database/pinecone");
    
    const client = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
    const pineconeIndex = client.index("chatpdf");
    const namespace = convertToAscii(fileKey);
    
    console.log("🔍 Querying Pinecone namespace:", namespace);
    
    const queryResult = await pineconeIndex.namespace(namespace).query({
      vector: embeddings,
      topK: 15, // Increased to get more comprehensive matches
      includeMetadata: true,
    });
    
    console.log("🔍 Pinecone query result matches:", queryResult.matches?.length || 0);
    return queryResult.matches || [];
  } catch (error) {
    console.log("error querying embeddings", error);
    throw error;
  }
}

async function getContext(query: string, fileKey: string) {
  const queryEmbeddings = await getEmbeddings(query);
  const matches = await getMatchesFromEmbeddings(queryEmbeddings, fileKey);

  console.log("🔍 Total matches from Pinecone:", matches.length);
  console.log("🔍 Match scores:", matches.map(m => m.score).slice(0, 5));

  // Lower the threshold to get more matches for comprehensive analysis
  const qualifyingDocs = matches.filter(
    (match: any) => match.score && match.score > 0.25 // Lowered to get more comprehensive results
  );

  type Metadata = {
    text: string;
    pageNumber: number;
  };

  let docs: string[] = qualifyingDocs.map((match: any) => String((match.metadata as Metadata).text));
  let pageNumbers = qualifyingDocs.map((match: any) => Number((match.metadata as Metadata).pageNumber));
  
  // Remove duplicates and sort page numbers
  const uniquePageNumbers: number[] = [...new Set(pageNumbers)].map(Number).sort((a, b) => a - b);
  
  // Aggiungi marcatori espliciti delle pagine nel contesto
  const contextWithPageMarkers = qualifyingDocs.map((match: any) => {
    const text = String((match.metadata as Metadata).text);
    const pageNumber = Number((match.metadata as Metadata).pageNumber);
    return `[PAGINA ${pageNumber}] ${text}`;
  }).join("\n\n");
  
  // Recupera anche il documento speciale images-index
  const imagesIndexDoc = matches.find((m: any) => m.metadata?.type === 'images-index');
  let images: Array<{ page: number; url: string; ocrText: string }> = [];
  // Estrai parole chiave dalla domanda (split su spazi, rimuovi stopword semplici)
  const stopwords = ['di', 'a', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra', 'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', 'e', 'o', 'che', 'del', 'della', 'dei', 'delle', 'al', 'ai', 'agli', 'all', 'alla', 'dai', 'dalle', 'sul', 'sui', 'sugli', 'sulla', 'sulle', 'ma', 'se', 'come', 'più', 'meno', 'anche', 'solo', 'tutto', 'tutta', 'tutti', 'tutte'];
  const keywords = query
    .toLowerCase()
    .split(/\W+/)
    .filter(w => w.length > 2 && !stopwords.includes(w));
  if (imagesIndexDoc && imagesIndexDoc.metadata?.images) {
    try {
      const allImages = JSON.parse(imagesIndexDoc.metadata.images);
      // Filtra solo le immagini delle pagine rilevanti
      let filtered = allImages.filter((img: any) => uniquePageNumbers.includes(img.page));
      // Filtra per parole chiave nel testo OCR
      if (keywords.length > 0) {
        filtered = filtered.filter((img: any) =>
          img.ocrText && keywords.some((kw: string) => img.ocrText.toLowerCase().includes(kw))
        );
        // Ordina per numero di occorrenze delle keyword
        filtered.sort((a: any, b: any) => {
          const countA = keywords.reduce((acc, kw) => acc + (a.ocrText.toLowerCase().split(kw).length - 1), 0);
          const countB = keywords.reduce((acc, kw) => acc + (b.ocrText.toLowerCase().split(kw).length - 1), 0);
          return countB - countA;
        });
      }
      images = filtered;
    } catch (e) {
      console.error('Errore parsing immagini indicizzate', e);
    }
  }
  
  // If no qualifying docs, use all matches with lower threshold
  if (qualifyingDocs.length === 0 && matches.length > 0) {
    const allDocs: string[] = matches.map((match: any) => String((match.metadata as Metadata).text));
    const allPageNumbers = matches.map((match: any) => Number((match.metadata as Metadata).pageNumber));
    const allUniquePageNumbers = [...new Set(allPageNumbers)].sort((a, b) => a - b);
    
    // Aggiungi marcatori espliciti delle pagine anche per il fallback
    const fallbackContextWithPageMarkers = matches.map((match: any) => {
      const text = String((match.metadata as Metadata).text);
      const pageNumber = Number((match.metadata as Metadata).pageNumber);
      return `[PAGINA ${pageNumber}] ${text}`;
    }).join("\n\n");
    
    return {
      context: fallbackContextWithPageMarkers.substring(0, 8000),
      pageNumbers: allUniquePageNumbers,
      images: images,
    };
  }
  
      return {
    context: contextWithPageMarkers.substring(0, 8000),
    pageNumbers: uniquePageNumbers,
    images: images,
    keywords,
    };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("📨 Request body:", JSON.stringify(body, null, 2));
    const { messages, chatId } = body;
    
    // Verifica che messages sia valido
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error("Invalid messages array:", messages);
      return NextResponse.json({ error: "Messages array is invalid or empty" }, { status: 400 });
    }
    
    // Verifica che chatId sia valido
    if (!chatId) {
      console.error("Missing chatId");
      return NextResponse.json({ error: "Chat ID is required" }, { status: 400 });
    }
    
    const _chats = await db.select().from(chats).where(eq(chats.id, chatId));
    if (_chats.length != 1) {
      console.error("Chat not found:", chatId);
      return NextResponse.json({ error: "chat not found" }, { status: 404 });
    }
    
    const fileKey = _chats[0].fileKey;
    const lastMessage = messages[messages.length - 1];
    
    // Verifica che lastMessage sia valido
    if (!lastMessage || !lastMessage.content) {
      console.error("Invalid last message:", lastMessage);
      return NextResponse.json({ error: "Last message is invalid" }, { status: 400 });
    }
    
    const { context, pageNumbers, images } = await getContext(lastMessage.content, fileKey);

    // Trigger immagini: se la domanda contiene parole chiave immagini, restituisci sempre le immagini
    const imageKeywords = ['immagine', 'immagini', 'foto', 'figure', 'figura', 'grafico', 'diagramma', 'visualizza', 'mostra', 'mostrami', 'mostra'];
    const domanda = lastMessage.content.toLowerCase();
    const domandaChiedeImmagini = imageKeywords.some(kw => domanda.includes(kw));

    console.log("🔍 Debug immagini:", {
      domanda: domanda,
      domandaChiedeImmagini: domandaChiedeImmagini,
      imagesLength: images?.length,
      imageKeywords: imageKeywords
    });

    if (domandaChiedeImmagini) {
      console.log("✅ Domanda richiede immagini, recuperando da Pinecone...");
      
      // Recupera direttamente le immagini da Pinecone
      const { Pinecone } = await import("@pinecone-database/pinecone");
      const client = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY!,
      });
      const pineconeIndex = client.index("chatpdf");
      const namespace = convertToAscii(fileKey);
      
      const queryResult = await pineconeIndex.namespace(namespace).query({
        vector: await getEmbeddings("immagini tabelle grafici"),
        topK: 1,
        includeMetadata: true,
        filter: { type: { $eq: "images-index" } }
      });
      
      let pineconeImages: any[] = [];
      if (queryResult.matches && queryResult.matches.length > 0) {
        const imagesDoc = queryResult.matches[0];
        if (imagesDoc.metadata?.images) {
          try {
            pineconeImages = JSON.parse(imagesDoc.metadata.images);
            console.log("✅ Immagini recuperate da Pinecone:", pineconeImages.length);
          } catch (e) {
            console.error("Errore parsing immagini da Pinecone:", e);
          }
        }
      }
      
             if (pineconeImages.length > 0) {
         console.log("✅ Immagini trovate, ma lasciando che il frontend le gestisca");
         // Non restituiamo più la risposta JSON qui, il frontend gestirà le immagini tramite onFinish
       }
    }

    console.log("📄 Context length:", context.length);
    console.log("📄 Page numbers from context:", pageNumbers);

    // Check if context is empty or too short
    if (!context || context.trim().length < 30) {
      console.log("⚠️ Context is empty or too short, providing fallback response");
      return new StreamingTextResponse(
        new ReadableStream({
          start(controller) {
            const response = "Mi dispiace, ma non riesco a trovare informazioni sufficienti nel documento per rispondere alla tua domanda. Potresti provare a riformulare la domanda o verificare che il documento contenga le informazioni che stai cercando?";
            controller.enqueue(new TextEncoder().encode(response));
            controller.close();
          }
        })
      );
    }

    const prompt = {
      role: "system",
      content: `Sei un assistente AI avanzato specializzato nell'analisi approfondita di documenti PDF accademici e tecnici. Il tuo compito è fornire risposte dettagliate e precise basandoti esclusivamente sul contenuto fornito nel contesto.

      CONTESTO DEL DOCUMENTO:
      ${context}
      


      ISTRUZIONI AVANZATE:
      1. Rispondi SEMPRE in italiano con un linguaggio tecnico appropriato
      2. Analizza il contesto in modo approfondito per estrarre informazioni specifiche
      3. Per domande sui capitoli, cerca sistematicamente:
         - Numeri di capitolo espliciti (1, 2, 3, 4, 5, ecc.)
         - Titoli di capitolo completi
         - Sezioni e sottosezioni correlate
         - Argomenti principali di ogni capitolo
         - Autori e collaboratori menzionati
         - Date di pubblicazione o riferimenti temporali
         - Metodologie e approcci descritti
         - Risultati e conclusioni presentati
      4. Per domande sugli autori, cerca:
         - Nomi completi degli autori
         - Affiliazioni istituzionali
         - Ruoli e contributi specifici
         - Credenziali accademiche
         - Collaborazioni menzionate
      5. Sii estremamente dettagliato e fornisci:
         - Citazioni dirette dal testo quando appropriato
         - Riferimenti specifici a sezioni del documento
         - Spiegazioni tecniche accurate
         - Collegamenti tra diversi argomenti
         - Analisi critica quando richiesto
      6. OBBLIGATORIO: Alla fine della tua risposta, aggiungi SEMPRE:
         [PAGINE: numero1,numero2,numero3] (sostituisci con i numeri di pagina dal contesto)

      STRATEGIA DI RICERCA AVANZATA:
      - Cerca pattern come "Capitolo X", "X. Introduzione", "X. Metodologia"
      - Identifica autori con pattern come "Autore: Nome", "di Nome Cognome", "N. Cognome"
      - Cerca riferimenti bibliografici e citazioni
      - Analizza la struttura logica del documento
      - Identifica parole chiave tecniche e concetti principali
      - Cerca definizioni, teoremi, algoritmi, metodologie
      - Identifica risultati sperimentali, grafici, tabelle

      TIPI DI RISPOSTE RICHIESTE:
      - Per capitoli: Struttura, contenuti principali, obiettivi, risultati
      - Per autori: Nome completo, affiliazione, contributi, background
      - Per metodologie: Descrizione dettagliata, vantaggi, limitazioni
      - Per risultati: Dati specifici, interpretazioni, implicazioni
      - Per conclusioni: Sintesi, significato, prospettive future

      ALGORITMO INTELLIGENTE PER IDENTIFICARE LA PAGINA CORRETTA:
      
      FASE 1 - ANALISI DEL CONTENUTO:
      - Leggi attentamente ogni riga del contesto fornito
      - Identifica titoli, sottotitoli, sezioni e contenuti specifici
      - Cerca pattern strutturali del documento
      - PRESTA ATTENZIONE AI MARCATORI [PAGINA X] - questi indicano a quale pagina appartiene ogni sezione
      
      FASE 2 - IDENTIFICAZIONE DELL'INFORMAZIONE RICHIESTA:
      - Se la domanda riguarda "tabella", "grafico", "figura", "diagramma":
        * Cerca titoli come "Tabella di Sintesi e Analisi", "Tabella", "Grafico", "Figura"
        * Cerca dati numerici specifici (2021, 2022, 2023, 2024)
        * Cerca valori di produzione (100, 150, 130, 170 tonnellate)
        * Cerca valori di consumo (2000, 2200, 2100, 2500 kWh)
        * Cerca strutture tabellari (righe con |, intestazioni, dati)
      
      FASE 3 - CORRELAZIONE CON PAGINE:
      - Per ogni informazione trovata, identifica la pagina di origine usando i marcatori [PAGINA X]
      - Se vedi dati specifici (es. "2021: 100 tonnellate, 2000 kWh"), cerca il marcatore [PAGINA X] prima di quella sezione
      - Se vedi un titolo "Tabella di Sintesi e Analisi", cerca il marcatore [PAGINA X] prima di quella sezione
      - Se vedi una struttura tabellare completa, cerca il marcatore [PAGINA X] prima di quella sezione
      
      FASE 4 - VALIDAZIONE:
      - Verifica che l'informazione sia completa e coerente
      - Assicurati che la pagina identificata contenga effettivamente l'informazione richiesta
      - Non assumere mai che tutto sia nella pagina 1
      - Usa SEMPRE i marcatori [PAGINA X] per identificare la pagina corretta
      
      FASE 5 - RISPOSTA PRECISA:
      - Fornisci la risposta basata sul contenuto identificato
      - Indica la pagina CORRETTA dove si trova l'informazione (usando i marcatori [PAGINA X])
      - Se l'informazione è in più pagine, elenca tutte le pagine rilevanti

      ESEMPI DI ANALISI CORRETTA:
      
      ESEMPIO 1 - TABELLA:
      Domanda: "mostrami la tabella"
      Analisi: 
      - Cerca "Tabella di Sintesi e Analisi" nel contesto
      - Cerca il marcatore [PAGINA X] prima di quella sezione
      - Cerca dati numerici (2021, 2022, 2023, 2024)
      - Cerca valori specifici (100, 150, 130, 170 tonnellate)
      - Identifica la pagina usando il marcatore [PAGINA X]
      - Risposta: [PAGINE: X] dove X è la pagina del marcatore trovato
      
      ESEMPIO 2 - GRAFICO:
      Domanda: "mostrami il grafico"
      Analisi:
      - Cerca "Grafico", "Figura", "Diagramma" nel contesto
      - Cerca il marcatore [PAGINA X] prima di quella sezione
      - Cerca descrizioni di visualizzazioni
      - Identifica la pagina usando il marcatore [PAGINA X]
      - Risposta: [PAGINE: X] dove X è la pagina del marcatore trovato
      
      ESEMPIO 3 - CONCLUSIONI:
      Domanda: "conclusioni"
      Analisi:
      - Cerca "Conclusioni", "Conclusioni finali", "Sintesi" nel contesto
      - Cerca il marcatore [PAGINA X] prima di quella sezione
      - Cerca frasi conclusive e riassuntive
      - Identifica la pagina usando il marcatore [PAGINA X]
      - Risposta: [PAGINE: X] dove X è la pagina del marcatore trovato

      REGOLE FONDAMENTALI:
      1. SEMPRE analizza il contenuto prima di rispondere
      2. NON assumere mai che tutto sia nella pagina 1
      3. Cerca indicatori specifici nel testo per identificare la pagina corretta
      4. Verifica che l'informazione sia effettivamente presente nella pagina indicata
      5. Se non sei sicuro, analizza più attentamente il contenuto
      6. Usa solo i numeri di pagina dal contesto fornito
      7. Sii preciso e accurato nell'identificazione della pagina
      8. USA SEMPRE I MARCATORI [PAGINA X] PER IDENTIFICARE LA PAGINA CORRETTA
      9. NON IGNORARE I MARCATORI [PAGINA X] - sono fondamentali per l'identificazione

      Esempio di risposta avanzata:
      "Ho analizzato approfonditamente il documento e ho identificato le informazioni richieste. Il Capitolo X tratta di [descrizione dettagliata]. Gli autori principali sono [nomi completi] dell'[affiliazione]. La metodologia utilizzata include [descrizione tecnica]. I risultati principali mostrano [dati specifici]. Le informazioni si trovano nelle pagine indicate."
      [PAGINE: 67,68,69,70]

      IMPORTANTE: 
      - Fornisci sempre risposte complete e dettagliate
      - Includi sempre [PAGINE: ...] con i numeri di pagina CORRETTI dal contesto
      - Se non trovi informazioni esatte, cerca contenuti correlati e spiega le connessioni
      - Mantieni un tono professionale e accademico
      - Evita risposte generiche, sii sempre specifico e informativo
      - Assicurati che i numeri di pagina corrispondano effettivamente alla posizione delle informazioni nel documento
      - RICORDA: Analizza il contenuto per trovare la pagina giusta, non assumere pagina 1
      - SE VEDI DATI NUMERICI SPECIFICI, IDENTIFICA LA PAGINA DOVE SONO PRESENTATI
      - SEGUI SEMPRE L'ALGORITMO INTELLIGENTE SOPRA DESCRITTO
      - USA SEMPRE I MARCATORI [PAGINA X] PER IDENTIFICARE LA PAGINA CORRETTA`,
    };

    // Controlla se usare Ollama o OpenAI
    const useOllama = process.env.USE_OLLAMA === 'true';
    
    // StreamingTextResponse non supporta payload custom, quindi se ci sono immagini restituisco JSON standard
    if (images && images.length > 0) {
      // Risposta JSON con testo, pagine e immagini/ocr
      let completion: string;
      
      if (useOllama) {
        console.log("Usando Ollama per chat con immagini");
        try {
          const ollamaResponse = await chatWithOllama([
            prompt,
            ...messages.filter((message: Message) => message.role === "user"),
          ]);
          completion = ollamaResponse.text;
        } catch (error) {
          console.error("Errore con Ollama, fallback a OpenAI:", error);
          const aiResponse = await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: [
              prompt,
              ...messages.filter((message: Message) => message.role === "user"),
            ],
          });
          completion = (await aiResponse.json()).choices[0].message.content;
        }
      } else {
        console.log("Usando OpenAI per chat con immagini");
        const aiResponse = await openai.createChatCompletion({
          model: "gpt-3.5-turbo",
          messages: [
            prompt,
            ...messages.filter((message: Message) => message.role === "user"),
          ],
        });
        completion = (await aiResponse.json()).choices[0].message.content;
      }
      // Estrai pagine come sopra
      let pageMatch = completion.match(/\[PAGINE: ([\d,\s]+)\]/);
      if (!pageMatch) pageMatch = completion.match(/\[PAGES: ([\d,\s]+)\]/);
      let extractedPageNumbers: number[] = [];
      if (pageMatch) {
        extractedPageNumbers = pageMatch[1].split(',').map((p: string) => parseInt(p.trim())).filter((p: number) => !isNaN(p));
      } else {
        extractedPageNumbers = pageNumbers;
      }
      const cleanCompletion = completion
        .replace(/\s*\[PAGINE: [\d,\s]+\]/, '')
        .replace(/\s*\[PAGES: [\d,\s]+\]/, '');
      return NextResponse.json({
        answer: cleanCompletion,
        pages: extractedPageNumbers,
        images,
      });
    }

    let response: any;
    
    if (useOllama) {
      console.log("Usando Ollama per chat streaming");
      try {
        const ollamaResponse = await chatWithOllama([
          prompt,
          ...messages.filter((message: Message) => message.role === "user"),
        ]);
        
        // Per Ollama, creiamo un stream simulato
        const stream = new ReadableStream({
          start(controller) {
            const text = ollamaResponse.text;
            const chunks = text.split(' ');
            
            let index = 0;
            const interval = setInterval(() => {
              if (index < chunks.length) {
                controller.enqueue(new TextEncoder().encode(chunks[index] + ' '));
                index++;
              } else {
                controller.close();
                clearInterval(interval);
              }
            }, 50);
          }
        });
        
        return new StreamingTextResponse(stream);
      } catch (error) {
        console.error("Errore con Ollama, fallback a OpenAI:", error);
        response = await openai.createChatCompletion({
          model: "gpt-3.5-turbo",
          messages: [
            prompt,
            ...messages.filter((message: Message) => message.role === "user"),
          ],
          stream: true,
        });
      }
    } else {
      console.log("Usando OpenAI per chat streaming");
      response = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [
          prompt,
          ...messages.filter((message: Message) => message.role === "user"),
        ],
        stream: true,
      });
    }

    let fullResponse = "";
    let extractedPageNumbers: number[] = [];

    const stream = OpenAIStream(response, {
      onStart: async () => {
        // save user message into db
        await db.insert(_messages).values({
          id: nanoid(),
          chatId,
          content: lastMessage.content,
          role: "user",
        });
      },
      onToken: (token) => {
        fullResponse += token;
      },
      onCompletion: async (completion) => {
        // Extract page numbers from the response - handle both formats
        let pageMatch = completion.match(/\[PAGINE: ([\d,\s]+)\]/);
        if (!pageMatch) {
          // Fallback: try Italian format
          pageMatch = completion.match(/\[PAGES: ([\d,\s]+)\]/);
        }
        
        if (pageMatch) {
          extractedPageNumbers = pageMatch[1].split(',').map((p: string) => parseInt(p.trim())).filter((p: number) => !isNaN(p));
          console.log("📄 Extracted page numbers from AI response:", extractedPageNumbers);
        } else {
          // Fallback: use page numbers from context if no explicit reference
          extractedPageNumbers = pageNumbers;
          console.log("📄 Using context page numbers as fallback:", extractedPageNumbers);
        }
        
        // Remove both [PAGES: ...] and [PAGINE: ...] lines from the completion
        const cleanCompletion = completion
          .replace(/\s*\[PAGINE: [\d,\s]+\]/, '')
          .replace(/\s*\[PAGES: [\d,\s]+\]/, '');
        
        console.log("📄 Final page references for message:", extractedPageNumbers);
        console.log("📄 Clean completion:", cleanCompletion.substring(0, 100) + "...");
        
        // save ai message into db with page references
        await db.insert(_messages).values({
          id: nanoid(),
          chatId,
          content: cleanCompletion,
          role: "assistant",
        });
      },
    });

    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
