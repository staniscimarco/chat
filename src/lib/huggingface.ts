import axios from 'axios';

export interface HuggingFaceConfig {
  apiKey?: string;
  model: string;
  maxLength?: number;
  temperature?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  text: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Configurazione predefinita per Hugging Face
 */
const DEFAULT_CONFIG: HuggingFaceConfig = {
  model: 'microsoft/DialoGPT-medium', // Modello gratuito e multilingue
  maxLength: 1000,
  temperature: 0.7
};

/**
 * Classe per gestire le chiamate a Hugging Face
 */
export class HuggingFaceClient {
  private config: HuggingFaceConfig;
  private baseUrl: string;

  constructor(config: Partial<HuggingFaceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.baseUrl = 'https://api-inference.huggingface.co/models';
  }

  /**
   * Genera una risposta di chat usando Hugging Face
   */
  async chat(messages: ChatMessage[]): Promise<ChatResponse> {
    try {
      // Prepara il prompt combinando tutti i messaggi
      const prompt = this.formatMessagesToPrompt(messages);
      
      const response = await axios.post(
        `${this.baseUrl}/${this.config.model}`,
        {
          inputs: prompt,
          parameters: {
            max_length: this.config.maxLength,
            temperature: this.config.temperature,
            do_sample: true,
            return_full_text: false
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey || process.env.HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 secondi di timeout
        }
      );

      return {
        text: response.data[0]?.generated_text || 'Non sono riuscito a generare una risposta.',
        usage: {
          prompt_tokens: prompt.length,
          completion_tokens: response.data[0]?.generated_text?.length || 0,
          total_tokens: prompt.length + (response.data[0]?.generated_text?.length || 0)
        }
      };
    } catch (error) {
      console.error('Errore nella chiamata a Hugging Face:', error);
      throw new Error(`Errore nella generazione della risposta: ${error}`);
    }
  }

  /**
   * Genera embeddings usando un modello di Hugging Face
   */
  async generateEmbeddings(text: string): Promise<number[]> {
    try {
      // Usa un modello di embedding gratuito
      const embeddingModel = 'sentence-transformers/all-MiniLM-L6-v2';
      
      const response = await axios.post(
        `${this.baseUrl}/${embeddingModel}`,
        {
          inputs: text,
          options: {
            wait_for_model: true
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey || process.env.HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data[0];
    } catch (error) {
      console.error('Errore nella generazione embeddings:', error);
      throw new Error(`Errore nella generazione embeddings: ${error}`);
    }
  }

  /**
   * Formatta i messaggi in un prompt per il modello
   */
  private formatMessagesToPrompt(messages: ChatMessage[]): string {
    let prompt = '';
    
    for (const message of messages) {
      switch (message.role) {
        case 'system':
          prompt += `[SISTEMA] ${message.content}\n`;
          break;
        case 'user':
          prompt += `[UTENTE] ${message.content}\n`;
          break;
        case 'assistant':
          prompt += `[ASSISTENTE] ${message.content}\n`;
          break;
      }
    }
    
    prompt += '[ASSISTENTE]';
    return prompt;
  }

  /**
   * Analizza il contenuto di un documento (testo, immagini, tabelle)
   */
  async analyzeContent(content: {
    text?: string;
    images?: Array<{ url: string; ocrText: string; type: string }>;
    tables?: Array<{ data: any[][]; headers: string[]; tableText: string }>;
  }, query: string): Promise<string> {
    try {
      let analysisPrompt = `Analizza il seguente contenuto e rispondi alla domanda: "${query}"\n\n`;
      
      if (content.text) {
        analysisPrompt += `TESTO:\n${content.text}\n\n`;
      }
      
      if (content.images && content.images.length > 0) {
        analysisPrompt += `IMMAGINI TROVATE:\n`;
        content.images.forEach((img, index) => {
          analysisPrompt += `Immagine ${index + 1} (${img.type}): ${img.ocrText}\n`;
        });
        analysisPrompt += '\n';
      }
      
      if (content.tables && content.tables.length > 0) {
        analysisPrompt += `TABELLE TROVATE:\n`;
        content.tables.forEach((table, index) => {
          analysisPrompt += `Tabella ${index + 1}:\n`;
          analysisPrompt += `Headers: ${table.headers.join(' | ')}\n`;
          analysisPrompt += `Dati: ${table.data.map(row => row.join(' | ')).join('\n')}\n\n`;
        });
      }
      
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: 'Sei un assistente AI esperto nell\'analisi di documenti PDF. Analizza attentamente il contenuto fornito e rispondi in modo chiaro e dettagliato. Se ci sono tabelle, puoi fare calcoli e analisi sui dati. Se ci sono immagini, descrivile e analizzane il contenuto.'
        },
        {
          role: 'user',
          content: analysisPrompt
        }
      ];
      
      const response = await this.chat(messages);
      return response.text;
    } catch (error) {
      console.error('Errore nell\'analisi del contenuto:', error);
      return 'Mi dispiace, non sono riuscito ad analizzare il contenuto.';
    }
  }

  /**
   * Esegue calcoli su tabelle e genera grafici
   */
  async processTableCalculations(table: {
    data: any[][];
    headers: string[];
    tableText: string;
  }, operation: string): Promise<string> {
    try {
      const calculationPrompt = `
        Analizza la seguente tabella e esegui l'operazione richiesta: "${operation}"
        
        Tabella:
        Headers: ${table.headers.join(' | ')}
        Dati: ${table.data.map(row => row.join(' | ')).join('\n')}
        
        Operazioni disponibili:
        - sum: somma di tutte le colonne numeriche
        - average: media di tutte le colonne numeriche
        - max: valore massimo di tutte le colonne numeriche
        - min: valore minimo di tutte le colonne numeriche
        - calcoli matematici personalizzati (es: "2+3*4")
        
        Fornisci i risultati in formato chiaro e dettagliato.
      `;
      
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: 'Sei un assistente esperto in calcoli matematici e analisi di dati tabellari. Esegui i calcoli richiesti e fornisci spiegazioni chiare dei risultati.'
        },
        {
          role: 'user',
          content: calculationPrompt
        }
      ];
      
      const response = await this.chat(messages);
      return response.text;
    } catch (error) {
      console.error('Errore nell\'elaborazione dei calcoli:', error);
      return 'Mi dispiace, non sono riuscito ad eseguire i calcoli richiesti.';
    }
  }
}

/**
 * Istanza predefinita del client Hugging Face
 */
export const huggingFaceClient = new HuggingFaceClient();

/**
 * Funzione di utilità per generare embeddings con Hugging Face
 */
export async function getHuggingFaceEmbeddings(text: string): Promise<number[]> {
  return await huggingFaceClient.generateEmbeddings(text);
}

/**
 * Funzione di utilità per la chat con Hugging Face
 */
export async function chatWithHuggingFace(messages: ChatMessage[]): Promise<ChatResponse> {
  return await huggingFaceClient.chat(messages);
} 