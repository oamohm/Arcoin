"use client"
/**
 * ARCOIN â€” providers.tsx
 * Root provider tree. Wraps entire app.
 * Order matters: Privy â†’ QueryClient â†’ WagmiProvider
 */

import { PrivyProvider }                     from "@privy-io/react-auth"
import { WagmiProvider }                     from "@privy-io/wagmi"
import { QueryClient, QueryClientProvider }  from "@tanstack/react-query"
import { createConfig }                      from "@wagmi/core"
import { arcTestnet, arcTransport }          from "@/lib/chains"
import { ARC_CHAIN_ID }                      from "@/lib/constants"

const wagmiConfig = createConfig({
  chains:     [arcTestnet],
  transports: { [ARC_CHAIN_ID]: arcTransport },
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:    12_000,   // 12s â€” matches balance refresh interval
      gcTime:       60_000,
      retry:        2,
      retryDelay:   (n) => Math.min(1000 * 2 ** n, 10_000),
    },
  },
})

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        loginMethods: ["email", "wallet"],
        appearance: {
          theme:       "dark",
          accentColor: "#22D3EE",   // Arc cyan â€” terminal aesthetic
          logo:        "/logo.svg",
          landingHeader: "Arcoin â€” Arc Network",
          loginMessage:  "Connect to start transacting on Arc",
        },
        defaultChain:     arcTestnet,
        supportedChains: [arcTestnet],
        embeddedWallets: {
          createOnLogin:         "users-without-wallets",
          requireUserPasswordOnCreate: false,
          noPromptOnSignature:   false,
        },
        mfa: {
          noPromptOnMfaRequired: false,
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          {children}
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  )
}
