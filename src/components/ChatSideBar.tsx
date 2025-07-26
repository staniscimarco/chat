"use client";
import Link from "next/link";
import React from "react";
import { Button } from "./ui/button";
import { MessageCircle, PlusCircle, Trash2, FileText, Sparkles, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import ConfirmDialog from "./ui/confirm-dialog";

interface Chat {
  id: string;
  pdfName: string;
  pdfUrl: string;
  fileKey: string;
  createdAt: Date | null;
  userId: string;
}

type Props = {
  chats: Chat[];
  chatId: string;
  isPro: boolean;
  onChatDeleted?: (deletedChatId: string) => void;
};

const ChatSideBar = ({ chats, chatId, isPro, onChatDeleted }: Props) => {
  const [loading, setLoading] = React.useState(false);
  const [deleting, setDeleting] = React.useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const [chatToDelete, setChatToDelete] = React.useState<string | null>(null);
  const router = useRouter();

  const handleDeleteClick = (chatIdToDelete: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setChatToDelete(chatIdToDelete);
    setShowConfirmDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!chatToDelete) return;

    try {
      setDeleting(chatToDelete);
      console.log("🗑️ ChatSideBar: Deleting chat with ID:", chatToDelete);
      
      const deleteUrl = `/api/delete-chat?chatId=${chatToDelete}`;
      console.log("🗑️ ChatSideBar: DELETE URL:", deleteUrl);
      
      const response = await fetch(deleteUrl, {
        method: "DELETE",
      });

      console.log("🗑️ ChatSideBar: Response status:", response.status);
      console.log("🗑️ ChatSideBar: Response ok:", response.ok);

      if (response.ok) {
        toast.success("Chat eliminata con successo!");
        
        // Call the callback to update parent component
        if (onChatDeleted) {
          onChatDeleted(chatToDelete);
        }
        
        // If we deleted the current chat, redirect to home
        if (chatToDelete === chatId) {
          router.push("/");
        } else {
          // Force a router refresh to update the page data
          router.refresh();
        }
      } else {
        const errorData = await response.json();
        console.log("🗑️ ChatSideBar: Error data:", errorData);
        toast.error(errorData.error || "Errore durante l'eliminazione");
      }
    } catch (error) {
      console.error("🗑️ ChatSideBar: Delete error:", error);
      toast.error("Errore durante l'eliminazione");
    } finally {
      setDeleting(null);
      setShowConfirmDialog(false);
      setChatToDelete(null);
    }
  };

  const handleCloseDialog = () => {
    setShowConfirmDialog(false);
    setChatToDelete(null);
  };

  return (
    <>
      <div className="flex flex-col h-full w-full bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 border-r border-gray-700/50">
        {/* Header */}
        <div className="flex-shrink-0 p-6 border-b border-gray-700/50">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              DOCKY-AI
            </h1>
          </div>
          
          <div className="flex space-x-2">
            <Link href="/" className="flex-1">
              <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 border-0 text-white font-medium py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200">
                <Home className="w-4 h-4" />
              </Button>
            </Link>
            
            <Link href="/files" className="flex-1">
              <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 border-0 text-white font-medium py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200">
                <PlusCircle className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">
            Chat Recenti
          </div>
          
          {chats.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-500 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Nessuna chat ancora</p>
              <p className="text-gray-500 text-xs mt-1">Carica un PDF per iniziare</p>
            </div>
          ) : (
            chats.map((chat) => (
              <div key={chat.id} className="relative group">
                <Link href={`/chat/${chat.id}`}>
                  <div
                    className={cn(
                      "rounded-xl p-4 text-sm transition-all duration-200 border border-transparent hover:border-gray-600/50",
                      {
                        "bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-blue-500/30 text-white shadow-lg": 
                          chat.id === chatId,
                        "text-gray-300 hover:text-white hover:bg-gray-800/50": 
                          chat.id !== chatId,
                      }
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={cn(
                        "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                        {
                          "bg-gradient-to-r from-blue-500 to-purple-600": chat.id === chatId,
                          "bg-gray-700 group-hover:bg-gray-600": chat.id !== chatId,
                        }
                      )}>
                        <MessageCircle className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {chat.pdfName}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(chat.createdAt || '').toLocaleDateString('it-IT')}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
                
                {/* Delete Button */}
                <button
                  onClick={(e) => handleDeleteClick(chat.id, e)}
                  disabled={deleting === chat.id}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 
                             opacity-0 group-hover:opacity-100 transition-all duration-200
                             text-red-400 hover:text-red-300 hover:bg-red-900/20 
                             rounded-lg p-2 hover:scale-110"
                  title="Elimina chat"
                >
                  {deleting === chat.id ? (
                    <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={handleCloseDialog}
        onConfirm={handleConfirmDelete}
        title="Elimina Chat"
        message="Sei sicuro di voler eliminare questa chat? Questa azione non può essere annullata."
        confirmText="Elimina"
        cancelText="Annulla"
        isLoading={deleting !== null}
      />
    </>
  );
};

export default ChatSideBar;
