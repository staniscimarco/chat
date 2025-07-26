import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, chats, messages, sessions } from "@/lib/db/schema";

export async function GET() {
  try {
    console.log("🧪 Testing database connection...");
    
    // Test if tables exist by trying to query them
    try {
      const usersResult = await db.select().from(users).limit(1);
      console.log("✅ Users table exists, found", usersResult.length, "users");
    } catch (error) {
      console.log("❌ Users table error:", error);
      return NextResponse.json({ 
        error: "Database tables not created", 
        details: "Please run database migrations first" 
      }, { status: 500 });
    }
    
    try {
      const chatsResult = await db.select().from(chats).limit(1);
      console.log("✅ Chats table exists, found", chatsResult.length, "chats");
    } catch (error) {
      console.log("❌ Chats table error:", error);
      return NextResponse.json({ 
        error: "Chats table not created", 
        details: "Please run database migrations first" 
      }, { status: 500 });
    }
    
    try {
      const messagesResult = await db.select().from(messages).limit(1);
      console.log("✅ Messages table exists, found", messagesResult.length, "messages");
    } catch (error) {
      console.log("❌ Messages table error:", error);
      return NextResponse.json({ 
        error: "Messages table not created", 
        details: "Please run database migrations first" 
      }, { status: 500 });
    }
    
    try {
      const sessionsResult = await db.select().from(sessions).limit(1);
      console.log("✅ Sessions table exists, found", sessionsResult.length, "sessions");
    } catch (error) {
      console.log("❌ Sessions table error:", error);
      return NextResponse.json({ 
        error: "Sessions table not created", 
        details: "Please run database migrations first" 
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: "Database connection and tables are working correctly",
      tables: ["users", "chats", "messages", "sessions"]
    });
    
  } catch (error) {
    console.error("❌ Database test error:", error);
    return NextResponse.json({ 
      error: "Database test failed", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
} 