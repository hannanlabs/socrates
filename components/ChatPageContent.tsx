"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChatSidebar } from "@/components/ChatSidebar"
import { ChatView } from "@/components/ChatView"
import { User } from "@supabase/supabase-js"
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
    setSelectedFile(null); // Clear file if user switches chat
  }

  const handleNewChat = () => {
    setSelectedChatId(null)
    setSelectedFile(null); // Clear file if user starts a new blank chat
    if (searchParams.get("id")) {
      router.push('/', { scroll: false })
    }
    console.log("New blank chat initiated")
  }

  // Function to programmatically click the hidden file input
  const initiateDocumentUploadProcess = () => {
    fileInputRef.current?.click();
  };

  // Function to handle file selection
  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      console.log("File selected in ChatPageContent:", file.name);
      // At this point, ChatView will receive the updated selectedFile prop
      // and can display UI for the user to confirm using this document.
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
      alert("No file selected.");
      return;
    }
    console.log("Processing document for conversation:", selectedFile.name);
    // TODO: Full Implementation Required
    // 1. Get agentId (from user profile or a default)
    // 2. Call backend API to: 
    //    a. Clear agent's existing knowledge base (if that's the strategy)
    //    b. Upload selectedFile to agent's knowledge base
    // 3. If successful, ensure the ChatView is set up for this new context.
    //    This might involve setting a new selectedChatId if each doc chat is new,
    //    or re-keying/refreshing the current ChatView.
    //    For now, we will just log and clear the file to show the flow.
    
    // Placeholder: Simulate starting a new chat session context
    // This might involve creating a new chat ID in a real scenario
    // For now, if no chat is selected, select a dummy one to show ChatView
    // or re-key the current one. 
    if (!selectedChatId) {
      // This is a simplified way to force ChatView to show if it wasn't.
      // In a real app, you'd create a new chat record and get its ID.
      // For now, we'll just ensure a view is active. A better approach would be
      // to create a new chat in `handleNewChat` and pass its ID for ChatView.
      // setSelectedChatId("document-chat-" + Date.now()); // Example of forcing a new view
      // For now, we'll assume that if `handleStartConversationWithDocument` is called,
      // we are either in an existing chat (selectedChatId is set) or we want to start one.
      // If selectedChatId is null, we should ideally create a new chat first via handleNewChat or similar.
      // We'll rely on ChatView being visible to show the doc upload UI elements.
      console.log("Starting new chat for document. Current selectedChatId:", selectedChatId)
      // If we always want a *new* chat for a document:
      // const newDocChatId = "doc-" + Date.now();
      // Call API to create this chat, then:
      // setSelectedChatId(newDocChatId);
      // router.push(`/?id=${newDocChatId}`, { scroll: false });
    }

    alert(`Document "${selectedFile.name}" would be processed here.`);
    // setSelectedFile(null); // Clear after processing, or ChatView can do it
  };

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
            clearSelectedFile={() => setSelectedFile(null)} // Allow ChatView to clear the file
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
                Select a conversation from the sidebar, or <button onClick={handleNewChat} className="text-[#E50041] hover:underline focus:outline-none">start a new one</button>.
              </p>
              {/* Removed document upload UI from here */}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}