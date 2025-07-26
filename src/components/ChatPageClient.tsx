"use client";
import React from "react";
import ChatComponent from "./ChatComponent";
import ChatSideBar from "./ChatSideBar";
import dynamic from "next/dynamic";

import PDFViewer from "./PDFViewer";

interface Chat {
  id: string;
  pdfName: string;
  pdfUrl: string;
  fileKey: string;
  createdAt: Date | null;
  userId: string;
}

type Props = {
  initialChats: Chat[];
  chatId: string;
  isPro: boolean;
  pdfUrl: string;
};

const ChatPageClient = ({ initialChats, chatId, isPro, pdfUrl }: Props) => {
  console.log("📄 ChatPageClient: Received props - chatId:", chatId, "pdfUrl:", pdfUrl);
  
  const [chats, setChats] = React.useState<Chat[]>(initialChats);
  const [pdfPage, setPdfPage] = React.useState<number>(1);
  // Funzione per navigare alla pagina nel PDF viewer
  const handleNavigateToPage = (page: number) => {
    if (typeof window !== 'undefined' && (window as any).navigateToPageInPDF) {
      (window as any).navigateToPageInPDF(page);
      setPdfPage(page);
    }
  };

  const handleChatDeleted = (deletedChatId: string) => {
    // Remove the deleted chat from the local state
    setChats(prevChats => prevChats.filter(chat => chat.id !== deletedChatId));
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* chat sidebar */}
      <div className="flex-[1] max-w-xs min-w-[250px] h-full">
        <ChatSideBar 
          chats={chats} 
          chatId={chatId} 
          isPro={isPro} 
          onChatDeleted={handleChatDeleted}
        />
      </div>
      {/* pdf viewer */}
      <div className="flex-[2] h-full overflow-hidden">
        <PDFViewer pdfUrl={pdfUrl} currentPage={pdfPage} totalPages={1} onPageChange={setPdfPage} onNavigateToPage={handleNavigateToPage} />
      </div>
      {/* chat component */}
      <div className="flex-[1] min-w-[400px] h-full border-l border-l-slate-200">
        <ChatComponent chatId={chatId} onNavigateToPdfPage={handleNavigateToPage} pdfUrl={pdfUrl} />
      </div>
    </div>
  );
};

export default ChatPageClient; 