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

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
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

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signIn, signUp, signOut }}>
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
