"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/supabase/auth-context"
import { ChatSidebar } from "@/components/ChatSidebar"
import { ChatView } from "@/components/ChatView"
import { LoginForm } from "@/components/auth/login-form"
import { useRouter, useSearchParams } from "next/navigation"

export default function ChatPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const initialChatId = searchParams.get("id")
  const [selectedChatId, setSelectedChatId] = useState<string | null>(initialChatId)

  useEffect(() => {
    const currentIdInUrl = searchParams.get("id")
    if (selectedChatId && selectedChatId !== currentIdInUrl) {
      router.push(`/?id=${selectedChatId}`, { scroll: false })
    } else if (!selectedChatId && currentIdInUrl) {
      // If selectedChatId is cleared, remove from URL
      router.push(`/`, { scroll: false })
    }
    // Only re-run if selectedChatId changes *programmatically* or initial load
  }, [selectedChatId, router])

  // Listen for URL changes (e.g., browser back/forward) and update state
  useEffect(() => {
    const currentIdInUrl = searchParams.get("id")
    if (currentIdInUrl !== selectedChatId) {
      setSelectedChatId(currentIdInUrl)
    }
  }, [searchParams])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0D0D0D] text-white">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#E50041] border-t-transparent"></div>
          <p className="text-lg">Loading your space...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0D0D0D] text-white p-6">
        <div className="w-full max-w-md">
          <LoginForm />
        </div>
      </div>
    )
  }

  const handleSelectChat = (chatId: string | null) => {
    setSelectedChatId(chatId)
  }

  const handleNewChat = () => {
    setSelectedChatId(null)
    // Future: call a function here to create a new chat in the backend
    // and then setSelectedChatId with the new chat's ID.
    // For now, simply pushing to '/' will clear the ID from URL via useEffect.
    if (searchParams.get("id")) { // only push if there's an id to clear
      router.push('/', { scroll: false })
    }
    console.log("New chat initiated")
  }

  return (
    <div className="flex h-screen bg-[#171717] text-white overflow-hidden">
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
          <ChatView chatId={selectedChatId} key={selectedChatId} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="max-w-md">
              {/* You might want to have a logo here, ensure /logo.svg exists in your public folder */}
              {/* <img src="/logo.svg" alt="TechPulse" className="h-20 w-20 mb-6 mx-auto opacity-50" />  */}
              <svg className="h-20 w-20 mb-6 mx-auto opacity-50" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="45" stroke="#E50041" strokeWidth="5"/>
                <path d="M30 50L45 65L70 35" stroke="#E50041" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <h2 className="text-2xl font-semibold text-gray-300 mb-3">Welcome to Your Chat</h2>
              <p className="text-gray-400 mb-8">
                Select a conversation from the sidebar to continue, or start a new one.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
