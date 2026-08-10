import type { Metadata, Viewport } from "next"
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google"
import { Providers } from "./providers"
import "./globals.css"

// FONTS (preload: false added to prevent build timeout on vercel)
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: false,
})

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  preload: false,
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  preload: false,
})

// METADATA
export const metadata: Metadata = {
  title: "Arcoin — DeFi Operating System",
  description: "Arc Network native payment, streaming, swap hub. Send, Stream, Swap.",
  manifest: "/manifest.json",
  keywords: ["DeFi", "Arc Network", "USDC", "Payment Streaming", "Web3"],
  authors: [{ name: "Arcoin" }],
  robots: "noindex",
  icons: {
    icon: [
      { url: "/icons/icon-32.png", sizes: "32x32" },
      { url: "/icons/icon-192.png", sizes: "192x192" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    title: "Arcoin — DeFi Operating System",
    description: "Arc Network native payment hub",
    type: "website",
    siteName: "Arcoin",
  },
}

export const viewport: Viewport = {
  themeColor: "#0A1E1A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
}

// ROOT LAYOUT
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Arcoin" />
        <link rel="preconnect" href="https://rpc.testnet.arc.network" />
        <link rel="preconnect" href="https://atlas.blockscout.com" />
      </head>
      <body className="bg-arc-bg antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
