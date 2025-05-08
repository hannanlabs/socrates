"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { HomeScreen } from "@/components/home-screen"
import { ChatHistory } from "@/components/chat-history"
import { Settings } from "@/components/settings"

export default function App() {
  const [currentView, setCurrentView] = useState<"home" | "history" | "settings">("home")

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
