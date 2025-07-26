import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chats, messages, users, sessions } from "@/lib/db/schema";
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

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { error: "Non autenticato" },
        { status: 401 }
      );
    }

    // Get chat ID from query params
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get("chatId");
    const limit = searchParams.get("limit");

    if (chatId) {
      // Get messages for specific chat with optional limit
      let query = db
        .select()
        .from(messages)
        .where(eq(messages.chatId, chatId))
        .orderBy(messages.createdAt);
      
      // Apply limit if specified (default to 20 if not specified)
      const messageLimit = limit ? parseInt(limit) : 20;
      query = query.limit(messageLimit);

      const chatMessages = await query;

      return NextResponse.json({ 
        messages: chatMessages,
        total: chatMessages.length,
        limit: messageLimit
      });
    } else {
      // Get all chats for current user
      const userChats = await db
        .select({
          id: chats.id,
          pdfName: chats.pdfName,
          pdfUrl: chats.pdfUrl,
          createdAt: chats.createdAt,
        })
        .from(chats)
        .where(eq(chats.userId, currentUser.id))
        .orderBy(chats.createdAt);

      return NextResponse.json({ chats: userChats });
    }
  } catch (error) {
    console.error("Get messages error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
