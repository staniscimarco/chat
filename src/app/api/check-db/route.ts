import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

// GET - Verifica lo stato del database
export async function GET(request: NextRequest) {
  try {
    // Ottieni tutti gli utenti
    const allUsers = await db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      isAdmin: users.isAdmin,
      createdAt: users.createdAt,
    }).from(users);

    // Conta gli admin
    const adminCount = allUsers.filter(user => user.isAdmin).length;
    const totalUsers = allUsers.length;

    return NextResponse.json({
      totalUsers,
      adminCount,
      users: allUsers,
      message: `Database OK. ${totalUsers} utenti totali, ${adminCount} admin.`
    });
  } catch (error) {
    console.error("Error checking database:", error);
    return NextResponse.json(
      { error: "Errore nel controllo del database", details: error },
      { status: 500 }
    );
  }
} 