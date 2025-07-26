import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { chats } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import FilesPageClient from "@/components/FilesPageClient";

export default async function FilesPage() {
  try {
    const { currentUser } = await auth();
    
    if (!currentUser) {
      // Invece di redirectare, mostriamo una pagina di caricamento
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Caricamento...</p>
          </div>
        </div>
      );
    }

    // Get all chats for the current user
    const userChats = await db
      .select()
      .from(chats)
      .where(eq(chats.userId, currentUser.id))
      .orderBy(chats.createdAt);

    return (
      <FilesPageClient 
        initialChats={userChats} 
        currentUser={currentUser}
      />
    );
  } catch (error) {
    console.error("Error in FilesPage:", error);
    // In caso di errore, mostriamo una pagina di errore invece di redirectare
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Errore nel caricamento</p>
          <a href="/" className="text-blue-600 hover:underline">Torna alla home</a>
        </div>
      </div>
    );
  }
} 