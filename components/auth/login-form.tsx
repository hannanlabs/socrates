"use client"

import type React from "react"
import { useState } from "react"
import { useAuth } from "@/lib/supabase/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LucideChevronLeft, LucideChevronRight } from "lucide-react"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { signIn } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      await signIn(email, password)
    } catch (err) {
      setError("Invalid email or password")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex w-full h-full min-h-screen">
      {/* Left side - Login form */}
      <div className="w-full md:w-1/2 bg-black p-4 sm:p-8 flex flex-col justify-center overflow-y-auto">
        <div className="max-w-md mx-auto w-full">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-8">Sign In</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm text-white">
                User Name
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter User Name"
                required
                className="bg-black border-[0.5px] border-gray-700 text-white rounded-sm h-12 px-4"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm text-white">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Password"
                required
                className="bg-black border-[0.5px] border-gray-700 text-white rounded-sm h-12 px-4"
              />
            </div>


            {error && <p className="text-red-500 text-sm">{error}</p>}

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-sm transition-colors"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "SIGN IN"}
            </Button>
          </form>

          <div className="mt-8 text-sm text-gray-400">
            Don't have an account?{" "}
            <a href="/signup" className="text-white hover:underline">
              Sign up
            </a>
          </div>
        </div>
      </div>

      {/* Right side - Marketing content */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-gray-900 to-black relative">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-50"
          style={{
            backgroundImage: "url('/socrates.png')",
            backgroundSize: "cover",
          }}
        ></div>

      </div>
    </div>
  )
}
