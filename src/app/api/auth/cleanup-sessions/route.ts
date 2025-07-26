import { NextResponse } from "next/server";
import { cleanupExpiredSessions } from "@/lib/auth";

export async function POST() {
  try {
    await cleanupExpiredSessions();
    return NextResponse.json(
      { message: "Sessioni scadute pulite con successo" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Session cleanup error:", error);
    return NextResponse.json(
      { error: "Errore durante la pulizia delle sessioni" },
      { status: 500 }
    );
  }
} 