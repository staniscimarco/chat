"use client";
import React from "react";
import { Input } from "./ui/input";
import { useChat } from "ai/react";
import { Button } from "./ui/button";
import { Send, MessageSquare, Sparkles } from "lucide-react";
import MessageList from "./MessageList";
import { useQuery } from "@tanstack/react-query";
import { Message } from "ai";
import { useState } from "react";


type Props = { 
  chatId: string;
  onNavigateToPdfPage?: (page: number) => void;
  pdfUrl?: string;
};

// Convert database messages to useChat format
const convertMessages = (dbMessages: any[]): Message[] => {
  return dbMessages.map(msg => ({
    id: msg.id,
    role: msg.role as "user" | "assistant",
    content: msg.content,
    createdAt: new Date(msg.createdAt),
  }));
};

const ChatComponent = ({ chatId, onNavigateToPdfPage, pdfUrl }: Props) => {
  console.log("🔍 ChatComponent ricevuto chatId:", chatId);
  const [extraMessages, setExtraMessages] = useState<any[]>([]);
  
  const { data, isLoading } = useQuery({
    queryKey: ["chat", chatId],
    queryFn: async () => {
      // Limitiamo a 20 messaggi per evitare caricamenti infiniti
      const response = await fetch(`/api/get-messages?chatId=${chatId}&limit=20`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      return response.json();
    },
  });

  const { input, handleInputChange, handleSubmit, messages, isLoading: isSending, append } = useChat({
    api: "/api/chat",
    body: {
      chatId,
    },
    initialMessages: data?.messages ? convertMessages(data.messages) : [],
  });

  // Funzione per navigare alle pagine del PDF
  const navigateToPage = (pageNumber: number) => {
    console.log("📄 ChatComponent: Navigating to page", pageNumber);
    if (typeof window !== "undefined" && (window as any).navigateToPageInPDF) {
      (window as any).navigateToPageInPDF(pageNumber);
    }
  };



  React.useEffect(() => {
    const messageContainer = document.getElementById("message-container");
    if (messageContainer) {
      messageContainer.scrollTo({
        top: messageContainer.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-900 to-gray-800">
      {/* Header */}
      <div className="flex-shrink-0 p-6 bg-gradient-to-r from-gray-800 to-gray-700 border-b border-gray-600 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Chat AI</h3>
              <p className="text-sm text-gray-300">Chiedi qualsiasi cosa sul tuo documento</p>
            </div>
          </div>
        </div>
      </div>

      {/* Message List */}
      <div 
        className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-900 to-gray-800" 
        id="message-container"
      >
        <MessageList messages={[...messages, ...extraMessages]} isLoading={isLoading} onNavigateToPdfPage={navigateToPage} />
        
        {/* Empty State */}
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Inizia a chattare
            </h3>
            <p className="text-gray-300 max-w-md">
              Fai domande sul tuo documento PDF e ricevi risposte intelligenti basate sul contenuto.
            </p>
          </div>
        )}
      </div>

      {/* Input Form */}
      <div className="flex-shrink-0 p-6 bg-gradient-to-r from-gray-800 to-gray-700 border-t border-gray-600 shadow-lg">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Input
                value={input}
                onChange={handleInputChange}
                placeholder="Chiedi qualsiasi cosa sul tuo documento..."
                className="w-full pl-4 pr-12 py-3 border border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-800 text-white placeholder-gray-400 shadow-lg hover:shadow-xl"
                disabled={isSending}
              />
              {isSending && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <Button 
              type="submit" 
              disabled={!input.trim() || isSending}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 border-0 text-white font-medium px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            Premi Invio per inviare • Shift+Invio per nuova riga
          </p>
        </form>
      </div>
    </div>
  );
};

export default ChatComponent;
