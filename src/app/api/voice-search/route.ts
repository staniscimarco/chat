import { Configuration, OpenAIApi } from "openai-edge";
import { NextResponse } from "next/server";
import { getEmbeddings } from "@/lib/embeddings";
import { convertToAscii } from "@/lib/utils";
import { auth } from "@/lib/auth";

const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(config);

async function searchAllPDFs(query: string, userId: string) {
  try {
    const { Pinecone } = await import("@pinecone-database/pinecone");
    const { db } = await import("@/lib/db");
    const { chats } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");
    
    // Prima ottieni tutti i chat dell'utente
    const userChats = await db
      .select()
      .from(chats)
      .where(eq(chats.userId, userId));
    
    console.log("📋 User chats found:", userChats.length);
    
    if (userChats.length === 0) {
      return {
        context: "",
        pageNumbers: [],
        sources: []
      };
    }
    
    // Estrai nomi file per ricerca semantica
    const fileNames = userChats.map((chat: any) => {
      const fileName = chat.fileKey.split('/').pop()?.replace('.pdf', '') || '';
      return fileName.toLowerCase();
    });
    
    // Controlla se la query contiene riferimenti a nomi file specifici
    const queryLower = query.toLowerCase();
    const matchingFiles = userChats.filter((chat: any) => {
      const fileName = chat.fileKey.split('/').pop()?.replace('.pdf', '').toLowerCase() || '';
      return queryLower.includes(fileName) || fileName.includes(queryLower);
    });
    
    // Se trova corrispondenze specifiche, usa solo quei file
    const filesToSearch = matchingFiles.length > 0 ? matchingFiles : userChats;
    
    if (matchingFiles.length > 0) {
      console.log("🎯 Found specific file matches:", matchingFiles.map((f: any) => f.fileKey.split('/').pop()));
    }
    
    const client = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
    const pineconeIndex = client.index("chatpdf");
    
    const queryEmbeddings = await getEmbeddings(query);
    
    // Cerca in tutti i namespace dei chat dell'utente
    let allMatches: any[] = [];
    
    for (const chat of filesToSearch) {
      const namespace = convertToAscii(chat.fileKey);
      console.log("🔍 Searching in namespace:", namespace);
      
      try {
        const queryResult = await pineconeIndex.namespace(namespace).query({
          vector: queryEmbeddings,
          topK: 15,
          includeMetadata: true,
        });
        
        if (queryResult.matches && queryResult.matches.length > 0) {
          // Aggiungi il fileKey a ogni match usando il namespace
          const matchesWithFileKey = queryResult.matches.map((match: any) => ({
            ...match,
            metadata: {
              ...match.metadata,
              fileKey: chat.fileKey // Usa il fileKey del chat
            }
          }));
          
          allMatches.push(...matchesWithFileKey);
          console.log("🔍 Found matches in namespace:", namespace, queryResult.matches.length);
        }
      } catch (error) {
        console.log("⚠️ Error searching namespace:", namespace, error);
      }
    }
    
    console.log("🔍 Total matches from all namespaces:", allMatches.length);
    console.log("🔍 Match scores:", allMatches.map(m => m.score).slice(0, 5));
    
    // Stesso filtro della chat PDF
    const qualifyingDocs = allMatches.filter(
      (match: any) => match.score && match.score > 0.25
    );
    
    console.log("🔍 Qualifying docs:", qualifyingDocs.length);
    
    // Raggruppa per file per creare il contesto
    const contextByFile: { [fileKey: string]: string[] } = {};
    const pageNumbersByFile: { [fileKey: string]: number[] } = {};
    
    // Debug: mostra i primi match per capire la struttura dei metadata
    if (qualifyingDocs.length > 0) {
      console.log("🔍 First match metadata:", qualifyingDocs[0].metadata);
      console.log("🔍 Available metadata keys:", Object.keys(qualifyingDocs[0].metadata || {}));
    }
    
    qualifyingDocs.forEach((match: any) => {
      const fileKey = match.metadata?.fileKey || match.metadata?.filekey;
      const text = match.metadata?.text || match.metadata?.content;
      const pageNumber = match.metadata?.pageNumber || match.metadata?.page || 1;
      
      console.log("🔍 Processing match:", { fileKey, textLength: text?.length, pageNumber });
      
      if (fileKey && text) {
        if (!contextByFile[fileKey]) {
          contextByFile[fileKey] = [];
          pageNumbersByFile[fileKey] = [];
        }
        contextByFile[fileKey].push(`[PAGINA ${pageNumber}] ${text}`);
        if (pageNumber && !pageNumbersByFile[fileKey].includes(pageNumber)) {
          pageNumbersByFile[fileKey].push(pageNumber);
        }
      } else {
        console.log("⚠️ Skipping match - missing fileKey or text:", { fileKey: !!fileKey, text: !!text });
      }
    });
    
    // Crea il contesto combinato
    let combinedContext = "";
    let allPageNumbers: number[] = [];
    
    console.log("🔍 Context files found:", Object.keys(contextByFile));
    
    Object.keys(contextByFile).forEach(fileKey => {
      // Pulisci il nome del file rimuovendo timestamp e caratteri strani
      let fileName = fileKey.split('/').pop()?.replace('.pdf', '') || 'Documento';
      
      // Rimuovi timestamp numerici all'inizio (es: 1753549976368)
      fileName = fileName.replace(/^\d+/, '');
      
      // Rimuovi caratteri strani e sostituisci con spazi
      fileName = fileName.replace(/[-_*+=\[\]{}()<>|\\\/@#$%^&~`]/g, ' ');
      
      // Rimuovi spazi multipli e trim
      fileName = fileName.replace(/\s+/g, ' ').trim();
      
      // Se il nome è vuoto dopo la pulizia, usa "Documento"
      if (!fileName) fileName = 'Documento';
      
      const fileContext = contextByFile[fileKey].join("\n\n");
      combinedContext += `\n\n=== DOCUMENTO: ${fileName} ===\n`;
      combinedContext += fileContext;
      allPageNumbers.push(...pageNumbersByFile[fileKey]);
      
      console.log(`🔍 Added context for ${fileName}:`, fileContext.length, "characters");
    });
    
    // Rimuovi duplicati e ordina i numeri di pagina
    allPageNumbers = [...new Set(allPageNumbers)].sort((a, b) => a - b);
    
    console.log("🔍 Final context length:", combinedContext.length);
    console.log("🔍 Context preview:", combinedContext.substring(0, 500) + "...");
    
    return {
      context: combinedContext,
      pageNumbers: allPageNumbers,
      sources: qualifyingDocs.map((match: any) => ({
        fileKey: match.metadata?.fileKey,
        pageNumber: match.metadata?.pageNumber,
        text: match.metadata?.text?.substring(0, 200) + "..."
      }))
    };
  } catch (error) {
    console.error("❌ Error in searchAllPDFs:", error);
    return {
      context: "",
      pageNumbers: [],
      sources: []
    };
  }
}

export async function POST(req: Request) {
  try {
    console.log("🎤 Voice search API chiamata");
    
    const { currentUser } = await auth();
    console.log("🔐 Auth result:", { currentUser: currentUser ? { id: currentUser.id, email: currentUser.email } : null });
    
    if (!currentUser?.email) {
      console.log("❌ Utente non autenticato");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await req.json();
    const { query } = body;
    
    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }
    
    console.log("🎤 Voice search query:", query);
    console.log("👤 User ID:", currentUser.id);
    
    // Cerca in tutti i PDF dell'utente
    const { context, pageNumbers, sources } = await searchAllPDFs(query, currentUser.id);
    
    console.log("📄 Context length:", context.length);
    console.log("📄 Page numbers:", pageNumbers);
    
    // Check if context is empty or too short
    if (!context || context.trim().length < 30) {
      console.log("⚠️ Context is empty or too short");
      return NextResponse.json({
        answer: "Mi dispiace, ma non riesco a trovare informazioni sufficienti nei tuoi documenti per rispondere alla tua domanda. Potresti provare a riformulare la domanda o verificare che i documenti contengano le informazioni che stai cercando?",
        sources: []
      });
    }

    // Truncate context to fit OpenAI's token limit (approximately 10,000 tokens)
    // Rough estimation: 1 token ≈ 4 characters
    const maxContextLength = 10000 * 4; // ~40,000 characters
    let truncatedContext = context;
    
    if (context.length > maxContextLength) {
      console.log(`⚠️ Context too long (${context.length} chars), truncating to ${maxContextLength} chars`);
      truncatedContext = context.substring(0, maxContextLength);
      console.log(`📏 Context truncated from ${context.length} to ${truncatedContext.length} characters`);
    }
    
    // Prompt semplificato per voice search
    const prompt = {
      role: "system" as const,
      content: `Sei un assistente AI che risponde in italiano. Rispondi basandoti esclusivamente su questo contenuto:

${truncatedContext}

Se non trovi informazioni pertinenti, dillo onestamente.`
    };
    
    console.log("🤖 Invio richiesta a OpenAI...");
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        prompt,
        {
          role: "user" as const,
          content: query
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });
    
    console.log("🤖 OpenAI response status:", response.status);
    console.log("🤖 OpenAI response ok:", response.ok);
    
    const responseData = await response.json();
    console.log("🔍 OpenAI response data:", JSON.stringify(responseData, null, 2));
    console.log("🔍 Choices array:", responseData.choices);
    console.log("🔍 First choice:", responseData.choices?.[0]);
    
    const result = responseData.choices?.[0]?.message?.content || "Non ho trovato una risposta appropriata.";
    
    console.log("🎯 Risposta generata:", result);
    console.log("📚 Fonti utilizzate:", sources.length);
    console.log("✅ Voice search completato con successo");
    
    return NextResponse.json({
      answer: result,
      sources: sources
    });
    
  } catch (error) {
    console.error("❌ Errore voice search:", error);
    return NextResponse.json({ 
      error: "Errore interno del server" 
    }, { status: 500 });
  }
} 