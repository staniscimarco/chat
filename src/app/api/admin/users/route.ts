import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, sessions } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

// Funzione helper per verificare l'autenticazione admin
async function checkAdminAuth(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("session_token")?.value;

    if (!sessionToken) {
      return { error: "Non autenticato", status: 401 };
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
      return { error: "Sessione scaduta", status: 401 };
    }

    // Get user info
    const user = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        isAdmin: users.isAdmin,
      })
      .from(users)
      .where(eq(users.id, session[0].userId))
      .limit(1);

    if (user.length === 0) {
      return { error: "Utente non trovato", status: 404 };
    }

    if (!user[0].isAdmin) {
      return { error: "Accesso negato. Solo gli admin possono accedere.", status: 403 };
    }

    return { user: user[0] };
  } catch (error) {
    console.error("Auth check error:", error);
    return { error: "Errore interno del server", status: 500 };
  }
}

// GET - Ottieni tutti gli utenti (solo admin)
export async function GET(request: NextRequest) {
  try {
    const authResult = await checkAdminAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const allUsers = await db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      isAdmin: users.isAdmin,
      createdAt: users.createdAt,
    }).from(users);

    return NextResponse.json({ users: allUsers });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}

// POST - Crea un nuovo utente (solo admin)
export async function POST(request: NextRequest) {
  try {
    const authResult = await checkAdminAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { username, email, password, isAdmin } = await request.json();

    // Validazione
    if (!username || !email || !password) {
      return NextResponse.json(
        { error: "Username, email e password sono obbligatori" },
        { status: 400 }
      );
    }

    // Verifica che l'email non sia già in uso
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: "Email già in uso" },
        { status: 400 }
      );
    }

    // Hash della password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Crea il nuovo utente
    const newUser = await db.insert(users).values({
      id: nanoid(),
      username,
      email,
      passwordHash: hashedPassword,
      isAdmin: isAdmin || false,
    }).returning({
      id: users.id,
      username: users.username,
      email: users.email,
      isAdmin: users.isAdmin,
      createdAt: users.createdAt,
    });

    return NextResponse.json({
      message: "Utente creato con successo",
      user: newUser[0],
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
} 