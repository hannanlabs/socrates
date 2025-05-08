"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/supabase/auth-context"
import { getUserSettings, updateUserSettings } from "@/lib/supabase/settings-service"

type SettingsTab = "account" | "billing"

export function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("account")
  const [theme, setTheme] = useState("dark")
  const [isLoading, setIsLoading] = useState(true)
  const { user, signOut } = useAuth()

  useEffect(() => {
    const loadSettings = async () => {
      if (!user) return

      setIsLoading(true)
      try {
        const settings = await getUserSettings(user.id)
        if (settings) {
          setTheme(settings.theme)
        }
      } catch (error) {
        console.error("Error loading settings:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [user])

  const handleThemeChange = async (newTheme: string) => {
    if (!user) return

    setTheme(newTheme)
    try {
      await updateUserSettings(user.id, { theme: newTheme })
    } catch (error) {
      console.error("Error updating theme:", error)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-light text-gray-200 mb-8">Settings</h1>

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
              <h2 className="text-xl font-medium text-gray-200 mb-6">Account</h2>

              {isLoading ? (
                <div className="flex justify-center py-4">
                  <div className="h-6 w-6 animate-spin rounded-full border-4 border-[#CC0033] border-t-transparent"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-gray-200 font-medium">Theme</h3>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className={`${theme === "dark" ? "bg-[#CC0033] text-white" : "bg-[#333333] text-gray-300"}`}
                        onClick={() => handleThemeChange("dark")}
                      >
                        Dark
                      </Button>
                      <Button
                        variant="outline"
                        className={`${theme === "light" ? "bg-[#CC0033] text-white" : "bg-[#333333] text-gray-300"}`}
                        onClick={() => handleThemeChange("light")}
                      >
                        Light
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div>
                      <h3 className="text-gray-200 font-medium">Log out of all devices</h3>
                    </div>
                    <Button
                      variant="outline"
                      className="bg-[#333333] hover:bg-[#444444] text-white border-gray-600"
                      onClick={handleLogout}
                    >
                      Log out
                    </Button>
                  </div>
                </div>
              )}
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
