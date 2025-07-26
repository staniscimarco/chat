import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

export async function POST() {
  try {
    // Check if admin already exists
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.isAdmin, true))
      .limit(1);

    if (existingAdmin.length > 0) {
      return NextResponse.json({
        message: "Admin user already exists",
        credentials: {
          username: "admin",
          password: "admin"
        }
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash("admin", 12);

    // Create admin user
    const userId = "admin_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    await db
      .insert(users)
      .values({
        id: userId,
        username: "admin",
        email: "admin@pdf-ai.com",
        passwordHash,
        isAdmin: true,
      });

    return NextResponse.json({
      message: "Admin user created successfully",
      credentials: {
        username: "admin",
        password: "admin"
      }
    });
  } catch (error) {
    console.error("Create admin error:", error);
    return NextResponse.json(
      { error: "Errore nella creazione dell'admin" },
      { status: 500 }
    );
  }
} 