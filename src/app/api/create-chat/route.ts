import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chats, users, sessions } from "@/lib/db/schema";
import { uploadToS3, getS3Url } from "@/lib/s3";
import { loadS3IntoPinecone } from "@/lib/pinecone";
import { eq, and, gt } from "drizzle-orm";
import { nanoid } from "nanoid";

// Helper function to get current user
async function getCurrentUser(request: NextRequest) {
  const sessionToken = request.cookies.get("session_token")?.value;
  
  if (!sessionToken) {
    return null;
  }

  const session = await db
    .select({
      userId: sessions.userId,
    })
    .from(sessions)
    .where(
      and(
        eq(sessions.token, sessionToken),
        gt(sessions.expiresAt, new Date())
      )
    )
    .limit(1);

  if (session.length === 0) {
    return null;
  }

  const user = await db
    .select({
      id: users.id,
      username: users.username,
      isAdmin: users.isAdmin,
    })
    .from(users)
    .where(eq(users.id, session[0].userId))
    .limit(1);

  return user.length > 0 ? user[0] : null;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { error: "Non autenticato" },
        { status: 401 }
      );
  }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "Nessun file fornito" },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File troppo grande. Massimo 10MB." },
        { status: 400 }
      );
    }

    // Upload to S3
    const uploadResult = await uploadToS3(file);
    const pdfUrl = getS3Url(uploadResult.file_key);
    console.log("📤 File uploaded to S3:", uploadResult.file_key);

    // Load PDF into Pinecone
    console.log("🔄 Loading PDF into Pinecone...");
    await loadS3IntoPinecone(uploadResult.file_key);
    console.log("✅ PDF loaded into Pinecone successfully");

    // Create chat in database
    const chatId = nanoid();
    await db.insert(chats).values({
      id: chatId,
      pdfName: file.name,
      pdfUrl,
      fileKey: uploadResult.file_key,
      userId: currentUser.id,
    });

    console.log("💾 Chat created in database:", chatId);

    return NextResponse.json({
      chatId,
      pdfUrl,
      message: "Chat creata con successo",
    });
  } catch (error) {
    console.error("Create chat error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
