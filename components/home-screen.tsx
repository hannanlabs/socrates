"use client"

import { useState } from "react"
import { ChevronUp } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function HomeScreen() {
  const [message, setMessage] = useState("")

  return (
    <div className="flex flex-col h-full items-center justify-end px-4 pb-16 pt-8">
      <div className="max-w-2xl w-full flex flex-col items-center gap-8">
        <div className="flex flex-col items-center mb-4">
          <Avatar className="w-24 h-24 border-2 border-[#CC0033]">
            <AvatarImage src="/ai-assistant-avatar.png" alt="AI Assistant" />
            <AvatarFallback className="bg-[#333333] text-white text-xl">AI</AvatarFallback>
          </Avatar>
          <h2 className="text-xl font-medium text-gray-200 mt-4">Claude AI</h2>
        </div>

        <div className="w-full relative">
          <textarea
            className="w-full h-24 bg-[#222222] rounded-xl border border-gray-700 p-4 text-gray-200 resize-none focus:outline-none focus:ring-1 focus:ring-gray-600"
            placeholder="How can I help you today?"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          <div className="absolute bottom-4 right-4 flex items-center gap-2">
            <button className="w-8 h-8 rounded-md bg-[#CC0033] flex items-center justify-center">
              <ChevronUp className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
