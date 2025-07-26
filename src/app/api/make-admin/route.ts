import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, sessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// POST - Rendi l'utente corrente admin
export async function POST(request: NextRequest) {
  try {
    // Ottieni il token di sessione
    const sessionToken = request.cookies.get("session_token")?.value;
    
    if (!sessionToken) {
      return NextResponse.json(
        { error: "Non autorizzato" },
        { status: 401 }
      );
    }

    // Trova la sessione
    const session = await db
      .select({
        userId: sessions.userId,
      })
      .from(sessions)
      .where(eq(sessions.token, sessionToken))
      .limit(1);

    if (session.length === 0) {
      return NextResponse.json(
        { error: "Sessione non valida" },
        { status: 401 }
      );
    }

    // Aggiorna l'utente a admin
    const updatedUser = await db
      .update(users)
      .set({ isAdmin: true })
      .where(eq(users.id, session[0].userId))
      .returning({
        id: users.id,
        username: users.username,
        email: users.email,
        isAdmin: users.isAdmin,
      });

    if (updatedUser.length === 0) {
      return NextResponse.json(
        { error: "Utente non trovato" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Utente promosso ad admin con successo",
      user: updatedUser[0],
    });
  } catch (error) {
    console.error("Error making user admin:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
} 