"use client";
import { useState, useEffect } from "react";
import { Loader2, RefreshCw } from "lucide-react";

interface PDFViewerProps {
  pdfUrl: string;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onNavigateToPage: (page: number) => void;
}

function PDFViewer({
  pdfUrl,
  currentPage,
  totalPages,
  onPageChange,
  onNavigateToPage,
}: PDFViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [proxyUrl, setProxyUrl] = useState<string>("");
  const [actualTotalPages, setActualTotalPages] = useState<number>(totalPages);

  useEffect(() => {
    console.log("📄 PDFViewer: State changed - isLoading:", isLoading, "hasError:", hasError, "proxyUrl:", proxyUrl ? "present" : "missing");
  }, [isLoading, hasError, proxyUrl]);

  useEffect(() => {
    console.log("📄 PDFViewer: pdfUrl changed to:", pdfUrl);
    setIsLoading(true);
    setHasError(false);
  }, [pdfUrl]);

  // Extract fileKey from pdfUrl and get proxy URL
  useEffect(() => {
    const getProxyUrl = async () => {
      try {
        console.log("📄 PDFViewer: Starting to get proxy URL for pdfUrl:", pdfUrl);
        
        // Extract fileKey from pdfUrl
        const urlParts = pdfUrl.split('/');
        const fileKey = urlParts.slice(-2).join('/');
        
        console.log("📄 PDFViewer: Extracted fileKey:", fileKey);
        console.log("📄 PDFViewer: URL parts:", urlParts);
        
        // Get PDF metadata first
        try {
          const metadataResponse = await fetch(`/api/pdf-metadata?key=${encodeURIComponent(fileKey)}`);
          if (metadataResponse.ok) {
            const metadataData = await metadataResponse.json();
            if (metadataData.pageCount) {
              console.log("📄 PDFViewer: Got actual page count:", metadataData.pageCount);
              setActualTotalPages(metadataData.pageCount);
            }
          }
        } catch (metadataError) {
          console.warn("📄 PDFViewer: Could not get PDF metadata, using default:", metadataError);
        }
        
        const proxyResponse = await fetch(`/api/pdf-proxy?key=${encodeURIComponent(fileKey)}`);
        console.log("📄 PDFViewer: Proxy response status:", proxyResponse.status);
        
        const data = await proxyResponse.json();
        console.log("📄 PDFViewer: Proxy response data:", data);
        
        if (data.url) {
          console.log("📄 PDFViewer: Got proxy URL:", data.url);
          setProxyUrl(data.url);
          
          // Set a timeout to force loading to false if iframe doesn't load
          setTimeout(() => {
            console.log("📄 PDFViewer: Timeout reached, forcing loading to false");
            setIsLoading(false);
          }, 5000); // 5 seconds timeout
        } else {
          console.error("📄 PDFViewer: No URL in proxy response");
          setHasError(true);
        }
      } catch (error) {
        console.error("📄 PDFViewer: Error getting proxy URL:", error);
        setHasError(true);
      }
    };

    if (pdfUrl) {
      console.log("📄 PDFViewer: pdfUrl changed, calling getProxyUrl");
      getProxyUrl();
    } else {
      console.log("📄 PDFViewer: No pdfUrl provided");
    }
  }, [pdfUrl]);

  // Expose navigation function globally
  useEffect(() => {
    (window as any).navigateToPageInPDF = (pageNumber: number) => {
      console.log("📄 PDFViewer: Navigating to page", pageNumber, "of", actualTotalPages);
      
      if (pageNumber < 1 || pageNumber > actualTotalPages) {
        console.log("📄 PDFViewer: Invalid page number", pageNumber, "must be between 1 and", actualTotalPages);
        return;
      }

      // Update the iframe src directly with the new page
      const iframe = document.querySelector('iframe[src*=".pdf"]') as HTMLIFrameElement;
      if (iframe && proxyUrl) {
        const newUrl = `${proxyUrl}#page=${pageNumber}`;
        console.log("📄 PDFViewer: Setting iframe src to", newUrl);
        
        // Force reload by setting src to empty first, then to new URL
        iframe.src = '';
        setTimeout(() => {
          iframe.src = newUrl;
          console.log("📄 PDFViewer: Forced iframe reload with new URL");
        }, 100);
        
        // Update current page state
        onPageChange(pageNumber);
        
        console.log("📄 PDFViewer: Navigation completed - PDF should now show page", pageNumber);
      } else {
        console.log("📄 PDFViewer: Iframe or proxy URL not found");
      }
    };

    return () => {
      console.log("📄 PDFViewer: Global navigation function removed");
      delete (window as any).navigateToPageInPDF;
    };
  }, [actualTotalPages, onPageChange, proxyUrl]);

  const retryLoad = () => {
    setIsLoading(true);
    setHasError(false);
  };

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl shadow-xl h-full flex flex-col border border-gray-600">
      {/* Header */}
      <div className="p-3 border-b border-gray-600 flex-shrink-0">
        <h3 className="font-semibold text-white text-sm">
          Visualizzatore PDF
        </h3>
      </div>

      {/* PDF Content */}
      <div className="flex-1 relative min-h-0 overflow-auto">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800 rounded-b-xl">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-400" />
              <p className="text-gray-300 text-sm">Caricamento PDF...</p>
            </div>
          </div>
        )}

        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800 rounded-b-xl">
            <div className="text-center">
              <p className="text-red-400 mb-4">Errore nel caricamento del PDF</p>
              <button
                onClick={retryLoad}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Riprova</span>
              </button>
            </div>
          </div>
        )}

        {!isLoading && !hasError && proxyUrl && (
          <div className="h-full">
              <iframe
                src={`${proxyUrl}#page=${currentPage}`}
                className="w-full h-full border-0"
                onLoad={() => {
                  console.log("📄 PDFViewer: Iframe loaded successfully");
                  setIsLoading(false);
                }}
                onError={(e) => {
                  console.error("📄 PDFViewer: Iframe error:", e);
                  setHasError(true);
                }}
                onLoadStart={() => {
                  console.log("📄 PDFViewer: Iframe load started");
                }}
                onAbort={() => {
                  console.error("📄 PDFViewer: Iframe load aborted");
                  setHasError(true);
                }}
              />
          </div>
        )}
        
        {!isLoading && !hasError && !proxyUrl && (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <Loader2 className="w-6 h-6 animate-spin text-blue-400 mx-auto mb-2" />
              <p className="text-gray-300 text-sm">Preparazione PDF...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PDFViewer;
