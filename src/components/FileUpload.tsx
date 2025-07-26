"use client";
import { uploadToS3 } from "@/lib/s3";
import { useMutation } from "@tanstack/react-query";
import { Upload, Loader2, FileText, Sparkles } from "lucide-react";
import React from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

const FileUpload = () => {
  const router = useRouter();
  const [uploading, setUploading] = React.useState(false);
  const { mutate, isLoading } = useMutation({
    mutationFn: async ({
      file_key,
      file_name,
    }: {
      file_key: string;
      file_name: string;
    }) => {
      const response = await fetch("/api/create-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          file_key,
          file_name,
        }),
      });
      return response.json();
    },
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    onDrop: async (acceptedFiles) => {
      console.log("Files dropped:", acceptedFiles);
      const file = acceptedFiles[0];
      if (!file) {
        console.log("No file selected");
        return;
      }
      console.log("File selected:", { name: file.name, size: file.size, type: file.type });
      
      if (file.size > 10 * 1024 * 1024) {
        // bigger than 10mb!
        console.log("File too large:", file.size);
        toast.error("File troppo grande! Massimo 10MB");
        return;
      }

      try {
        console.log("Starting upload process...");
        setUploading(true);
        const data = await uploadToS3(file);
        console.log("Upload completed:", data);
        if (!data?.file_key || !data.file_name) {
          console.log("Invalid upload data:", data);
          toast.error("Qualcosa è andato storto");
          return;
        }
        mutate(data, {
          onSuccess: (response) => {
            console.log("✅ API Success response:", response);
            console.log("✅ Chat ID received:", response.chat_id);
            toast.success("Chat creata con successo!");
            console.log("✅ About to navigate to:", `/chat/${response.chat_id}`);
            // Small delay to allow database sync
            setTimeout(() => {
              try {
                router.push(`/chat/${response.chat_id}`);
                console.log("✅ Router.push called successfully");
              } catch (error) {
                console.error("❌ Router.push failed:", error);
              }
            }, 1000); // 1000ms delay for database sync
          },
          onError: (err) => {
            console.error("❌ API Error:", err);
            toast.error("Errore durante la creazione della chat");
          },
        });
      } catch (error) {
        console.error("Upload process failed:", error);
        toast.error("Caricamento fallito");
      } finally {
        console.log("Upload process finished, setting uploading to false");
        setUploading(false);
      }
    },
  });

  return (
    <div
      {...getRootProps({
        className: `
          relative border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50/50' 
            : 'border-gray-300 hover:border-blue-400 bg-gray-50/50 hover:bg-blue-50/30'
          }
          ${uploading || isLoading ? 'pointer-events-none' : ''}
        `,
      })}
    >
      <input {...getInputProps()} />
      
      <div className="p-8 flex flex-col items-center justify-center text-center">
        {uploading || isLoading ? (
          <>
            {/* Loading state */}
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Caricamento in corso...
            </h3>
            <p className="text-sm text-gray-600">
              Stiamo analizzando il tuo PDF con l'AI
            </p>
          </>
        ) : (
          <>
            {/* Default state */}
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
              {isDragActive ? (
                <Upload className="h-8 w-8 text-white" />
              ) : (
                <FileText className="h-8 w-8 text-white" />
              )}
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {isDragActive ? 'Rilascia qui il PDF' : 'Carica il tuo PDF'}
            </h3>
            
            <p className="text-sm text-gray-600 mb-4">
              {isDragActive 
                ? 'Rilascia il file per iniziare l\'analisi' 
                : 'Trascina e rilascia un file PDF o clicca per selezionarlo'
              }
            </p>
            
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <Sparkles className="w-4 h-4" />
              <span>Supporta file fino a 10MB</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
