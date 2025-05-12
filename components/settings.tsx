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
  const { user, signOut, updateUserAgentId, updateUserElevenLabsApiKey } = useAuth()
  const [agentIdInput, setAgentIdInput] = useState("")
  const [elevenLabsApiKeyInput, setElevenLabsApiKeyInput] = useState("")
  const [saveStatus, setSaveStatus] = useState<string | null>(null)
  const [saveApiKeyStatus, setSaveApiKeyStatus] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (user?.user_metadata?.elevenlabs_agent_id) {
      setAgentIdInput(user.user_metadata.elevenlabs_agent_id as string)
    } else {
      setAgentIdInput("")
    }
    if (user?.user_metadata?.elevenlabs_api_key) {
      setElevenLabsApiKeyInput(user.user_metadata.elevenlabs_api_key as string)
    } else {
      setElevenLabsApiKeyInput("")
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

  const handleSaveApiKey = async () => {
    setSaveApiKeyStatus(null)
    if (!updateUserElevenLabsApiKey) {
      setSaveApiKeyStatus("Error: Update function not available.")
      return
    }
    try {
      await updateUserElevenLabsApiKey(elevenLabsApiKeyInput)
      setSaveApiKeyStatus("API Key saved successfully!")
    } catch (error: any) {
      console.error("Error saving API Key:", error)
      setSaveApiKeyStatus(`Error: ${error.message || "Could not save API Key."}`)
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center mb-8">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.push('/')} 
          className="mr-4 hover:bg-accent text-muted-foreground hover:text-accent-foreground"
          aria-label="Back to home"
        >
          <ArrowLeft size={40} />
        </Button>
        <h1 className="text-3xl font-light text-foreground">Settings</h1>
      </div>

      <div className="flex gap-12">
        <div className="w-64">
          <nav className="space-y-1">
            <Button
              variant="ghost"
              className={`w-full justify-start ${
                activeTab === "account"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
              onClick={() => setActiveTab("account")}
            >
              Account
            </Button>
            <Button
              variant="ghost"
              className={`w-full justify-start ${
                activeTab === "billing"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
              onClick={() => setActiveTab("billing")}
            >
              Billing
            </Button>
          </nav>
        </div>

        <div className="flex-1">
          {activeTab === "account" && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-medium text-foreground mb-6">Account Settings</h2>

              <div className="space-y-8">
                <div>
                  <h3 className="text-foreground font-medium mb-2">ElevenLabs Agent ID</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Enter your custom ElevenLabs Agent ID to personalize your AI interactions.
                  </p>
                  <div className="flex items-center gap-3">
                    <Input
                      type="text"
                      placeholder="Enter your Agent ID"
                      value={agentIdInput}
                      onChange={(e) => setAgentIdInput(e.target.value)}
                      className="max-w-sm bg-input border-border text-foreground placeholder:text-muted-foreground"
                    />
                    <Button
                      onClick={handleSaveAgentId}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      Save Agent ID
                    </Button>
                  </div>
                  {saveStatus && (
                    <p className={`mt-2 text-sm ${saveStatus.startsWith("Error") ? "text-destructive" : "text-primary"}`}>
                      {saveStatus}
                    </p>
                  )}
                </div>

                <div className="border-t border-border pt-6">
                  <h3 className="text-foreground font-medium mb-2">ElevenLabs API Key</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Enter your ElevenLabs API Key. This will be stored securely.
                  </p>
                  <div className="flex items-center gap-3">
                    <Input
                      type="password"
                      placeholder="Enter your ElevenLabs API Key"
                      value={elevenLabsApiKeyInput}
                      onChange={(e) => setElevenLabsApiKeyInput(e.target.value)}
                      className="max-w-sm bg-input border-border text-foreground placeholder:text-muted-foreground"
                    />
                    <Button
                      onClick={handleSaveApiKey}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      Save API Key
                    </Button>
                  </div>
                  {saveApiKeyStatus && (
                    <p className={`mt-2 text-sm ${saveApiKeyStatus.startsWith("Error") ? "text-destructive" : "text-primary"}`}>
                      {saveApiKeyStatus}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "billing" && (
            <div className="bg-card border border-border rounded-lg p-4 max-w-md">
              <div className="flex items-center gap-3">
                <div className="text-foreground">
                  <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M20 10C15 10 10 15 10 20C10 25 15 30 20 30C25 30 30 25 30 20C30 15 25 10 20 10ZM20 28C16.13 28 12 24.87 12 20C12 15.13 16.13 12 20 12C23.87 12 28 15.13 28 20C28 24.87 23.87 28 20 28Z"
                      fill="currentColor"
                    />
                    <path d="M20 15V25M15 20H25" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </div>
                <h2 className="text-lg font-medium text-foreground my-auto">Free plan</h2>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
