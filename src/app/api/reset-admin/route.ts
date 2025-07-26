import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, sessions } from "@/lib/db/schema";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

// POST - Rimuovi tutti gli utenti e ricrea un admin
export async function POST(request: NextRequest) {
  try {
    const { username, email, password } = await request.json();

    // Validazione
    if (!username || !email || !password) {
      return NextResponse.json(
        { error: "Username, email e password sono obbligatori" },
        { status: 400 }
      );
    }

    // Rimuovi tutte le sessioni
    await db.delete(sessions);

    // Rimuovi tutti gli utenti
    await db.delete(users);

    // Hash della password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Crea il nuovo admin
    const newAdmin = await db.insert(users).values({
      id: nanoid(),
      username,
      email,
      passwordHash: hashedPassword,
      isAdmin: true,
    }).returning({
      id: users.id,
      username: users.username,
      email: users.email,
      isAdmin: users.isAdmin,
      createdAt: users.createdAt,
    });

    return NextResponse.json({
      message: "Database resettato e admin creato con successo",
      user: newAdmin[0],
    });
  } catch (error) {
    console.error("Error resetting admin:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
} 