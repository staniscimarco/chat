import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, sessions } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("session_token")?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { error: "Non autenticato" },
        { status: 401 }
      );
    }

    // Find valid session
    const session = await db
      .select({
        id: sessions.id,
        userId: sessions.userId,
        expiresAt: sessions.expiresAt,
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
      return NextResponse.json(
        { error: "Sessione scaduta" },
        { status: 401 }
      );
    }

    // Update user to admin
    await db
      .update(users)
      .set({ isAdmin: true })
      .where(eq(users.id, session[0].userId));

    // Get updated user info
    const updatedUser = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        isAdmin: users.isAdmin,
      })
      .from(users)
      .where(eq(users.id, session[0].userId))
      .limit(1);

    return NextResponse.json({
      success: true,
      message: "Utente promosso ad admin con successo",
      user: updatedUser[0],
    });
  } catch (error) {
    console.error("Error promoting to admin:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
} 