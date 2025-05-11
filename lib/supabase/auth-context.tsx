"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import type { Session, User } from "@supabase/supabase-js"
import { supabase } from "./client"

type AuthContextType = {
  user: User | null
  session: Session | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signOut: () => Promise<void>
  checkIfUserExists: (email: string) => Promise<boolean>
  updateUserAgentId: (agentId: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const setData = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()
      if (error) {
        console.error(error)
        setIsLoading(false)
        return
      }

      setSession(session)
      setUser(session?.user ?? null)

      setIsLoading(false)
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log("onAuthStateChange event:", _event);
      console.log("onAuthStateChange session:", session);
      if (session?.user) {
        console.log("onAuthStateChange user_metadata:", session.user.user_metadata);
      }

      setSession(session)
      setUser(session?.user ?? null)

      setIsLoading(false)
    })

    setData()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // New function to check if a user with the given email already exists
  const checkIfUserExists = async (email: string): Promise<boolean> => {
    try {
      // First try to sign in with a non-existent method to check if the user exists
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: "check-only-not-real-auth-" + Math.random() // Random to ensure no accidental login
      });
      
      // If we get an error that includes the phrase "Invalid login credentials", 
      // this means the user exists but the password is wrong
      if (error && error.message?.includes("Invalid login credentials")) {
        console.log("User exists based on invalid credentials response");
        return true;
      }
      
      // Alternative method: try to sign up with the same email with dummy data
      // If this fails with "User already registered", then the user exists
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password: "temporary-password-" + Math.random().toString(36).slice(2, 10),
        options: { 
          data: { checkOnly: true } 
        }
      });
      
      if (signUpError && (
        signUpError.message?.includes("User already registered") || 
        signUpError.message?.includes("already been registered")
      )) {
        console.log("User exists based on signup error:", signUpError.message);
        return true;
      }
      
      // If neither check triggered a "user exists" condition, assume they don't exist
      return false;
    } catch (err) {
      console.error("Unexpected error checking if user exists:", err);
      // To be safe, if we can't determine, assume false - will show error on actual signup attempt
      return false;
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    
    // Force navigation to home page after successful sign in
    window.location.href = '/'
  }

  const signUp = async (email: string, password: string, name: string) => {
    console.log("Attempting signUp with:", { email, name });
    const { data: signUpResponse, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name,
        },
      },
    })

    if (error) {
      console.error("Supabase signUp error:", error);
      throw error
    }
    console.log("Supabase signUp successful:", signUpResponse);

    if (signUpResponse?.user) {
        console.log("User object from signUp response:", signUpResponse.user);
        console.log("user_metadata from signUp response:", signUpResponse.user.user_metadata);
    }
  }

  const signOut = async () => {
    try {
      // Clear session state immediately for responsive UI
      setUser(null)
      setSession(null)
      
      // Sign out with Supabase
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      // Navigate to home/login page if needed
      window.location.href = '/'
    } catch (error) {
      console.error("Error during sign out:", error)
      throw error
    }
  }

  const updateUserAgentId = async (agentId: string) => {
    if (!user) {
      throw new Error("User must be logged in to update Agent ID.")
    }
    const { data, error } = await supabase.auth.updateUser({
      data: { elevenlabs_agent_id: agentId },
    })

    if (error) {
      console.error("AuthProvider updateUserAgentId error:", error)
      throw error
    }

    if (data.user) {
      // Update the local user state to reflect the change immediately
      setUser(data.user)
      console.log("AuthProvider Agent ID updated successfully. New user data:", data.user);
    }
  }

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signIn, signUp, signOut, checkIfUserExists, updateUserAgentId }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
