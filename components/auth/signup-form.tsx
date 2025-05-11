"use client"

import type React from "react"
import { useState } from "react"
import { useAuth } from "@/lib/supabase/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

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
      
      console.log("Checking if user exists:", email);
      // First check if the user already exists
      const userExists = await checkIfUserExists(email);
      console.log("User exists check result:", userExists);
      
      if (userExists) {
        console.log("User already exists, preventing signup");
        setError("An account with this email already exists. Please sign in instead.");
        setIsLoading(false);
        return;
      }
      
      console.log("User doesn't exist, proceeding with signup");
      // If user doesn't exist, proceed with signup
      setSubmittedEmail(email)
      await signUp(email, password, name)
      
      console.log("Signup completed successfully");
      setSignupComplete(true)
      setName("")
      setEmail("")
      setPassword("")
    } catch (err: any) {
      // More specific error handling
      console.error("Signup error:", err)
      
      // Additional check for user already exists in catch block
      if (err.message?.includes("already registered") || 
          err.message?.includes("already been registered")) {
        setError("An account with this email already exists. Please sign in instead.");
      } else if (err.message?.includes("Invalid email")) {
        setError("Please enter a valid email address.")
      } else if (err.message?.includes("Password")) {
        setError("Password doesn't meet requirements. It should be at least 6 characters.")
      } else {
        setError("Error creating account. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex w-full h-full min-h-screen">
      {/* Left side - Signup form / Success Message */}
      <div className="w-full md:w-1/2 bg-black p-4 sm:p-8 flex flex-col justify-center overflow-y-auto">
        <div className="max-w-md mx-auto w-full">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-8">
              {signupComplete ? "Check Your Email" : "Sign Up"}
            </h1>
          </div>

          {signupComplete ? (
            <div className="text-center">
              <p className="text-white mb-4">
                A confirmation email has been sent to <span className="font-semibold">{submittedEmail}</span>.
              </p>
              <p className="text-white">
                Please click the link in the email to complete your registration.
              </p>
              <div className="mt-8 text-sm text-gray-400">
                Already confirmed?{" "}
                <a href="/login" className="text-white hover:underline">
                  Sign in
                </a>
              </div>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm text-white">
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
                  <label htmlFor="email" className="text-sm text-white">
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
                    minLength={6}
                    className="bg-black border-[0.5px] border-gray-700 text-white rounded-sm h-12 px-4"
                    disabled={isLoading}
                  />
                </div>

                {error && <p className="text-red-500 text-sm">{error}</p>}

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
                <a href="/login" className="text-white hover:underline">
                  Sign in
                </a>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right side - Image */}
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
