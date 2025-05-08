"use client"

import { useState } from "react"
import { useAuth } from "@/lib/supabase/auth-context"
import { Sidebar } from "@/components/sidebar"
import { HomeScreen } from "@/components/home-screen"
import { ChatHistory } from "@/components/chat-history"
import { Settings } from "@/components/settings"
import { LoginForm } from "@/components/auth/login-form"

export default function App() {
  const [currentView, setCurrentView] = useState<"home" | "history" | "settings">("home")
  const { user, isLoading } = useAuth()

  // If loading, show a loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#1A1A1A] text-white">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-[#CC0033] border-t-transparent"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  // If not logged in, show login form
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#1A1A1A] text-white p-4">
        <LoginForm />
      </div>
    )
  }

  // If logged in, show the app
  return (
    <div className="flex h-screen bg-[#1A1A1A] text-white">
      <Sidebar setCurrentView={setCurrentView} />
      <main className="flex-1 overflow-auto">
        {currentView === "home" && <HomeScreen />}
        {currentView === "history" && <ChatHistory />}
        {currentView === "settings" && <Settings />}
      </main>
    </div>
  )
}
