import { NextResponse } from "next/server";
import { loadS3IntoPinecone } from "@/lib/pinecone";
import { db } from "@/lib/db";
import { chats } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { chatId } = body;
    
    if (!chatId) {
      return NextResponse.json({ error: "Chat ID is required" }, { status: 400 });
    }
    
    console.log("🔄 Reloading Pinecone for chat:", chatId);
    
    // Get chat from database
    const chatResult = await db.select().from(chats).where(eq(chats.id, chatId));
    
    if (chatResult.length === 0) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }
    
    const chat = chatResult[0];
    console.log("📄 Found chat:", chat.pdfName, "with fileKey:", chat.fileKey);
    
    // Reload into Pinecone
    await loadS3IntoPinecone(chat.fileKey);
    
    return NextResponse.json({
      success: true,
      message: `PDF "${chat.pdfName}" reloaded into Pinecone successfully`,
      fileKey: chat.fileKey
    });
    
  } catch (error) {
    console.error("❌ Reload Pinecone error:", error);
    return NextResponse.json({ 
      error: "Failed to reload Pinecone", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
} 