"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/supabase/auth-context"
import { ArrowLeft } from "lucide-react"

type SettingsTab = "account" | "billing"

export function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("account")
  const { user, signOut, updateUserAgentId } = useAuth()
  const [agentIdInput, setAgentIdInput] = useState("")
  const [saveStatus, setSaveStatus] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (user?.user_metadata?.elevenlabs_agent_id) {
      setAgentIdInput(user.user_metadata.elevenlabs_agent_id as string)
    } else {
      setAgentIdInput("")
    }
  }, [user])

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const handleSaveAgentId = async () => {
    setSaveStatus(null)
    if (!updateUserAgentId) {
        setSaveStatus("Error: Update function not available.")
        return
    }
    try {
      await updateUserAgentId(agentIdInput)
      setSaveStatus("Agent ID saved successfully!")
    } catch (error: any) {
      console.error("Error saving Agent ID:", error)
      setSaveStatus(`Error: ${error.message || "Could not save Agent ID."}`)
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center mb-8">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.push('/')} 
          className="mr-4 hover:bg-[#222222] text-gray-300 hover:text-white"
          aria-label="Back to home"
        >
          <ArrowLeft size={40} />
        </Button>
        <h1 className="text-3xl font-light text-gray-200">Settings</h1>
      </div>

      <div className="flex gap-12">
        <div className="w-64">
          <nav className="space-y-1">
            <Button
              variant="ghost"
              className={`w-full justify-start ${
                activeTab === "account"
                  ? "bg-[#111111] text-white"
                  : "text-gray-300 hover:bg-[#222222] hover:text-white"
              }`}
              onClick={() => setActiveTab("account")}
            >
              Account
            </Button>
            <Button
              variant="ghost"
              className={`w-full justify-start ${
                activeTab === "billing"
                  ? "bg-[#111111] text-white"
                  : "text-gray-300 hover:bg-[#222222] hover:text-white"
              }`}
              onClick={() => setActiveTab("billing")}
            >
              Billing
            </Button>
          </nav>
        </div>

        <div className="flex-1">
          {activeTab === "account" && (
            <div className="bg-[#222222] border border-gray-700 rounded-lg p-6">
              <h2 className="text-xl font-medium text-gray-200 mb-6">Account Settings</h2>

              <div className="space-y-8">
                <div>
                  <h3 className="text-gray-200 font-medium mb-2">ElevenLabs Agent ID</h3>
                  <p className="text-sm text-gray-400 mb-3">
                    Enter your custom ElevenLabs Agent ID to personalize your AI interactions.
                  </p>
                  <div className="flex items-center gap-3">
                    <Input
                      type="text"
                      placeholder="Enter your Agent ID"
                      value={agentIdInput}
                      onChange={(e) => setAgentIdInput(e.target.value)}
                      className="max-w-sm bg-[#111111] border-gray-600 text-white placeholder-gray-500"
                    />
                    <Button
                      onClick={handleSaveAgentId}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Save Agent ID
                    </Button>
                  </div>
                  {saveStatus && (
                    <p className={`mt-2 text-sm ${saveStatus.startsWith("Error") ? "text-red-400" : "text-green-400"}`}>
                      {saveStatus}
                    </p>
                  )}
                </div>

                <div className="border-t border-gray-700 pt-6">
                  <h3 className="text-gray-200 font-medium mb-2">Sign Out</h3>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-400">Log out of your account on this device.</p>
                    <Button
                      variant="outline"
                      className="bg-[#333333] hover:bg-[#444444] text-white border-gray-600"
                      onClick={handleLogout}
                    >
                      Log out
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "billing" && (
            <div className="bg-[#222222] border border-gray-700 rounded-lg p-4 max-w-md">
              <div className="flex items-center gap-3">
                <div className="text-white">
                  <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M20 10C15 10 10 15 10 20C10 25 15 30 20 30C25 30 30 25 30 20C30 15 25 10 20 10ZM20 28C16.13 28 12 24.87 12 20C12 15.13 16.13 12 20 12C23.87 12 28 15.13 28 20C28 24.87 23.87 28 20 28Z"
                      fill="currentColor"
                    />
                    <path d="M20 15V25M15 20H25" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </div>
                <h2 className="text-lg font-medium text-gray-200 my-auto">Free plan</h2>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
