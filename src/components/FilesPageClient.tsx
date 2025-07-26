"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { DrizzleChat, DrizzleUser } from "@/lib/db/schema";
import { FileText, MessageCircle, Calendar, Trash2, Plus, ArrowLeft, Search, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "react-hot-toast";

interface FilesPageClientProps {
  initialChats: DrizzleChat[];
  currentUser: DrizzleUser;
}

const FilesPageClient = ({ initialChats, currentUser }: FilesPageClientProps) => {
  const router = useRouter();
  const [chats, setChats] = React.useState<DrizzleChat[]>(initialChats);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isDeleting, setIsDeleting] = React.useState<string | null>(null);

  const filteredChats = chats.filter(chat =>
    chat.pdfName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteChat = async (chatId: string) => {
    try {
      setIsDeleting(chatId);
      const response = await fetch(`/api/delete-chat?chatId=${chatId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setChats(prev => prev.filter(chat => chat.id !== chatId));
        toast.success("Chat eliminata con successo!");
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Errore nell'eliminazione");
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
      toast.error("Errore nell'eliminazione");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleChatClick = (chatId: string) => {
    router.push(`/chat/${chatId}`);
  };

  const handleNewChat = () => {
    router.push("/");
  };

  const handleBackToHome = () => {
    router.push("/");
  };

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-y-auto">
      {/* Header */}
      <header className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 shadow-lg border-b border-gray-700 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToHome}
                className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Torna alla home</span>
              </button>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-300">
                <span>Ciao, {currentUser.username || currentUser.email}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-3">
            I tuoi file
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Gestisci i tuoi documenti e conversazioni
          </p>
        </div>

        {/* Simple Stats and Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2 bg-gray-800 rounded-lg px-4 py-3 border border-gray-600">
            <FileText className="w-5 h-5 text-gray-300" />
            <span className="text-white font-semibold text-lg">
              {chats.length} {chats.length === 1 ? 'file' : 'file'}
            </span>
          </div>
          
          <button
            onClick={handleNewChat}
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-bold flex items-center space-x-2 shadow-lg"
          >
            <Plus className="w-5 h-5" />
            <span>Nuovo file</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca file..."
              className="w-full pl-10 pr-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white bg-gray-800 placeholder-gray-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Files Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredChats.map((chat) => (
            <div
              key={chat.id}
              className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl border border-gray-600 p-6 hover:border-purple-400 transition-all duration-200 shadow-lg"
            >
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white mb-2 truncate text-lg">
                    {chat.pdfName}
                  </h3>
                  <p className="text-sm text-gray-400 mb-4">
                    {chat.createdAt ? format(new Date(chat.createdAt), "dd/MM/yyyy", { locale: it }) : "Data sconosciuta"}
                  </p>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleChatClick(chat.id)}
                      className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg flex items-center justify-center"
                      title="Apri chat"
                    >
                      <MessageCircle className="w-5 h-5 text-white" />
                    </button>
                    
                    <button
                      onClick={() => handleDeleteChat(chat.id)}
                      disabled={isDeleting === chat.id}
                      className="w-10 h-10 bg-gradient-to-r from-red-500 to-pink-600 rounded-lg hover:from-red-600 hover:to-pink-700 transition-all duration-200 shadow-lg flex items-center justify-center disabled:opacity-50"
                      title="Elimina"
                    >
                      {isDeleting === chat.id ? (
                        <Loader2 className="w-5 h-5 animate-spin text-white" />
                      ) : (
                        <Trash2 className="w-5 h-5 text-white" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Empty State */}
        {filteredChats.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm ? 'Nessun file trovato' : 'Nessun file caricato'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm 
                ? 'Prova a modificare i termini di ricerca'
                : 'Inizia caricando il tuo primo PDF per creare una chat intelligente'
              }
            </p>
            {!searchTerm && (
              <button
                onClick={handleNewChat}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-medium flex items-center space-x-2 mx-auto"
              >
                <Plus className="w-5 h-5" />
                <span>Carica il primo file</span>
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default FilesPageClient; 