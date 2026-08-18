import type { Metadata, Viewport } from "next"
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google"
import dynamic from "next/dynamic"
import "./globals.css"

// Privy's PrivyProvider only works in the browser (it's not SSR-safe), so
// loading it via next/dynamic with ssr:false keeps Next.js from trying to
// execute it during the build's static page generation -- which was
// failing with "Cannot initialize the Privy provider with an invalid App
// ID" because env vars aren't resolved the same way in that build step.
const Providers = dynamic(
  () => import("./providers").then(mod => mod.Providers),
  { ssr: false }
)

// ── FONTS ─────────────────────────────────────────────────
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

// ── METADATA ─────────────────────────────────────────────
export const metadata: Metadata = {
  title:       "Arcoin — DeFi Operating System",
  description: "Arc Network का native payment, streaming, और swap hub। Send · Stream · Swap.",
  manifest:    "/manifest.json",
  keywords:    ["DeFi", "Arc Network", "USDC", "Payment Streaming", "Web3"],
  authors:     [{ name: "Arcoin" }],
  robots:      "noindex",   // testnet — don't index
  icons: {
    icon:   [
      { url: "/icons/icon-32.png",  sizes: "32x32"  },
      { url: "/icons/icon-192.png", sizes: "192x192" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    title:       "Arcoin — DeFi Operating System",
    description: "Arc Network का native payment hub",
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

// ── ROOT LAYOUT ──────────────────────────────────────────
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
        <link rel="preconnect" href="https://testnet.arcscan.app" />
      </head>
      <body className="bg-arc-bg antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
