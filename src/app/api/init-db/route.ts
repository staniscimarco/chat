import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function POST() {
  try {
    console.log("🔧 Initializing database...");
    
    // Create tables manually
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" text PRIMARY KEY NOT NULL,
        "username" text NOT NULL,
        "email" text NOT NULL,
        "password_hash" text NOT NULL,
        "is_admin" boolean DEFAULT false,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now(),
        CONSTRAINT "users_username_unique" UNIQUE("username"),
        CONSTRAINT "users_email_unique" UNIQUE("email")
      );
    `);
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "sessions" (
        "id" text PRIMARY KEY NOT NULL,
        "user_id" text NOT NULL,
        "token" text NOT NULL,
        "expires_at" timestamp NOT NULL,
        "created_at" timestamp DEFAULT now(),
        CONSTRAINT "sessions_token_unique" UNIQUE("token")
      );
    `);
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "chats" (
        "id" text PRIMARY KEY NOT NULL,
        "pdf_name" text NOT NULL,
        "pdf_url" text NOT NULL,
        "file_key" text NOT NULL,
        "created_at" timestamp DEFAULT now(),
        "user_id" text NOT NULL
      );
    `);
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "messages" (
        "id" text PRIMARY KEY NOT NULL,
        "chat_id" text NOT NULL,
        "role" text NOT NULL,
        "content" text NOT NULL,
        "created_at" timestamp DEFAULT now()
      );
    `);
    
    // Add foreign key constraints
    try {
      await db.execute(sql`
        ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" 
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade;
      `);
    } catch (error) {
      console.log("Foreign key sessions already exists");
    }
    
    try {
      await db.execute(sql`
        ALTER TABLE "messages" ADD CONSTRAINT "messages_chat_id_chats_id_fk" 
        FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE cascade;
      `);
    } catch (error) {
      console.log("Foreign key messages already exists");
    }
    
    console.log("✅ Database initialized successfully");
    
    return NextResponse.json({
      success: true,
      message: "Database initialized successfully"
    });
    
  } catch (error) {
    console.error("❌ Database initialization error:", error);
    return NextResponse.json({ 
      error: "Database initialization failed", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
} 