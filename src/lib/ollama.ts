import axios from 'axios';

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

export interface OllamaConfig {
  baseUrl?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Configurazione predefinita per Ollama
 */
const DEFAULT_CONFIG: OllamaConfig = {
  baseUrl: 'http://localhost:11434',
  model: 'mistral', // Modello multilingue con supporto italiano
  maxTokens: 1000,
  temperature: 0.7
};

/**
 * Classe per gestire le chiamate a Ollama
 */
export class OllamaClient {
  private config: OllamaConfig;
  private baseUrl: string;

  constructor(config: Partial<OllamaConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.baseUrl = this.config.baseUrl || 'http://localhost:11434';
  }

  /**
   * Genera una risposta di chat usando Ollama
   */
  async chat(messages: ChatMessage[]): Promise<ChatResponse> {
    try {
      // Prepara il prompt combinando tutti i messaggi
      const prompt = this.formatMessagesToPrompt(messages);
      
      const response = await axios.post(
        `${this.baseUrl}/api/generate`,
        {
          model: this.config.model,
          prompt: prompt,
          stream: false,
          options: {
            temperature: this.config.temperature,
            num_predict: this.config.maxTokens
          }
        },
        {
          timeout: 60000 // 60 secondi di timeout per Ollama
        }
      );

      return {
        text: response.data.response || 'Non sono riuscito a generare una risposta.',
        usage: {
          prompt_tokens: prompt.length,
          completion_tokens: response.data.response?.length || 0,
          total_tokens: prompt.length + (response.data.response?.length || 0)
        }
      };
    } catch (error) {
      console.error('Errore nella chiamata a Ollama:', error);
      throw new Error(`Errore nella generazione della risposta: ${error}`);
    }
  }

  /**
   * Analizza contenuto con immagini, tabelle e testo
   */
  async analyzeContent(content: {
    text?: string;
    images?: Array<{ url: string; ocrText: string; type: string }>;
    tables?: Array<{ data: any[][]; headers: string[]; tableText: string }>;
  }, query: string): Promise<string> {
    try {
      let prompt = `Analizza il seguente contenuto e rispondi alla domanda: "${query}"\n\n`;
      
      if (content.text) {
        prompt += `TESTO:\n${content.text}\n\n`;
      }
      
      if (content.images && content.images.length > 0) {
        prompt += `IMMAGINI:\n`;
        content.images.forEach((img, index) => {
          prompt += `Immagine ${index + 1}: ${img.type}\n`;
          if (img.ocrText) {
            prompt += `Testo estratto: ${img.ocrText}\n`;
          }
        });
        prompt += '\n';
      }
      
      if (content.tables && content.tables.length > 0) {
        prompt += `TABELLE:\n`;
        content.tables.forEach((table, index) => {
          prompt += `Tabella ${index + 1}:\n`;
          prompt += `Intestazioni: ${table.headers.join(', ')}\n`;
          prompt += `Dati: ${table.tableText}\n`;
        });
        prompt += '\n';
      }
      
      prompt += `Rispondi in italiano in modo dettagliato e utile.`;
      
      const response = await axios.post(
        `${this.baseUrl}/api/generate`,
        {
          model: this.config.model,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.7,
            num_predict: 1500
          }
        },
        {
          timeout: 60000
        }
      );

      return response.data.response || 'Non sono riuscito ad analizzare il contenuto.';
    } catch (error) {
      console.error('Errore nell\'analisi del contenuto con Ollama:', error);
      throw new Error(`Errore nell'analisi: ${error}`);
    }
  }

  /**
   * Processa calcoli su tabelle
   */
  async processTableCalculations(table: {
    data: any[][];
    headers: string[];
    tableText: string;
  }, operation: string): Promise<string> {
    try {
      const prompt = `Analizza questa tabella e esegui l'operazione richiesta: "${operation}"\n\n` +
        `Intestazioni: ${table.headers.join(', ')}\n` +
        `Dati: ${table.tableText}\n\n` +
        `Rispondi in italiano con i calcoli dettagliati e i risultati.`;
      
      const response = await axios.post(
        `${this.baseUrl}/api/generate`,
        {
          model: this.config.model,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.3, // Più deterministico per calcoli
            num_predict: 1000
          }
        },
        {
          timeout: 60000
        }
      );

      return response.data.response || 'Non sono riuscito a processare i calcoli.';
    } catch (error) {
      console.error('Errore nei calcoli con Ollama:', error);
      throw new Error(`Errore nei calcoli: ${error}`);
    }
  }

  /**
   * Genera dati per grafici
   */
  async generateChartData(table: {
    data: any[][];
    headers: string[];
    tableText: string;
  }, chartType: string): Promise<string> {
    try {
      const prompt = `Analizza questa tabella e genera dati per un grafico ${chartType}:\n\n` +
        `Intestazioni: ${table.headers.join(', ')}\n` +
        `Dati: ${table.tableText}\n\n` +
        `Rispondi in formato JSON con i dati strutturati per il grafico.`;
      
      const response = await axios.post(
        `${this.baseUrl}/api/generate`,
        {
          model: this.config.model,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.3,
            num_predict: 800
          }
        },
        {
          timeout: 60000
        }
      );

      return response.data.response || 'Non sono riuscito a generare i dati del grafico.';
    } catch (error) {
      console.error('Errore nella generazione grafico con Ollama:', error);
      throw new Error(`Errore nella generazione grafico: ${error}`);
    }
  }

  /**
   * Formatta i messaggi in un prompt per Ollama
   */
  private formatMessagesToPrompt(messages: ChatMessage[]): string {
    let prompt = '';
    
    messages.forEach(message => {
      if (message.role === 'system') {
        prompt += `[SISTEMA] ${message.content}\n\n`;
      } else if (message.role === 'user') {
        prompt += `[UTENTE] ${message.content}\n\n`;
      } else if (message.role === 'assistant') {
        prompt += `[ASSISTENTE] ${message.content}\n\n`;
      }
    });
    
    prompt += '[ASSISTENTE] ';
    return prompt;
  }

  /**
   * Verifica se Ollama è disponibile
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}

// Esporta un'istanza predefinita
export const ollamaClient = new OllamaClient();

// Funzioni di utilità
export async function chatWithOllama(messages: ChatMessage[]): Promise<ChatResponse> {
  return await ollamaClient.chat(messages);
}

export async function analyzeContentWithOllama(content: {
  text?: string;
  images?: Array<{ url: string; ocrText: string; type: string }>;
  tables?: Array<{ data: any[][]; headers: string[]; tableText: string }>;
}, query: string): Promise<string> {
  return await ollamaClient.analyzeContent(content, query);
} 