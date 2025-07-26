import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { users, sessions } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";
import crypto from "crypto";

// Generate a secure session token
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Generate a secure session key for encryption
export function generateSessionKey(): string {
  return crypto.randomBytes(64).toString('hex');
}

export async function auth() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session_token")?.value;

    if (!sessionToken) {
      return { currentUser: null };
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
      return { currentUser: null };
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
      return { currentUser: null };
    }

    return { currentUser: user[0] };
  } catch (error) {
    console.error("Auth error:", error);
    return { currentUser: null };
  }
}

// Clean up expired sessions
export async function cleanupExpiredSessions() {
  try {
    await db
      .delete(sessions)
      .where(gt(sessions.expiresAt, new Date()));
  } catch (error) {
    console.error("Session cleanup error:", error);
  }
} 