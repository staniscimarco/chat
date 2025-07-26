import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chats, messages, users, sessions } from "@/lib/db/schema";
import { deleteFromPinecone } from "@/lib/pinecone";
import { deleteFromS3 } from "@/lib/s3";
import { eq, and, gt } from "drizzle-orm";

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

export async function DELETE(request: NextRequest) {
  try {
    console.log("🗑️ API delete-chat: Request received");
    
    // Check authentication
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      console.log("🗑️ API delete-chat: User not authenticated");
      return NextResponse.json(
        { error: "Non autenticato" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get("chatId");
    
    console.log("🗑️ API delete-chat: chatId from query params:", chatId);

    if (!chatId) {
      console.log("🗑️ API delete-chat: No chatId provided");
      return NextResponse.json(
        { error: "ID chat richiesto" },
        { status: 400 }
      );
    }

    // Get chat to verify ownership
    const chat = await db
      .select()
      .from(chats)
      .where(eq(chats.id, chatId))
      .limit(1);

    if (chat.length === 0) {
      return NextResponse.json(
        { error: "Chat non trovata" },
        { status: 404 }
      );
    }

    // Check if user owns the chat or is admin
    if (chat[0].userId !== currentUser.id && !currentUser.isAdmin) {
      return NextResponse.json(
        { error: "Accesso negato" },
        { status: 403 }
      );
    }

    // Delete messages first (due to foreign key constraint)
    await db
      .delete(messages)
      .where(eq(messages.chatId, chatId));

    // Delete chat
    await db
      .delete(chats)
      .where(eq(chats.id, chatId));

    // Delete from Pinecone and S3
    try {
      await deleteFromPinecone(chat[0].fileKey);
      await deleteFromS3(chat[0].fileKey);
    } catch (error) {
      console.error("Error deleting from Pinecone/S3:", error);
      // Continue even if Pinecone/S3 deletion fails
    }

    return NextResponse.json({
      message: "Chat eliminata con successo",
    });
  } catch (error) {
    console.error("Delete chat error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
} 