import type { Metadata } from "next"
import "./globals.css"
import { AuthProvider } from "@/lib/auth/AuthProvider"

export const metadata: Metadata = {
  title: "LifeFlow",
  description: "Your quiet workspace",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
