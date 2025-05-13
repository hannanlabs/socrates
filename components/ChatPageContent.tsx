"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChatSidebar } from "@/components/ChatSidebar"
import { ChatView } from "@/components/ChatView"
import { User } from "@supabase/supabase-js"
import { toast } from "@/components/ui/use-toast"
import { getChatById } from "@/lib/supabase/chat-service"
// No UploadCloud import here, it will be in ChatView if needed

interface ChatPageContentProps {
  user: User
}

// Add a type for the document information
interface ActiveDocumentInfo {
  supabaseDocId: string;
  publicUrl: string;
  pageCount: number | null;
  fileName: string;
}

// New type for storing document info per chat
interface ChatDocumentsState {
  [chatId: string]: ActiveDocumentInfo | undefined;
}

export default function ChatPageContent({ user }: ChatPageContentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isInitialMount = useRef(true)
  
  const initialChatId = searchParams.get("id")
  const [selectedChatId, setSelectedChatId] = useState<string | null>(initialChatId)
  const [isNavigating, setIsNavigating] = useState(false)
  const [currentChatTitle, setCurrentChatTitle] = useState<string | null>(null);

  // State and Ref for document upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New state for document processing
  const [isProcessingDocument, setIsProcessingDocument] = useState(false);
  const [documentError, setDocumentError] = useState<string | null>(null);

  // Store document info per chat ID
  const [chatDocumentsInfo, setChatDocumentsInfo] = useState<ChatDocumentsState>({});
  // The currently active document for the selected chat (derived from chatDocumentsInfo)
  const [currentDocumentForChat, setCurrentDocumentForChat] = useState<ActiveDocumentInfo | null>(null);
  // State to control viewer visibility (remains global for now)
  const [isViewerOpen, setIsViewerOpen] = useState<boolean>(false);

  // This effect syncs URL to state changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    if (isNavigating) return
    const currentIdInUrl = searchParams.get("id")
    if (selectedChatId && selectedChatId !== currentIdInUrl) {
      setIsNavigating(true)
      router.push(`/?id=${selectedChatId}`, { scroll: false })
    } else if (!selectedChatId && currentIdInUrl) {
      setIsNavigating(true)
      router.push(`/`, { scroll: false })
    }
  }, [selectedChatId, router])

  // This effect syncs state to URL changes
  useEffect(() => {
    setIsNavigating(false)
    const currentIdInUrl = searchParams.get("id")
    if (currentIdInUrl !== selectedChatId) {
      setSelectedChatId(currentIdInUrl)
    }
    // Fetch title when selectedChatId changes
    if (currentIdInUrl) {
      getChatById(currentIdInUrl).then(chat => {
        if (chat) setCurrentChatTitle(chat.title);
      });
      // Update currentDocumentForChat when chat changes
      setCurrentDocumentForChat(chatDocumentsInfo[currentIdInUrl] || null);
      // If no document was previously open for this chat, ensure viewer is closed
      if (!chatDocumentsInfo[currentIdInUrl]) {
        setIsViewerOpen(false);
      }
    } else {
      setCurrentChatTitle(null);
      setCurrentDocumentForChat(null); // No chat, no document
      setIsViewerOpen(false); // Close viewer if no chat selected
    }
  }, [searchParams, selectedChatId, chatDocumentsInfo]); // Add chatDocumentsInfo dependency

  const handleSelectChat = (chatId: string | null) => {
    setSelectedChatId(chatId)
    setSelectedFile(null);
    setDocumentError(null); // Clear document error when chat changes
    // Set the current document for the newly selected chat
    setCurrentDocumentForChat(chatId ? chatDocumentsInfo[chatId] || null : null);
    // If the new chat doesn't have a document, or no chat is selected, close the viewer.
    // Keep viewer open if switching to a chat that *does* have a document and viewer was already open.
    if (!chatId || !chatDocumentsInfo[chatId]) {
        setIsViewerOpen(false);
    }

    // Fetch and set title when a chat is selected
    if (chatId) {
      getChatById(chatId).then(chat => {
        if (chat) setCurrentChatTitle(chat.title);
      });
    } else {
      setCurrentChatTitle(null);
    }
  }

  const handleNewChat = () => {
    setSelectedChatId(null)
    setCurrentChatTitle("New Conversation"); // Set a default title for new chat UX
    setSelectedFile(null);
    setDocumentError(null); // Clear document error for new chat
    setCurrentDocumentForChat(null); // No document for new chat
    setIsViewerOpen(false); // Close viewer for new chat
    if (searchParams.get("id")) {
      router.push('/', { scroll: false })
    }
    console.log("New blank chat initiated")
  }

  // Function to programmatically click the hidden file input
  const initiateDocumentUploadProcess = () => {
    setDocumentError(null); // Clear previous errors
    fileInputRef.current?.click();
  };

  // Function to handle file selection
  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setDocumentError(null); // Clear error if a new file is selected
      console.log("File selected in ChatPageContent:", file.name);
    } else {
      setSelectedFile(null);
    }
    // Reset the input value to allow selecting the same file again if needed
    if(event.target) {
      event.target.value = '';
    }
  };

  // Function to process the document and start/update the chat
  const handleStartConversationWithDocument = async () => {
    if (!selectedFile || !selectedChatId) { // Ensure selectedChatId exists
      setDocumentError("No file selected or no active chat. Please select a file and ensure a chat is active.");
      return;
    }
    
    setIsProcessingDocument(true);
    setDocumentError(null);
    // Don't clear currentDocumentForChat here, let it be overwritten by new doc info
    setIsViewerOpen(false); // Ensure viewer is closed initially before opening with new/updated doc
    console.log("Processing document for conversation:", selectedFile.name, "for chat:", selectedChatId);

    // Get API key and Agent ID from user metadata
    const elevenLabsApiKey = user?.user_metadata?.elevenlabs_api_key;
    const elevenLabsAgentId = user?.user_metadata?.elevenlabs_agent_id;

    if (!elevenLabsApiKey || !elevenLabsAgentId) {
      setDocumentError("Missing API key or Agent ID. Please add them in Settings.");
      setIsProcessingDocument(false);
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('apiKey', elevenLabsApiKey);
    formData.append('agentId', elevenLabsAgentId);
    // Pass chatId if available, so the document can be associated
    if (selectedChatId) {
      formData.append('chatId', selectedChatId);
    }

    try {
      const response = await fetch('/api/agent/set-document', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("Error from backend:", result);
        throw new Error(result.error || `Failed to process document (status ${response.status})`);
      }

      console.log("Document processed successfully by backend:", result);
      
      // Show success message with toast
      try {
        toast({
          title: "Document Processed Successfully",
          description: `"${selectedFile.name}" has been added to the agent's knowledge base. Document viewer will open.`,
          variant: "default",
          duration: 5000, // Show for 5 seconds
        });
      } catch (toastError) {
        console.error("Error showing toast:", toastError);
      }
      
      if (result.supabaseDocId && result.publicUrl) {
        const newDocInfo: ActiveDocumentInfo = {
          supabaseDocId: result.supabaseDocId,
          publicUrl: result.publicUrl,
          pageCount: result.pageCount,
          fileName: selectedFile.name,
        };
        // Store this document against the current chatId
        setChatDocumentsInfo(prev => ({ ...prev, [selectedChatId]: newDocInfo }));
        setCurrentDocumentForChat(newDocInfo); // Set as the current document for viewing
        setIsViewerOpen(true); // Open the viewer automatically
      } else {
         console.warn("Backend did not return supabaseDocId or publicUrl. Document viewer cannot be opened.");
         setDocumentError("Document processed, but viewer data is missing.");
      }
      
      setSelectedFile(null); 

    } catch (error: any) {
      console.error("Failed to process document:", error);
      setDocumentError(error.message || "An unexpected error occurred while sending the document.");
      setCurrentDocumentForChat(chatDocumentsInfo[selectedChatId] || null); // Revert to previous doc for this chat on error, or null
      setIsViewerOpen(false);
    } finally {
      setIsProcessingDocument(false);
    }
  };

  const clearSelectedFileAndError = () => {
    setSelectedFile(null);
    setDocumentError(null);
  }

  const handleCloseDocumentViewer = () => {
    setIsViewerOpen(false);
  };

  const handleOpenDocumentViewer = () => {
    if (currentDocumentForChat) { // Now checks currentDocumentForChat
      setIsViewerOpen(true);
    }
  };

  // New callback handler for title updates from sidebar
  const handleChatTitleUpdated = (updatedChatId: string, newTitle: string) => {
    if (selectedChatId === updatedChatId) {
      setCurrentChatTitle(newTitle);
    }
    // We might also want to update the title in a local list of chats if ChatPageContent maintains one,
    // but for now, just updating the currently viewed chat's title is the priority.
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileSelected} 
        className="hidden" 
        accept=".pdf,.txt,.docx,.html,.epub" // Common document types
      />

      {/* Sidebar */}
      <div className="w-1/4 min-w-[280px] max-w-[400px] bg-sidebar-background flex flex-col border-r border-sidebar-border">
        <ChatSidebar 
          selectedChatId={selectedChatId} 
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat} 
          onChatTitleUpdated={handleChatTitleUpdated}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-background">
        {selectedChatId ? (
          <ChatView 
            chatId={selectedChatId} 
            initialTitle={currentChatTitle}
            user={user}
            initiateDocumentUpload={initiateDocumentUploadProcess}
            onDocumentReadyToProcess={handleStartConversationWithDocument}
            selectedFile={selectedFile}
            clearSelectedFile={clearSelectedFileAndError}
            isProcessingDocument={isProcessingDocument}
            documentProcessingError={documentError}
            activeDocumentInfo={currentDocumentForChat} // Pass currentDocumentForChat
            isViewerOpen={isViewerOpen}
            onOpenViewer={handleOpenDocumentViewer}
            onCloseViewer={handleCloseDocumentViewer}
          />
        ) : (
          // Welcome screen when no chat is selected
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="max-w-md">
              <svg className="h-20 w-20 mb-6 mx-auto opacity-50" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="45" stroke="hsl(var(--primary))" strokeWidth="5"/>
                <path d="M30 50L45 65L70 35" stroke="hsl(var(--primary))" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <h2 className="text-2xl font-semibold text-foreground mb-3">Welcome to Your Chat</h2>
              <p className="text-muted-foreground mb-8">
                Select a conversation from the sidebar
              </p>
              {/* Removed document upload UI from here */}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}