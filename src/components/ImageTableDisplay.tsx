"use client";

import React, { useState } from 'react';

interface ImageData {
  url: string;
  ocrText: string;
  type: 'image' | 'table';
  page: number;
}

interface TableData {
  data: any[][];
  headers: string[];
  tableText: string;
  url: string;
  page: number;
}

interface TableCalculation {
  operation: string;
  result: number | string;
  description: string;
}

interface ImageTableDisplayProps {
  images: ImageData[];
  tables: TableData[];
  onCalculate?: (tableIndex: number, operation: string) => Promise<TableCalculation[]>;
  onGenerateChart?: (tableIndex: number, chartType: 'bar' | 'line' | 'pie') => Promise<any>;
}

export default function ImageTableDisplay({ 
  images, 
  tables, 
  onCalculate, 
  onGenerateChart 
}: ImageTableDisplayProps) {
  const [calculations, setCalculations] = useState<Record<number, TableCalculation[]>>({});
  const [chartData, setChartData] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const handleCalculate = async (tableIndex: number, operation: string) => {
    if (!onCalculate) return;
    
    setLoading(prev => ({ ...prev, [`calc-${tableIndex}`]: true }));
    try {
      const results = await onCalculate(tableIndex, operation);
      setCalculations(prev => ({ ...prev, [tableIndex]: results }));
    } catch (error) {
      console.error('Errore nel calcolo:', error);
    } finally {
      setLoading(prev => ({ ...prev, [`calc-${tableIndex}`]: false }));
    }
  };

  const handleGenerateChart = async (tableIndex: number, chartType: 'bar' | 'line' | 'pie') => {
    if (!onGenerateChart) return;
    
    setLoading(prev => ({ ...prev, [`chart-${tableIndex}`]: true }));
    try {
      const data = await onGenerateChart(tableIndex, chartType);
      setChartData(prev => ({ ...prev, [tableIndex]: { data, type: chartType } }));
    } catch (error) {
      console.error('Errore nella generazione grafico:', error);
    } finally {
      setLoading(prev => ({ ...prev, [`chart-${tableIndex}`]: false }));
    }
  };

  const renderChart = (data: any, type: string) => {
    if (!data) return null;

    // Per ora, mostriamo solo i dati in formato tabella
    // In futuro, si possono aggiungere librerie di grafici
    return (
      <div className="w-full p-4 bg-gray-50 rounded">
        <div className="text-sm font-medium text-gray-700 mb-2">
          Dati per grafico {type}:
        </div>
        <div className="text-xs text-gray-600">
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Immagini */}
      {images.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Immagini trovate</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((image, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4">
                  <div className="text-sm text-gray-600 mb-2">
                    Pagina {image.page} - {image.type === 'table' ? 'Tabella' : 'Immagine'}
                  </div>
                  <img 
                    src={image.url} 
                    alt={`Immagine pagina ${image.page}`}
                    className="w-full h-48 object-contain border rounded"
                  />
                  {image.ocrText && (
                    <div className="mt-3">
                      <div className="text-sm font-medium text-gray-700 mb-1">Testo estratto:</div>
                      <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded max-h-20 overflow-y-auto">
                        {image.ocrText}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabelle */}
      {tables.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Tabelle trovate</h3>
          {tables.map((table, tableIndex) => (
            <div key={tableIndex} className="bg-white rounded-lg shadow-md p-6">
              <div className="text-sm text-gray-600 mb-3">
                Pagina {table.page}
              </div>
              
              {/* Tabella */}
              <div className="overflow-x-auto mb-4">
                <table className="min-w-full border border-gray-300">
                  <thead>
                    <tr>
                      {table.headers.map((header, index) => (
                        <th key={index} className="border border-gray-300 px-3 py-2 bg-gray-50 text-left text-sm font-medium text-gray-700">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.data.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className="border border-gray-300 px-3 py-2 text-sm text-gray-900">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Controlli per calcoli e grafici */}
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleCalculate(tableIndex, 'sum')}
                    disabled={loading[`calc-${tableIndex}`]}
                    className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:opacity-50"
                  >
                    {loading[`calc-${tableIndex}`] ? 'Calcolando...' : 'Somma'}
                  </button>
                  <button
                    onClick={() => handleCalculate(tableIndex, 'average')}
                    disabled={loading[`calc-${tableIndex}`]}
                    className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 disabled:opacity-50"
                  >
                    Media
                  </button>
                  <button
                    onClick={() => handleCalculate(tableIndex, 'max')}
                    disabled={loading[`calc-${tableIndex}`]}
                    className="px-3 py-1 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600 disabled:opacity-50"
                  >
                    Massimo
                  </button>
                  <button
                    onClick={() => handleCalculate(tableIndex, 'min')}
                    disabled={loading[`calc-${tableIndex}`]}
                    className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 disabled:opacity-50"
                  >
                    Minimo
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleGenerateChart(tableIndex, 'bar')}
                    disabled={loading[`chart-${tableIndex}`]}
                    className="px-3 py-1 bg-purple-500 text-white text-sm rounded hover:bg-purple-600 disabled:opacity-50"
                  >
                    {loading[`chart-${tableIndex}`] ? 'Generando...' : 'Grafico a barre'}
                  </button>
                  <button
                    onClick={() => handleGenerateChart(tableIndex, 'line')}
                    disabled={loading[`chart-${tableIndex}`]}
                    className="px-3 py-1 bg-indigo-500 text-white text-sm rounded hover:bg-indigo-600 disabled:opacity-50"
                  >
                    Grafico a linee
                  </button>
                  <button
                    onClick={() => handleGenerateChart(tableIndex, 'pie')}
                    disabled={loading[`chart-${tableIndex}`]}
                    className="px-3 py-1 bg-pink-500 text-white text-sm rounded hover:bg-pink-600 disabled:opacity-50"
                  >
                    Grafico a torta
                  </button>
                </div>
              </div>

              {/* Risultati calcoli */}
              {calculations[tableIndex] && (
                <div className="mt-4 p-3 bg-blue-50 rounded">
                  <div className="text-sm font-medium text-blue-900 mb-2">Risultati calcoli:</div>
                  {calculations[tableIndex].map((calc, calcIndex) => (
                    <div key={calcIndex} className="text-sm text-blue-800">
                      <strong>{calc.operation}:</strong> {calc.description}
                    </div>
                  ))}
                </div>
              )}

              {/* Grafico */}
              {chartData[tableIndex] && (
                <div className="mt-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    Grafico {chartData[tableIndex].type === 'bar' ? 'a barre' : 
                             chartData[tableIndex].type === 'line' ? 'a linee' : 'a torta'}:
                  </div>
                  {renderChart(chartData[tableIndex].data, chartData[tableIndex].type)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 