import { PDFDocument } from 'pdf-lib';
import * as math from 'mathjs';
import { ocrImageBuffer } from './utils';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

export interface ExtractedImage {
  page: number;
  imageBuffer: Buffer;
  url: string;
  ocrText: string;
  type: 'image';
  confidence: number;
  width?: number;
  height?: number;
  format?: string;
}

export interface ExtractedTable {
  page: number;
  data: any[][];
  headers: string[];
  tableText: string;
  url: string;
}

export interface TableCalculation {
  operation: string;
  result: number | string;
  description: string;
}

/**
 * Estrae le immagini dalle pagine del PDF (DISABILITATO)
 */
export async function extractImagesFromPDF(pdfBuffer: Buffer): Promise<ExtractedImage[]> {
  console.log('🖼️ Estrazione immagini DISABILITATA');
  return [];
}

/**
 * Rileva se un'immagine contiene una tabella basandosi sul testo OCR
 */
function detectTableFromOCR(ocrText: string): boolean {
  const tableIndicators = [
    /\d+\s*\|\s*\d+/, // Pattern con pipe
    /\d+\s*\t\s*\d+/, // Pattern con tab
    /\d+\s{3,}\d+/,   // Pattern con spazi multipli
    /[A-Za-z]+\s*\|\s*[A-Za-z]+/, // Header con pipe
    /^\s*\d+\.\s*\d+\.\s*\d+/m,   // Numeri con punti
    /^\s*[A-Za-z]+\s+\d+/m        // Testo seguito da numeri
  ];

  const lines = ocrText.split('\n');
  let tableLineCount = 0;

  for (const line of lines) {
    for (const pattern of tableIndicators) {
      if (pattern.test(line)) {
        tableLineCount++;
        break;
      }
    }
  }

  // Se più del 30% delle righe sembra essere una tabella
  return tableLineCount / lines.length > 0.3;
}

/**
 * Estrae tabelle da un'immagine usando OCR
 */
export async function extractTableFromImage(imageBuffer: Buffer): Promise<ExtractedTable | null> {
  try {
    const ocrText = await ocrImageBuffer(imageBuffer);
    
    if (!detectTableFromOCR(ocrText)) {
      return null;
    }

    // Parsing del testo OCR per estrarre la struttura della tabella
    const tableData = parseTableFromOCR(ocrText);
    
    if (!tableData || tableData.data.length === 0) {
      return null;
    }

    return {
      page: 1, // Sarà aggiornato dal chiamante
      data: tableData.data,
      headers: tableData.headers,
      tableText: ocrText,
      url: `data:image/png;base64,${imageBuffer.toString('base64')}`
    };
  } catch (error) {
    console.error('Errore nell\'estrazione tabella dall\'immagine:', error);
    return null;
  }
}

/**
 * Parsing del testo OCR per estrarre la struttura della tabella
 */
function parseTableFromOCR(ocrText: string): { data: any[][], headers: string[] } | null {
  const lines = ocrText.split('\n').filter(line => line.trim().length > 0);
  
  if (lines.length < 2) return null;

  const tableData: any[][] = [];
  let headers: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Dividi la riga usando vari separatori
    const cells = line.split(/[\|\t]+|\s{3,}/).map(cell => cell.trim()).filter(cell => cell.length > 0);
    
    if (cells.length === 0) continue;

    if (i === 0) {
      // Prima riga come header
      headers = cells;
    } else {
      // Righe successive come dati
      const rowData = cells.map(cell => {
        // Prova a convertire in numero se possibile
        const num = parseFloat(cell.replace(/[^\d.-]/g, ''));
        return isNaN(num) ? cell : num;
      });
      tableData.push(rowData);
    }
  }

  return { data: tableData, headers };
}

/**
 * Esegue calcoli su una tabella
 */
export function performTableCalculations(table: ExtractedTable, operation: string): TableCalculation[] {
  const results: TableCalculation[] = [];
  
  try {
    switch (operation.toLowerCase()) {
      case 'sum':
        // Somma di tutte le colonne numeriche
        for (let colIndex = 0; colIndex < table.headers.length; colIndex++) {
          const column = table.data.map(row => row[colIndex]).filter(val => typeof val === 'number');
          if (column.length > 0) {
            const sum = column.reduce((acc, val) => acc + val, 0);
            results.push({
              operation: `Somma ${table.headers[colIndex]}`,
              result: sum,
              description: `Somma della colonna "${table.headers[colIndex]}": ${sum}`
            });
          }
        }
        break;

      case 'average':
        // Media di tutte le colonne numeriche
        for (let colIndex = 0; colIndex < table.headers.length; colIndex++) {
          const column = table.data.map(row => row[colIndex]).filter(val => typeof val === 'number');
          if (column.length > 0) {
            const avg = column.reduce((acc, val) => acc + val, 0) / column.length;
            results.push({
              operation: `Media ${table.headers[colIndex]}`,
              result: avg,
              description: `Media della colonna "${table.headers[colIndex]}": ${avg.toFixed(2)}`
            });
          }
        }
        break;

      case 'max':
        // Massimo di tutte le colonne numeriche
        for (let colIndex = 0; colIndex < table.headers.length; colIndex++) {
          const column = table.data.map(row => row[colIndex]).filter(val => typeof val === 'number');
          if (column.length > 0) {
            const max = Math.max(...column);
            results.push({
              operation: `Massimo ${table.headers[colIndex]}`,
              result: max,
              description: `Valore massimo della colonna "${table.headers[colIndex]}": ${max}`
            });
          }
        }
        break;

      case 'min':
        // Minimo di tutte le colonne numeriche
        for (let colIndex = 0; colIndex < table.headers.length; colIndex++) {
          const column = table.data.map(row => row[colIndex]).filter(val => typeof val === 'number');
          if (column.length > 0) {
            const min = Math.min(...column);
            results.push({
              operation: `Minimo ${table.headers[colIndex]}`,
              result: min,
              description: `Valore minimo della colonna "${table.headers[colIndex]}": ${min}`
            });
          }
        }
        break;

      default:
        // Calcolo personalizzato usando mathjs
        try {
          const result = math.evaluate(operation);
          results.push({
            operation: `Calcolo: ${operation}`,
            result: result,
            description: `Risultato del calcolo "${operation}": ${result}`
          });
        } catch (error) {
          results.push({
            operation: `Errore nel calcolo`,
            result: 'Errore',
            description: `Impossibile eseguire il calcolo: ${operation}`
          });
        }
    }
  } catch (error) {
    results.push({
      operation: 'Errore',
      result: 'Errore',
      description: `Errore nell'esecuzione dei calcoli: ${error}`
    });
  }

  return results;
}

/**
 * Genera dati per grafici da una tabella
 */
export function generateChartData(table: ExtractedTable, chartType: 'bar' | 'line' | 'pie'): any {
  try {
    switch (chartType) {
      case 'bar':
        return {
          labels: table.headers,
          datasets: [{
            label: 'Valori',
            data: table.data[0] || [],
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          }]
        };

      case 'line':
        return {
          labels: table.headers,
          datasets: [{
            label: 'Valori',
            data: table.data[0] || [],
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.1
          }]
        };

      case 'pie':
        return {
          labels: table.headers,
          datasets: [{
            data: table.data[0] || [],
            backgroundColor: [
              'rgba(255, 99, 132, 0.2)',
              'rgba(54, 162, 235, 0.2)',
              'rgba(255, 206, 86, 0.2)',
              'rgba(75, 192, 192, 0.2)',
              'rgba(153, 102, 255, 0.2)',
            ],
            borderColor: [
              'rgba(255, 99, 132, 1)',
              'rgba(54, 162, 235, 1)',
              'rgba(255, 206, 86, 1)',
              'rgba(75, 192, 192, 1)',
              'rgba(153, 102, 255, 1)',
            ],
            borderWidth: 1
          }]
        };

      default:
        return null;
    }
  } catch (error) {
    console.error('Errore nella generazione dati grafico:', error);
    return null;
  }
} 