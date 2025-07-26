import { db } from "@/lib/db";
import { chats } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    // Get userId from session
    const url = new URL(req.url);
    const authResponse = await fetch(`${url.origin}/api/auth/me`, {
      headers: req.headers,
    });
    
    if (!authResponse.ok) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const authData = await authResponse.json();
    const userId = authData.id;
    
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    console.log("📋 Fetching chats for userId:", userId);
    
    const userChats = await db
      .select()
      .from(chats)
      .where(eq(chats.userId, userId))
      .orderBy(chats.createdAt);

    console.log(`✅ Found ${userChats.length} chats`);
    console.log("📋 First chat example:", userChats[0]);

    return NextResponse.json({ chats: userChats });
  } catch (error) {
    console.error("❌ Get chats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    console.log("📋 Fetching chats for userId:", userId);
    
    const userChats = await db
      .select()
      .from(chats)
      .where(eq(chats.userId, userId))
      .orderBy(chats.createdAt);

    console.log(`✅ Found ${userChats.length} chats`);
    console.log("📋 First chat example (POST):", userChats[0]);

    return NextResponse.json({ chats: userChats });
  } catch (error) {
    console.error("❌ Get chats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 