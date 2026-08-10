"use client"
/**
 * ARCOIN â€” page.tsx
 * Root entry point. Handles:
 *   - Unauthenticated â†’ Connect Screen
 *   - Authenticated   â†’ Dashboard (with Welcome modal first-time)
 *
 * All navigation state lives here and is passed down as props.
 * No router needed for single-page app feel.
 */

import { useState, useEffect } from "react"
import { usePrivy }            from "@privy-io/react-auth"
import { ToastProvider }       from "@/components/ui/Toast"
import { TxStatusBar }         from "@/components/ui/TxStatusBar"
import { Dashboard }           from "@/components/wallet/Dashboard"
import { ConnectScreen }       from "@/components/wallet/ConnectScreen"
import { WelcomeModal,
         BottomNav,
         MoreScreen }          from "@/components/layout/LayoutComponents"
import { SendScreen,
         ReceiveScreen,
         AuditScreen }         from "@/components/payment/PaymentScreens"
import type { AppTab, TxState } from "@/types"

export default function Home() {
  const { ready, authenticated } = usePrivy()

  const [tab,          setTab]    = useState<AppTab>("dashboard")
  const [showWelcome,  setWelcome] = useState(false)
  const [globalTxState, setGlobalTxState] = useState<TxState>({ status: "idle" })
  const [globalTxLabel, setGlobalTxLabel] = useState("")

  // On first auth, show Welcome modal
  useEffect(() => {
    if (authenticated) {
      const seen = localStorage.getItem("arcoin_v1_welcomed")
      if (!seen) {
        setWelcome(true)
        localStorage.setItem("arcoin_v1_welcomed", "true")
      }
    }
  }, [authenticated])

  // Loading state
  if (!ready) {
    return (
      <div style={{
        minHeight: "100dvh", display: "flex",
        alignItems: "center", justifyContent: "center",
        background: "var(--bg)",
      }}>
        <div style={{
          width: "40px", height: "40px", borderRadius: "12px",
          border: "1.5px solid var(--cyan)", background: "var(--cyan-glow)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "20px", animation: "logo-glow 1.5s ease-in-out infinite",
        }}>â—ˆ</div>
      </div>
    )
  }

  // Not connected â†’ full connect screen
  if (!authenticated) {
    return (
      <ToastProvider>
        <ConnectScreen />
      </ToastProvider>
    )
  }

  // Shared navigation function passed to all screens
  const navigate = (screen: string) => {
    setTab(screen as AppTab)
  }

  // Shared tx state handler (used by SendScreen, SwapScreen, etc.)
  const handleTxState = (state: TxState, label?: string) => {
    setGlobalTxState(state)
    if (label) setGlobalTxLabel(label)
    if (state.status === "idle") setGlobalTxLabel("")
  }

  return (
    <ToastProvider>
      <main style={{
        maxWidth:      "480px",
        margin:        "0 auto",
        minHeight:     "100dvh",
        display:       "flex",
        flexDirection: "column",
        position:      "relative",
        background:    "var(--bg)",
      }}>

        {/* â”€â”€ ACTIVE SCREEN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div style={{
          flex:          1,
          display:       "flex",
          flexDirection: "column",
          paddingBottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
          overflowY:     "auto",
        }}>
          {tab === "dashboard" && <Dashboard onNavigate={navigate} />}
          {tab === "pay"       && (
            <SendScreen
              onNavigate={navigate}
              onTxState={handleTxState}
            />
          )}
          {tab === "receive"   && <ReceiveScreen onNavigate={navigate} />}
          {tab === "stream"    && <StreamScreen onNavigate={navigate} />}
          {tab === "swap"      && <SwapScreen   onNavigate={navigate} />}
          {tab === "audit"     && <AuditScreen     onNavigate={navigate} />}
          {tab === "escrow"    && <EscrowScreen    onNavigate={navigate} />}
          {tab === "resources" && <ResourcesScreen onNavigate={navigate} />}
          {tab === "more"      && <MoreScreen       onNavigate={navigate} />}
        </div>

        {/* â”€â”€ BOTTOM NAV â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <BottomNav activeTab={tab} onNavigate={navigate} />

        {/* â”€â”€ WELCOME MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {showWelcome && (
          <WelcomeModal onClose={() => setWelcome(false)} />
        )}

        {/* â”€â”€ GLOBAL TX STATUS OVERLAY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <TxStatusBar
          txState={globalTxState}
          label={globalTxLabel}
          onClose={() => setGlobalTxState({ status: "idle" })}
        />

      </main>
    </ToastProvider>
  )
}

// â”€â”€ PLACEHOLDER (temporary for Phase 2 screens) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function PlaceholderScreen({
  title, subtitle, onNavigate,
}: { title: string; subtitle: string; onNavigate: (s: string) => void }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <div style={{
        position: "sticky", top: 0, zIndex: 20,
        background: "var(--bg)", borderBottom: "1px solid var(--border)",
        padding: "14px 20px", display: "flex", alignItems: "center", gap: "12px",
      }}>
        <button
          onClick={() => onNavigate("dashboard")}
          style={{ background: "none", border: "none", color: "var(--text-dim)", fontSize: "20px", cursor: "pointer" }}
        >â†</button>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", letterSpacing: "0.1em",
                       color: "var(--text)", textTransform: "uppercase" }}>
          {title}
        </span>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center", padding: "40px 24px", textAlign: "center" }}>
        <div style={{ fontSize: "40px", marginBottom: "16px" }}>âŸ³</div>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--text-dim)" }}>
          {subtitle}
        </p>
      </div>
    </div>
  )
}
