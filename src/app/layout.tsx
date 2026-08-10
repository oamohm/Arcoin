import type { Metadata, Viewport } from "next"
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google"
import { Providers } from "./providers"
import "./globals.css"

// â”€â”€ FONTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const inter = Inter({
  subsets:  ["latin"],
  variable: "--font-inter",
  display:  "swap",
})

const spaceGrotesk = Space_Grotesk({
  subsets:  ["latin"],
  variable: "--font-display",
  display:  "swap",
})

const jetbrainsMono = JetBrains_Mono({
  subsets:  ["latin"],
  variable: "--font-mono",
  display:  "swap",
})

// â”€â”€ METADATA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const metadata: Metadata = {
  title:       "Arcoin â€” DeFi Operating System",
  description: "Arc Network à¤•à¤¾ native payment, streaming, à¤”à¤° swap hubà¥¤ Send Â· Stream Â· Swap.",
  manifest:    "/manifest.json",
  keywords:    ["DeFi", "Arc Network", "USDC", "Payment Streaming", "Web3"],
  authors:     [{ name: "Arcoin" }],
  robots:      "noindex",   // testnet â€” don't index
  icons: {
    icon:   [
      { url: "/icons/icon-32.png",  sizes: "32x32"  },
      { url: "/icons/icon-192.png", sizes: "192x192" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    title:       "Arcoin â€” DeFi Operating System",
    description: "Arc Network à¤•à¤¾ native payment hub",
    type:        "website",
    siteName:    "Arcoin",
  },
}

export const viewport: Viewport = {
  themeColor:          "#0A0E1A",
  width:               "device-width",
  initialScale:        1,
  maximumScale:        1,   // prevent zoom on input focus (mobile UX)
  userScalable:        false,
  viewportFit:         "cover",  // safe area on notched phones
}

// â”€â”€ ROOT LAYOUT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="hi"
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        {/* PWA iOS support */}
        <meta name="apple-mobile-web-app-capable"            content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style"   content="black-translucent" />
        <meta name="apple-mobile-web-app-title"              content="Arcoin" />
        {/* Preconnect to Arc RPC for faster first tx */}
        <link rel="preconnect" href="https://rpc.testnet.arc.network" />
        <link rel="preconnect" href="https://atlas.blockscout.com" />
      </head>
      <body className="bg-arc-bg antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
