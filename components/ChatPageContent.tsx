"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChatSidebar } from "@/components/ChatSidebar"
import { ChatView } from "@/components/ChatView"
import { User } from "@supabase/supabase-js"

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

  // This effect syncs URL to state changes
  useEffect(() => {
    // Skip on initial mount as we already set state from URL
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    // Prevent navigation loop
    if (isNavigating) return

    const currentIdInUrl = searchParams.get("id")
    
    // Only update URL if actually needed
    if (selectedChatId && selectedChatId !== currentIdInUrl) {
      setIsNavigating(true)
      router.push(`/?id=${selectedChatId}`, { scroll: false })
    } else if (!selectedChatId && currentIdInUrl) {
      setIsNavigating(true)
      router.push(`/`, { scroll: false })
    }
  }, [selectedChatId, router])  // Remove searchParams from dependency

  // This effect syncs state to URL changes
  useEffect(() => {
    // Reset navigation lock when URL changes
    setIsNavigating(false)
    
    const currentIdInUrl = searchParams.get("id")
    if (currentIdInUrl !== selectedChatId) {
      setSelectedChatId(currentIdInUrl)
    }
  }, [searchParams])  // Remove selectedChatId from dependency

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