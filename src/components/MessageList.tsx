import { cn } from "@/lib/utils";
import { Message } from "ai/react";
import { Loader2, User, Bot } from "lucide-react";
import React, { useState } from "react";
import ImageTableDisplay from "./ImageTableDisplay";

type Props = {
  isLoading: boolean;
  messages: Message[];
  onNavigateToPdfPage?: (page: number) => void;
};

// Funzione di utilità per evidenziare parole chiave nel testo
function highlightKeywords(text: string, keywords: string[]): React.ReactNode {
  if (!keywords || keywords.length === 0) return text;
  // Costruisci una regex che evidenzia tutte le parole chiave (case-insensitive)
  const pattern = new RegExp(`(${keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  const parts = text.split(pattern);
  return parts.map((part, i) =>
    keywords.some(k => k.toLowerCase() === part.toLowerCase()) ? (
      <mark key={i} className="bg-yellow-200 text-black px-1 rounded">{part}</mark>
    ) : (
      part
    )
  );
}

// Funzione per convertire tabelle markdown in HTML
function formatTable(text: string): React.ReactNode {
  console.log("🔍 FormatTable chiamata con testo:", text.substring(0, 200) + "...");
  
  // Cerca se il testo contiene una tabella markdown
  if (!text.includes('|') || !text.includes('---')) {
    return text;
  }
  
  // Dividi il testo in righe
  const lines = text.split('\n');
  const result = [];
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    
    // Controlla se questa riga inizia una tabella (contiene |)
    if (line.includes('|') && line.trim().startsWith('|')) {
      console.log("🔍 Trovata riga tabella:", line);
      
      // Raccogli tutte le righe della tabella
      const tableLines = [];
      let headerRow = null;
      let separatorRow = null;
      let dataRows = [];
      
      // Leggi la riga header
      if (i < lines.length) {
        headerRow = lines[i];
        tableLines.push(headerRow);
        i++;
      }
      
      // Leggi la riga separatore
      if (i < lines.length && lines[i].includes('---')) {
        separatorRow = lines[i];
        tableLines.push(separatorRow);
        i++;
      }
      
      // Leggi le righe dati
      while (i < lines.length && lines[i].includes('|')) {
        dataRows.push(lines[i]);
        tableLines.push(lines[i]);
        i++;
      }
      
      // Converti la tabella
      if (headerRow && dataRows.length > 0) {
        const headers = headerRow.split('|').map(h => h.trim()).filter(h => h);
        const tableData = dataRows.map(row => 
          row.split('|').map(cell => cell.trim()).filter(cell => cell)
        );
        
        console.log("🔍 Headers:", headers);
        console.log("🔍 Data:", tableData);
        
        const tableElement = (
          <div key={`table-${i}`} className="my-4 overflow-x-auto">
            <table className="min-w-full border border-gray-300 rounded-lg overflow-hidden shadow-sm">
              <thead className="bg-gray-50">
                <tr>
                  {headers.map((header, idx) => (
                    <th key={idx} className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b border-gray-300">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, rowIdx) => (
                  <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx} className="px-4 py-2 text-sm text-gray-900 border-b border-gray-200">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        
        result.push(tableElement);
      } else {
        // Se non è una tabella valida, aggiungi le righe come testo
        result.push(tableLines.join('\n'));
      }
    } else {
      // Aggiungi la riga normale
      result.push(line);
      i++;
    }
  }
  
  return result.length > 0 ? result : text;
}

// Funzione per gestire la navigazione delle pagine nei messaggi
function formatMessageWithPageNavigation(text: string, onNavigateToPdfPage?: (page: number) => void): React.ReactNode {
  console.log("🔍 formatMessageWithPageNavigation chiamata con:", text.substring(0, 100) + "...");
  console.log("🔍 onNavigateToPdfPage presente:", !!onNavigateToPdfPage);
  
  if (!onNavigateToPdfPage) {
    console.log("❌ onNavigateToPdfPage non presente, ritorno formatTable");
    return formatTable(text);
  }

  // Parse per [PAGES: ...] o [PAGINE: ...] format
  const pageMatch = text.match(/\[PAG(?:ES|INE): ([\d,\s\.]+)\]/);
  console.log("🔍 pageMatch:", pageMatch);
  
  if (pageMatch) {
    const pageNumbers = pageMatch[1].split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p));
    const contentWithoutPages = text.replace(/\s*\[PAG(?:ES|INE): [\d,\s\.]+\]/, '');
    console.log("✅ Pagine trovate:", pageNumbers);
    console.log("✅ Contenuto senza pagine:", contentWithoutPages.substring(0, 100) + "...");
    
    return (
      <div>
        <div>{formatTable(contentWithoutPages)}</div>
        <div className="mt-2 text-xs text-blue-600">
          <span className="font-medium">Pagine: </span>
          {pageNumbers.map((page, index) => (
            <button
              key={page}
              onClick={() => onNavigateToPdfPage(page)}
              className="inline-block px-2 py-1 mx-1 bg-blue-100 hover:bg-blue-200 rounded transition-colors"
            >
              {page}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Fallback: Parse per "pagina X" format
  const oldPageMatch = text.match(/pagina\s+(\d+)/i);
  
  if (oldPageMatch) {
    const pageNumber = parseInt(oldPageMatch[1]);
    const beforePage = text.substring(0, oldPageMatch.index);
    const afterPage = text.substring(oldPageMatch.index! + oldPageMatch[0].length);
    
    return (
      <span>
        {formatTable(beforePage)}
        <button
          onClick={() => onNavigateToPdfPage(pageNumber)}
          className="text-blue-600 hover:text-blue-800 underline font-medium"
        >
          pagina {pageNumber}
        </button>
        {formatTable(afterPage)}
      </span>
    );
  }

  return formatTable(text);
}

const MessageList = ({ messages, isLoading, onNavigateToPdfPage }: Props) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showAllImages, setShowAllImages] = useState(false);

  // Trova l'ultimo messaggio assistant con immagini
  const lastAssistantWithImages = [...messages].reverse().find(
    (m: any) => m.role === 'assistant' && (m as any).images && Array.isArray((m as any).images) && (m as any).images.length > 0
  );
  const allImages = (lastAssistantWithImages as any)?.images || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
          <p className="text-gray-500 text-sm">Caricamento messaggi...</p>
        </div>
      </div>
    );
  }
  
  if (!messages || messages.length === 0) return null;
  
  return (
    <div className="flex flex-col space-y-6 p-6">
      {/* Pulsante mostra tutte le immagini del PDF */}
      {allImages.length > 0 && (
        <div className="flex justify-center mb-4">
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition"
            onClick={() => setShowAllImages((v) => !v)}
          >
            {showAllImages ? 'Nascondi tutte le immagini del PDF' : 'Mostra tutte le immagini del PDF'}
          </button>
        </div>
      )}
      {/* Visualizzazione tutte le immagini */}
      {showAllImages && allImages.length > 0 && (
        <div className="flex flex-wrap gap-4 justify-center mb-8">
          {allImages.map((img: any, idx: number) => (
            <div key={img.url + idx} className="border rounded-lg p-2 bg-gray-50 flex flex-col items-center max-w-xs">
              <img
                src={img.url}
                alt={`Tabella o immagine pagina ${img.page}`}
                className="max-w-xs max-h-60 rounded shadow mb-2 cursor-pointer hover:scale-105 transition-transform"
                onClick={() => {
                  setLightboxImages(allImages.map((i: any) => i.url));
                  setLightboxIndex(idx);
                  setLightboxOpen(true);
                }}
              />
              <div className="flex gap-2 mt-1">
                <a href={img.url} download target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline">Download</a>
              </div>
              {img.ocrText && (
                <div className="text-xs text-gray-700 bg-gray-100 rounded p-2 mt-2">
                  <strong>Testo OCR:</strong> <span className="whitespace-pre-wrap">{img.ocrText.trim()}</span>
                </div>
              )}
              <div className="text-xs text-gray-400 mt-1">
                Pagina: {onNavigateToPdfPage ? (
                  <button
                    className="underline text-blue-600 hover:text-blue-800 cursor-pointer"
                    onClick={() => onNavigateToPdfPage(img.page)}
                  >
                    {img.page}
                  </button>
                ) : (
                  img.page
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {messages.map((message, index) => {
        const isUser = message.role === "user";
        const isAssistant = message.role === "assistant";
        
        return (
          <div
            key={message.id}
            className={cn("flex items-start space-x-3", {
              "flex-row-reverse space-x-reverse": isUser,
            })}
          >
            {/* Avatar */}
            <div className={cn(
              "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
              {
                "bg-gradient-to-r from-blue-500 to-purple-600": isUser,
                "bg-gradient-to-r from-gray-500 to-gray-600": isAssistant,
              }
            )}>
              {isUser ? (
                <User className="w-4 h-4 text-white" />
              ) : (
                <Bot className="w-4 h-4 text-white" />
              )}
            </div>
            
            {/* Message Content */}
            <div className={cn(
              "flex-1 max-w-3xl",
              {
                "text-right": isUser,
              }
            )}>
              <div className={cn(
                "inline-block rounded-2xl px-4 py-3 shadow-sm",
                {
                  "bg-gradient-to-r from-blue-600 to-purple-600 text-white": isUser,
                  "bg-white border border-gray-200 text-gray-900": isAssistant,
                }
              )}>
                <div className={cn(
                  "prose prose-sm max-w-none",
                  {
                    "text-white": isUser,
                    "text-gray-900": isAssistant,
                  }
                )}>
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {(() => {
                      console.log("🔍 Rendering messaggio:", message.content.substring(0, 100) + "...");
                      return formatMessageWithPageNavigation(message.content, onNavigateToPdfPage);
                    })()}
                  </div>
                  {/* Visualizza immagini e testo OCR se presenti */}
                  {isAssistant && (message as any).images && Array.isArray((message as any).images) && (
                    <div className="mt-4 flex flex-wrap gap-4">
                      {(message as any).images.map((img: any, idx: number) => (
                        <div key={img.url + idx} className="border rounded-lg p-2 bg-gray-50 flex flex-col items-center max-w-xs">
                          <img
                            src={img.url}
                            alt={`Tabella o immagine pagina ${img.page}`}
                            className="max-w-xs max-h-60 rounded shadow mb-2 cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => {
                              setLightboxImages((message as any).images.map((i: any) => i.url));
                              setLightboxIndex(idx);
                              setLightboxOpen(true);
                            }}
                          />
                          <div className="flex gap-2 mt-1">
                            <a href={img.url} download target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline">Download</a>
                          </div>
                          {img.ocrText && (
                            <div className="text-xs text-gray-700 bg-gray-100 rounded p-2 mt-2">
                              <strong>Testo OCR:</strong> <span className="whitespace-pre-wrap">{
                                highlightKeywords(
                                  img.ocrText.trim(),
                                  (message as any).keywords || []
                                )
                              }</span>
                            </div>
                          )}
                          <div className="text-xs text-gray-400 mt-1">
                            Pagina: {onNavigateToPdfPage ? (
                              <button
                                className="underline text-blue-600 hover:text-blue-800 cursor-pointer"
                                onClick={() => onNavigateToPdfPage(img.page)}
                              >
                                {img.page}
                              </button>
                            ) : (
                              img.page
                            )}
                          </div>
                        </div>
                      ))}
                      {lightboxOpen && (
                        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                          <div className="relative max-w-4xl max-h-full">
                            <button
                              onClick={() => setLightboxOpen(false)}
                              className="absolute top-4 right-4 text-white text-2xl bg-black bg-opacity-50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-75"
                            >
                              ×
                            </button>
                            <img
                              src={lightboxImages[lightboxIndex]}
                              alt="Lightbox"
                              className="max-w-full max-h-full object-contain"
                            />
                            {lightboxImages.length > 1 && (
                              <div className="absolute inset-0 flex items-center justify-between p-4">
                                <button
                                  onClick={() => setLightboxIndex((lightboxIndex + lightboxImages.length - 1) % lightboxImages.length)}
                                  className="text-white text-2xl bg-black bg-opacity-50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-75"
                                >
                                  ‹
                                </button>
                                <button
                                  onClick={() => setLightboxIndex((lightboxIndex + 1) % lightboxImages.length)}
                                  className="text-white text-2xl bg-black bg-opacity-50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-75"
                                >
                                  ›
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Message Time */}
              <div className={cn(
                "text-xs text-gray-400 mt-2",
                {
                  "text-right": isUser,
                  "text-left": isAssistant,
                }
              )}>
                {new Date().toLocaleTimeString('it-IT', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MessageList;
