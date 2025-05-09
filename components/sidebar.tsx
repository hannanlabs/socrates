"use client"

import { Home } from "lucide-react"
import { useAuth } from "@/lib/supabase/auth-context"

interface SidebarProps {
  setCurrentView: (view: "home" | "history" | "settings") => void
}

export function Sidebar({ setCurrentView }: SidebarProps) {
  const { user } = useAuth()
  
  // Get the first letter of the username or email, or use a fallback
  const getInitial = () => {
    if (!user) return "?"
    
    // Try to get from user metadata, username, or email
    const username = 
      user.user_metadata?.username || 
      user.user_metadata?.name || 
      user.email || 
      ""
    
    return username.charAt(0).toUpperCase()
  }

  return (
    <div className="w-16 bg-[#1A1A1A] border-r border-gray-800 flex flex-col items-center py-4">
      <div className="flex-1 flex flex-col gap-4">
        <button
          className="w-10 h-10 rounded-full bg-[#CC0033] text-white flex items-center justify-center"
          onClick={() => setCurrentView("home")}
        >
          <span className="text-lg font-bold">+</span>
        </button>

        <button className="w-10 h-10 flex items-center justify-center" onClick={() => setCurrentView("history")}>
          <Home className="w-6 h-6 text-gray-400" />
        </button>
      </div>

      <button
        className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center mt-auto"
        onClick={() => setCurrentView("settings")}
      >
        <span className="text-lg font-bold">{getInitial()}</span>
      </button>
    </div>
  )
}
