"use client"

import type React from "react"

import { useAuth } from "@/lib/supabase/auth-context"
import InteractiveAvatar from "./InteractiveAvatar"

export function HomeScreen() {
  const { user } = useAuth()

  return (
    <div className="flex flex-col h-full items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl flex flex-col items-center gap-8">
        <InteractiveAvatar agentId="XR5yYfHH1SN8fjv699UX" />
      </div>
    </div>
  )
}
