"use client";

import { useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { FileText, Upload, Loader2, CheckCircle, User, Shield, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Mic, MicOff, Sparkles } from "lucide-react";



interface User {
  id: string;
  username: string;
  email: string;
  isAdmin: boolean;
}

export default function Home() {
  const { user, logout } = useAuth();
  const [chats, setChats] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);

  const router = useRouter();

  // Load chats when authenticated
  useEffect(() => {
    if (user) {
      loadChats();
    }
  }, [user]);

  const loadChats = async () => {
    try {
      const response = await fetch("/api/get-chats", { method: "GET" });
      if (response.ok) {
        const data = await response.json();
        setChats(data.chats || []);
      } else {
        console.error("Failed to load chats:", response.status);
      }
    } catch (error) {
      console.error("Failed to load chats:", error);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File troppo grande. Massimo 10MB.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadedFile(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch("/api/create-chat", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);

      if (response.ok) {
        const data = await response.json();
        setUploadProgress(100);
        setUploadedFile(data.chatId);
        toast.success("File caricato con successo!");
        
        // Redirect to chat after 2 seconds
        setTimeout(() => {
          router.push(`/chat/${data.chatId}`);
        }, 2000);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Errore nel caricamento del file");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Errore nel caricamento del file");
    } finally {
      setIsUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: false
  });



  return (
    <ProtectedRoute>
              <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        {/* Header */}
        <header className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-700/50 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <h1 className="text-xl font-bold text-white">DOCKY-AI</h1>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                {/* Pulsante Assistente Vocale DOCKY */}
                <Button
                  onClick={() => router.push('/docky')}
                  className="flex items-center space-x-2 transition-all duration-300 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-4 py-2 rounded-lg shadow-lg"
                >
                  <Mic className="w-4 h-4" />
                  <span>DOCKY Assistant</span>
                </Button>

                {/* Pulsante Gestisci Utenti per Admin */}
                {user?.isAdmin && (
                  <Button
                    onClick={() => router.push("/admin")}
                    className="flex items-center space-x-2 transition-all duration-300 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-4 py-2 rounded-lg shadow-lg"
                  >
                    <User className="w-4 h-4" />
                    <span>Gestisci utenti</span>
                  </Button>
                )}

                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user?.username?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-gray-300 font-medium">{user?.username}</span>
                </div>
                
                <button
                  onClick={handleLogout}
                  className="text-red-400 hover:text-red-300 transition-colors p-2 rounded-lg hover:bg-red-900/20"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-white">
                DOCKY-AI
              </h1>
            </div>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Il tuo assistente AI intelligente per documenti e conversazioni
            </p>
          </div>



          {/* Upload Area */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl border border-gray-600 p-8 mb-8 shadow-xl">
            {uploadedFile ? (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h3 className="text-2xl font-semibold text-white mb-2">
                  File caricato con successo!
                </h3>
                <p className="text-gray-300 mb-6">
                  Stai per essere reindirizzato alla chat...
                </p>
                <div className="w-16 h-16 mx-auto">
                  <Loader2 className="w-16 h-16 animate-spin text-blue-400" />
                </div>
              </div>
            ) : (
              <div
                {...getRootProps()}
                className={cn(
                  "border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300",
                  isDragActive
                    ? "border-blue-400 bg-blue-900/20"
                    : "border-gray-500 hover:border-purple-400 hover:bg-purple-900/20"
                )}
              >
                <input {...getInputProps()} />
                
                {isUploading ? (
                  <div className="space-y-6">
                    <div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                    <div>
                      <p className="text-white font-semibold mb-3 text-lg">
                        Caricamento in corso...
                      </p>
                      <div className="w-full bg-gray-600 rounded-full h-3 mb-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-sm text-gray-300 font-medium">{uploadProgress}%</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Upload className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-xl mb-3">
                        Carica il tuo PDF
                      </p>
                      <p className="text-gray-300 mb-3 text-lg">
                        Trascina e rilascia un file PDF o clicca per selezionarlo
                      </p>
                      <p className="text-sm text-gray-400 font-medium">
                        Supporta file fino a 10MB
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* File Stats Card */}
          {chats.length > 0 && (
            <div className="bg-gradient-to-r from-gray-800 to-gray-700 text-white rounded-xl p-6 mb-8 shadow-xl border border-gray-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <FileText className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">I tuoi documenti</h3>
                    <p className="text-gray-300 text-lg">
                      {chats.length} {chats.length === 1 ? 'documento' : 'documenti'} disponibili
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => router.push("/files")}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-bold shadow-lg text-lg"
                >
                  Apri file
                </button>
              </div>
            </div>
          )}
          
          {/* Empty State */}
          {chats.length === 0 && !isUploading && (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-500 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-white mb-2">
                Nessun file caricato
              </h3>
              <p className="text-gray-400">
                Carica il tuo primo PDF per iniziare
              </p>
            </div>
          )}
        </main>

        {/* Voice Assistant */}
        {/* Removed VoiceAssistant component */}
      </div>
    </ProtectedRoute>
  );
}
