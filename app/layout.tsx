import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/lib/supabase/auth-context"
import Script from "next/script"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Socratic",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        {/* Add any head elements here */}
      </head>
      <body className={inter.className}>
        <AuthProvider>{children}</AuthProvider>
        
        {/* ElevenLabs Conversational AI Script */}
        <Script 
          src="https://elevenlabs.io/convai-widget/index.js" 
          strategy="afterInteractive"
        />
      </body>
    </html>
  )
}
