"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChatSidebar } from "@/components/ChatSidebar"
import { ChatView } from "@/components/ChatView"
import { User } from "@supabase/supabase-js"
import { toast } from "@/components/ui/use-toast"
// No UploadCloud import here, it will be in ChatView if needed

interface ChatPageContentProps {
  user: User
}

export default function ChatPageContent({ user }: ChatPageContentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isInitialMount = useRef(true)
  
  const initialChatId = searchParams.get("id")
  const [selectedChatId, setSelectedChatId] = useState<string | null>(initialChatId)
  const [isNavigating, setIsNavigating] = useState(false)

  // State and Ref for document upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New state for document processing
  const [isProcessingDocument, setIsProcessingDocument] = useState(false);
  const [documentError, setDocumentError] = useState<string | null>(null);

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
  }, [searchParams])

  const handleSelectChat = (chatId: string | null) => {
    setSelectedChatId(chatId)
    setSelectedFile(null);
    setDocumentError(null); // Clear document error when chat changes
  }

  const handleNewChat = () => {
    setSelectedChatId(null)
    setSelectedFile(null);
    setDocumentError(null); // Clear document error for new chat
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
    if (!selectedFile) {
      setDocumentError("No file selected. Please choose a document first.");
      return;
    }
    
    setIsProcessingDocument(true);
    setDocumentError(null);
    console.log("Processing document for conversation:", selectedFile.name);

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
          description: `"${selectedFile.name}" has been added to the agent's knowledge base.`,
          variant: "default",
          duration: 5000, // Show for 5 seconds
        });
      } catch (toastError) {
        console.error("Error showing toast:", toastError);
      }
      
      setDocumentError(`✅ Document "${selectedFile.name}" processed successfully!`);
      
      setTimeout(() => {
        setDocumentError(null);
      }, 2000);
      
      if (!selectedChatId) {
         console.log("Document processed. Agent KB updated. Consider starting a new chat or refreshing context.")
      }

      setSelectedFile(null); // Clear the file after successful processing

    } catch (error: any) {
      console.error("Failed to process document:", error);
      setDocumentError(error.message || "An unexpected error occurred while sending the document.");
    } finally {
      setIsProcessingDocument(false);
    }
  };

  const clearSelectedFileAndError = () => {
    setSelectedFile(null);
    setDocumentError(null);
  }

  return (
    <div className="flex h-screen bg-[#171717] text-white overflow-hidden">
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileSelected} 
        className="hidden" 
        accept=".pdf,.txt,.docx,.html,.epub" // Common document types
      />

      {/* Sidebar */}
      <div className="w-1/4 min-w-[280px] max-w-[400px] bg-[#1D1D1D] flex flex-col border-r border-[#2A2A2A]">
        <ChatSidebar 
          selectedChatId={selectedChatId} 
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat} 
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[#171717]">
        {selectedChatId ? (
          <ChatView 
            chatId={selectedChatId} 
            key={selectedChatId} // Re-mounts ChatView when chatId changes
            user={user} // Pass user prop
            initiateDocumentUpload={initiateDocumentUploadProcess}
            onDocumentReadyToProcess={handleStartConversationWithDocument}
            selectedFile={selectedFile}
            clearSelectedFile={clearSelectedFileAndError} // Updated to clear error too
            isProcessingDocument={isProcessingDocument} // Pass loading state
            documentProcessingError={documentError} // Pass error state
          />
        ) : (
          // Welcome screen when no chat is selected
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="max-w-md">
              <svg className="h-20 w-20 mb-6 mx-auto opacity-50" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="45" stroke="#E50041" strokeWidth="5"/>
                <path d="M30 50L45 65L70 35" stroke="#E50041" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <h2 className="text-2xl font-semibold text-gray-300 mb-3">Welcome to Your Chat</h2>
              <p className="text-gray-400 mb-8">
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