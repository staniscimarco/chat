import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { cleanupExpiredSessions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("session_token")?.value;

    if (sessionToken) {
      // Delete session from database
      await db
        .delete(sessions)
        .where(eq(sessions.token, sessionToken));
    }

    // Clean up expired sessions
    await cleanupExpiredSessions();

    // Clear session cookie
    const response = NextResponse.json(
      { message: "Logout effettuato con successo" },
      { status: 200 }
    );

    response.cookies.set("session_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: new Date(0), // Expire immediately
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
} 