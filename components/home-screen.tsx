"use client"

import type React from "react"

import { useState } from "react"
import { Send } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/lib/supabase/auth-context"
import { createNewChat, addMessageToChat } from "@/lib/supabase/chat-service"
import InteractiveAvatar from "./InteractiveAvatar"

export function HomeScreen() {
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { user } = useAuth()

  const handleSubmit = async () => {
    if (!message.trim() || isSubmitting || !user) return

    setIsSubmitting(true)
    try {
      // Create a new chat with the initial message
      const chatId = await createNewChat(message)
      
      if (chatId) {
        // For demo purposes, simulate an AI response
        setTimeout(async () => {
          await addMessageToChat(chatId, "assistant", "Hello! I'm Claude. How can I assist you today?")
          setIsSubmitting(false)
          setMessage("")
          // In a real app, you might want to navigate to the chat view here
        }, 1000)
      } else {
        setIsSubmitting(false)
      }
    } catch (error) {
      console.error("Error submitting message:", error)
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex flex-col h-full items-center justify-end px-4 pb-16 pt-8">
      <div className="max-w-2xl w-full flex flex-col items-center gap-8">
        <InteractiveAvatar />
        <div className="w-full relative">
          <textarea
            className="w-full h-24 bg-[#222222] rounded-xl border border-gray-700 p-4 text-gray-200 resize-none focus:outline-none focus:ring-1 focus:ring-gray-600"
            placeholder="How can I help you today?"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
          />

          <div className="absolute bottom-4 right-4 flex items-center gap-2">
            <button
              className="w-8 h-8 rounded-md bg-[#CC0033] flex items-center justify-center disabled:opacity-50"
              onClick={handleSubmit}
              disabled={!message.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
