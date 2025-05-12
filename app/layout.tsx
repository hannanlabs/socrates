import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/lib/supabase/auth-context"
import Script from "next/script"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Socrates",
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
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <Script id="viewport-fix">
          {`
            // Ensure proper viewport height for mobile browsers
            function setVH() {
              let vh = window.innerHeight * 0.01;
              document.documentElement.style.setProperty('--vh', \`\${vh}px\`);
            }
            window.addEventListener('resize', setVH);
            setVH();
          `}
        </Script>
      </head>
      <body className={inter.className}>
        <AuthProvider>{children}</AuthProvider>
        <Toaster />
        
        {/* ElevenLabs Conversational AI Script */}
        <Script 
          src="https://elevenlabs.io/convai-widget/index.js" 
          strategy="afterInteractive"
        />
      </body>
    </html>
  )
}
