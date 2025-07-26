import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";

// POST - Crea il primo admin del sistema
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

    // Verifica se esiste già un admin
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.isAdmin, true))
      .limit(1);

    if (existingAdmin.length > 0) {
      return NextResponse.json(
        { error: "Un admin esiste già nel sistema" },
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

    // Crea il primo admin
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
      message: "Admin creato con successo",
      user: newAdmin[0],
    });
  } catch (error) {
    console.error("Error creating admin:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
} 