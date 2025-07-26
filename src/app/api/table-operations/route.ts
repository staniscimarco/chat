import { NextRequest, NextResponse } from "next/server";
import { performTableCalculations, generateChartData } from "@/lib/pdf-extractor";
import { ollamaClient } from "@/lib/ollama";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { operation, tableData, chartType } = body;

    if (!tableData || !operation) {
      return NextResponse.json({ error: "Table data and operation are required" }, { status: 400 });
    }

    // Esegui calcoli se richiesto
    if (operation === 'calculate') {
      const { calculationType } = body;
      if (!calculationType) {
        return NextResponse.json({ error: "Calculation type is required" }, { status: 400 });
      }

      const results = performTableCalculations(tableData, calculationType);
      return NextResponse.json({ results });
    }

    // Genera grafico se richiesto
    if (operation === 'chart') {
      if (!chartType) {
        return NextResponse.json({ error: "Chart type is required" }, { status: 400 });
      }

      const chartData = generateChartData(tableData, chartType);
      return NextResponse.json({ chartData });
    }

    // Analisi AI della tabella
    if (operation === 'analyze') {
      const { query } = body;
      if (!query) {
        return NextResponse.json({ error: "Query is required for analysis" }, { status: 400 });
      }

      const analysis = await ollamaClient.processTableCalculations(tableData, query);
      return NextResponse.json({ analysis });
    }

    return NextResponse.json({ error: "Invalid operation" }, { status: 400 });
  } catch (error) {
    console.error("Error in table operations:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 