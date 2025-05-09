"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Search, Trash2 } from "lucide-react"
import { useAuth } from "@/lib/supabase/auth-context"
import { getUserChats, archiveChat } from "@/lib/supabase/chat-service"
import type { Database } from "@/lib/supabase/database.types"
import { useRouter } from "next/navigation"

type Chat = Database["public"]["Tables"]["chats"]["Row"]

export function ChatHistory() {
  const [chats, setChats] = useState<Chat[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const fetchChats = async () => {
      if (!user) return

      setIsLoading(true)
      try {
        const userChats = await getUserChats(user.id)
        setChats(userChats)
      } catch (error) {
        console.error("Error fetching chats:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchChats()
  }, [user])

  const handleArchiveChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation()

    try {
      const success = await archiveChat(chatId)
      if (success) {
        setChats(chats.filter((chat) => chat.id !== chatId))
      }
    } catch (error) {
      console.error("Error archiving chat:", error)
    }
  }

  const handleChatClick = (chatId: string) => {
    router.push(`/chat/${chatId}`)
  }

  const filteredChats = searchQuery
    ? chats.filter((chat) => chat.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : chats

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()

    // If today, show time
    if (date.toDateString() === now.toDateString()) {
      return `Today at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    }

    // If this year, show month and day
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString([], { month: "short", day: "numeric" })
    }

    // Otherwise show full date
    return date.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" })
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-light text-gray-200">Your chat history</h1>
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
        <input
          type="text"
          placeholder="Search your chats..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#222222] border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-600"
        />
      </div>

      <div className="mb-6">
        <p className="text-gray-300">
          {isLoading
            ? "Loading chats..."
            : filteredChats.length === 0
              ? "No chats found"
              : `${filteredChats.length} ${filteredChats.length === 1 ? "chat" : "chats"} - Click on a chat to view messages`}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#CC0033] border-t-transparent"></div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredChats.map((chat) => (
            <div
              key={chat.id}
              className="bg-[#222222] border border-gray-700 rounded-lg p-4 hover:bg-[#2A2A2A] cursor-pointer flex justify-between items-start"
              onClick={() => handleChatClick(chat.id)}
            >
              <div>
                <h3 className="text-gray-200 font-medium">{chat.title}</h3>
                <p className="text-gray-400 text-sm">Last message {formatDate(chat.updated_at)}</p>
              </div>
              <button
                onClick={(e) => handleArchiveChat(chat.id, e)}
                className="text-gray-400 hover:text-red-500 p-1"
                title="Archive chat"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
