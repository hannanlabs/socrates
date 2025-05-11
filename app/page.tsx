"use client"

import { useState, useEffect, Suspense } from "react"
import { useAuth } from "@/lib/supabase/auth-context"
import { ChatSidebar } from "@/components/ChatSidebar"
import { ChatView } from "@/components/ChatView"
import { LoginForm } from "@/components/auth/login-form"
import { useRouter } from "next/navigation"

// This component is the main page content that uses useSearchParams
import ChatPageContent from "@/components/ChatPageContent"

export default function ChatPage() {
  const { user, isLoading } = useAuth()
  
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

  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-[#0D0D0D] text-white">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#E50041] border-t-transparent"></div>
          <p className="text-lg">Loading chat...</p>
        </div>
      </div>
    }>
      <ChatPageContent user={user} />
    </Suspense>
  )
}
