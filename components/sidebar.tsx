"use client"

import { Home } from "lucide-react"

interface SidebarProps {
  setCurrentView: (view: "home" | "history" | "settings") => void
}

export function Sidebar({ setCurrentView }: SidebarProps) {
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
        <span className="text-lg font-bold">H</span>
      </button>
    </div>
  )
}
