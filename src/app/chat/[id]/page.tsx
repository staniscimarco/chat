"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ChatPageClient from "@/components/ChatPageClient";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

interface Chat {
  id: string;
  pdfName: string;
  pdfUrl: string;
  fileKey: string;
  createdAt: Date | null;
  userId: string;
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user) {
      loadChats();
    }
  }, [authLoading, user]);

  const loadChats = async () => {
    try {
      const response = await fetch("/api/get-chats");
      if (response.ok) {
        const data = await response.json();
        setChats(data.chats);
        
        // Trova il chat corrente
        const chatId = params.id as string;
        console.log("📄 ChatPage: Looking for chat with ID:", chatId);
        console.log("📄 ChatPage: Available chats:", data.chats);
        
        const foundChat = data.chats.find((chat: Chat) => chat.id === chatId);
        if (foundChat) {
          console.log("📄 ChatPage: Found chat:", foundChat);
          console.log("📄 ChatPage: pdfUrl:", foundChat.pdfUrl);
          setCurrentChat(foundChat);
        } else {
          console.log("📄 ChatPage: Chat not found, redirecting to home");
          router.push("/");
        }
      }
    } catch (error) {
      console.error("Errore nel caricare i chat:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Caricamento chat...</p>
        </div>
      </div>
    );
  }

  if (!currentChat) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Chat non trovato</p>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Torna alla home
          </button>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <ChatPageClient
        initialChats={chats}
        chatId={currentChat.id}
        isPro={user?.isAdmin || false}
        pdfUrl={currentChat.pdfUrl}
      />
    </ProtectedRoute>
  );
} 