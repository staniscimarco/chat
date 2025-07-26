import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// GET - Verifica se esiste un admin nel sistema
export async function GET(request: NextRequest) {
  try {
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.isAdmin, true))
      .limit(1);

    return NextResponse.json({
      hasAdmin: existingAdmin.length > 0,
    });
  } catch (error) {
    console.error("Error checking admin:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
} 