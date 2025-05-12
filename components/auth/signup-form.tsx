"use client"

import type React from "react"
import { useState } from "react"
import { useAuth } from "@/lib/supabase/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft } from "lucide-react"

export function SignupForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signupComplete, setSignupComplete] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState("")
  const { signUp, checkIfUserExists } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSignupComplete(false)

    try {
      // Clear previous state
      setSubmittedEmail("")
      
      console.log("Proceeding directly with signup attempt")
      // Proceed directly with signup
      setSubmittedEmail(email)
      await signUp(email, password, name)
      
      console.log("Signup completed successfully")
      setSignupComplete(true)
      setName("")
      setEmail("")
      setPassword("")
    } catch (err: any) {
      // More specific error handling directly from the signUp call
      console.error("Signup error:", err)
      
      const errorMessage = err.message?.toLowerCase() || ""

      if (errorMessage.includes("user already registered") || 
          errorMessage.includes("already been registered") ||
          errorMessage.includes("email link signup timed out") || // Might indicate prior attempt
          errorMessage.includes("already exists")) {
        setError("An account with this email already exists. Please sign in instead.")
      } else if (errorMessage.includes("invalid email") || errorMessage.includes("valid email")) {
        setError("Please enter a valid email address.")
      } else if (errorMessage.includes("password")) { // Check for password requirements
        // You might want to parse the specific requirement from the error if Supabase provides it
        setError("Password doesn't meet requirements (e.g., minimum length).") 
      } else if (errorMessage.includes("rate limit") || errorMessage.includes("security purposes")) {
         setError("Too many attempts. Please wait a minute and try again.") // Handle rate limit specifically
      } else {
        setError("Error creating account. Please try again.") // Generic error
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex w-full h-full min-h-screen relative">
      {/* Back Button */}
      <button 
        onClick={() => window.location.href = 'https://socrateslanding.vercel.app/'}
        className="absolute top-4 left-4 text-black hover:text-gray-700 transition-colors z-10 p-2 rounded-full hover:bg-gray-100"
        aria-label="Back to landing page"
        title="Back to landing page"
      >
        <ArrowLeft size={24} />
      </button>

      {/* Left side - Signup form / Success Message */}
      <div className="w-full md:w-1/2 bg-white p-4 sm:p-8 flex flex-col justify-center overflow-y-auto">
        <div className="max-w-md mx-auto w-full">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-black mb-8">
              {signupComplete ? "Check Your Email" : "Sign Up"}
            </h1>
          </div>

          {signupComplete ? (
            <div className="text-center">
              <p className="text-black mb-4">
                A confirmation email has been sent to <span className="font-semibold">{submittedEmail}</span>.
              </p>
              <p className="text-black">
                Please click the link in the email to complete your registration.
              </p>
              <div className="mt-8 text-sm text-gray-400">
                Already confirmed?{" "}
                <a href="/login" className="text-black hover:underline">
                  Sign in
                </a>
              </div>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm text-black">
                    Name
                  </label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter Name"
                    required
                    className="bg-black border-[0.5px] border-gray-700 text-white rounded-sm h-12 px-4"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm text-black">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter Email"
                    required
                    className="bg-black border-[0.5px] border-gray-700 text-white rounded-sm h-12 px-4"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm text-black">
                    Password
                  </label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter Password"
                    required
                    minLength={6}
                    className="bg-black border-[0.5px] border-gray-700 text-white rounded-sm h-12 px-4"
                    disabled={isLoading}
                  />
                </div>

                {error && <p className="text-blue-500 text-sm">{error}</p>}

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-sm transition-colors"
                  disabled={isLoading}
                >
                  {isLoading ? "Creating account..." : "SIGN UP"}
                </Button>
              </form>

              <div className="mt-8 text-sm text-gray-400">
                Already have an account?{" "}
                <a href="/login" className="text-black hover:underline">
                  Sign in
                </a>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right side - Image */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-gray-900 to-white relative">
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
