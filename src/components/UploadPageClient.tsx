"use client";
import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { DrizzleUser } from "@/lib/db/schema";
import { FileText, Upload, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface UploadPageClientProps {
  currentUser: DrizzleUser;
}

const UploadPageClient = ({ currentUser }: UploadPageClientProps) => {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
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
  }, [router]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: false
  });

  const handleBackToFiles = () => {
    router.push("/files");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToFiles}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Torna ai file</span>
              </button>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>Ciao, {currentUser.username || currentUser.email}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Carica un nuovo PDF
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Trascina il tuo file PDF o clicca per selezionarlo e inizia a chattare
          </p>
        </div>

        {/* Upload Area */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {uploadedFile ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                File caricato con successo!
              </h3>
              <p className="text-gray-600 mb-6">
                Stai per essere reindirizzato alla chat...
              </p>
              <div className="w-16 h-16 mx-auto">
                <Loader2 className="w-16 h-16 animate-spin text-blue-600" />
              </div>
            </div>
          ) : (
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300",
                isDragActive
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
              )}
            >
              <input {...getInputProps()} />
              
              {isUploading ? (
                <div className="space-y-6">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                  <div>
                    <p className="text-gray-900 font-medium mb-4 text-lg">
                      Caricamento in corso...
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-500">{uploadProgress}%</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <Upload className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <p className="text-gray-900 font-medium text-xl mb-2">
                      Carica il tuo PDF
                    </p>
                    <p className="text-gray-600 mb-4">
                      Trascina e rilascia un file PDF o clicca per selezionarlo
                    </p>
                    <p className="text-sm text-gray-500">
                      Supporta file fino a 10MB
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default UploadPageClient; 