import { NextResponse } from "next/server";
import { getEmbeddings } from "@/lib/embeddings";
import { convertToAscii } from "@/lib/utils";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { query, fileKey } = body;
    
    if (!query || !fileKey) {
      return NextResponse.json({ error: "Query and fileKey are required" }, { status: 400 });
    }
    
    console.log("🧪 Testing Pinecone with query:", query);
    console.log("🧪 File key:", fileKey);
    
    // Test embeddings
    const queryEmbeddings = await getEmbeddings(query);
    console.log("🧪 Embeddings created, length:", queryEmbeddings.length);
    
    // Test Pinecone query
    const { Pinecone } = await import("@pinecone-database/pinecone");
    
    const client = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
    
    const pineconeIndex = client.index("chatpdf");
    const namespace = convertToAscii(fileKey);
    
    console.log("🧪 Querying namespace:", namespace);
    
    const queryResult = await pineconeIndex.namespace(namespace).query({
      vector: queryEmbeddings,
      topK: 10,
      includeMetadata: true,
    });
    
    console.log("🧪 Query result:", {
      matches: queryResult.matches?.length || 0,
      scores: queryResult.matches?.map(m => m.score).slice(0, 5)
    });
    
    return NextResponse.json({
      success: true,
      namespace,
      matchesCount: queryResult.matches?.length || 0,
      scores: queryResult.matches?.map(m => m.score).slice(0, 5),
      sampleMatches: queryResult.matches?.slice(0, 3).map(m => ({
        score: m.score,
        metadata: m.metadata
      }))
    });
    
  } catch (error) {
    console.error("❌ Test Pinecone error:", error);
    return NextResponse.json({ 
      error: "Test failed", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
} 