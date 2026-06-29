"use client"
import React, { useState } from "react"
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ARCOIN â€” layout + screen components (bundled for efficiency)
// WelcomeModal Â· BottomNav Â· MoreScreen
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

import { usePrivy }    from "@privy-io/react-auth"
import { useArcID }   from "@/hooks/useArcID"
import { APP, EXPLORER } from "@/lib/constants"
import type { AppTab }   from "@/types"

// â”€â”€ WELCOME MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function WelcomeModal({ onClose }: { onClose: () => void }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
      backdropFilter: "blur(12px)", zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
    }}>
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: "24px", width: "100%", maxWidth: "380px", padding: "28px 24px",
        animation: "modal-in 0.25s ease forwards",
      }}>
        {/* Logo */}
        <div style={{
          width: "64px", height: "64px", border: "1.5px solid var(--cyan)",
          borderRadius: "18px", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: "28px", background: "var(--cyan-glow)",
          margin: "0 auto 20px", animation: "logo-glow 3s ease-in-out infinite",
        }}>â—ˆ</div>

        <h2 style={{
          fontFamily: "var(--font-mono)", fontSize: "20px", fontWeight: "700",
          color: "var(--text)", textAlign: "center", marginBottom: "6px",
        }}>
          Arcoin à¤®à¥‡à¤‚ à¤¸à¥à¤µà¤¾à¤—à¤¤ à¤¹à¥ˆ
        </h2>
        <p style={{ fontSize: "13px", color: "var(--text-dim)", textAlign: "center",
                    marginBottom: "24px", lineHeight: 1.6 }}>
          Arc Network à¤•à¤¾ DeFi Operating Systemà¥¤<br />
          Send Â· Stream Â· Swap â€” à¤à¤• à¤œà¤—à¤¹à¥¤
        </p>

        {/* Network info */}
        <div style={{ background: "var(--bg)", borderRadius: "var(--radius)", padding: "14px", marginBottom: "20px" }}>
          {[
            { label: "Network",  value: "â— Arc Testnet", color: "var(--green)" },
            { label: "Chain ID", value: "5042002" },
            { label: "Gas Token",value: "USDC",          color: "var(--cyan)"  },
            { label: "Explorer", value: "Blockscout"     },
          ].map(row => (
            <div key={row.label} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "5px 0", borderBottom: "1px solid var(--border)",
            }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px",
                             letterSpacing: "0.08em", color: "var(--text-dim)", textTransform: "uppercase" }}>
                {row.label}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px",
                             color: row.color ?? "var(--text)", fontWeight: "600" }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            width: "100%", background: "var(--cyan)", color: "#0A0E1A",
            fontWeight: "700", fontSize: "15px", border: "none",
            borderRadius: "var(--radius)", padding: "14px",
            cursor: "pointer", fontFamily: "var(--font-sans)",
          }}
        >
          Dashboard à¤ªà¤° à¤œà¤¾à¤à¤‚ â†’
        </button>

        <p style={{ textAlign: "center", marginTop: "14px", fontSize: "12px", color: "var(--text-dim)" }}>
          Test USDC à¤šà¤¾à¤¹à¤¿à¤? â†’&nbsp;
          <a href={APP.faucet} target="_blank" rel="noopener noreferrer"
             style={{ color: "var(--cyan)", textDecoration: "none" }}>
            faucet.circle.com â†—
          </a>
        </p>
      </div>
    </div>
  )
}

// â”€â”€ BOTTOM NAV â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const NAV_ITEMS: { id: AppTab; icon: string; label: string }[] = [
  { id: "dashboard", icon: "â¬¡", label: "Dashboard" },
  { id: "pay",       icon: "â†‘", label: "Pay"       },
  { id: "stream",    icon: "âŸ³", label: "Stream"    },
  { id: "audit",     icon: "â‰¡", label: "Audit"     },
  { id: "more",      icon: "â—Ž", label: "More"      },
]

export function BottomNav({
  activeTab, onNavigate,
}: { activeTab: AppTab; onNavigate: (tab: string) => void }) {
  return (
    <nav style={{
      position:   "fixed",
      bottom:     0,
      left:       "50%",
      transform:  "translateX(-50%)",
      width:      "100%",
      maxWidth:   "480px",
      background: "var(--bg)",
      borderTop:  "1px solid var(--border)",
      padding:    "8px 0 calc(8px + env(safe-area-inset-bottom, 0px))",
      display:    "flex",
      zIndex:     30,
    }}>
      {NAV_ITEMS.map(item => {
        const isActive = activeTab === item.id ||
          (item.id === "pay" && activeTab === "receive")
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", gap: "3px", padding: "6px 0",
              cursor: "pointer", background: "none", border: "none",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <span style={{
              fontSize: "20px", lineHeight: "1",
              transform: isActive ? "scale(1.1)" : "scale(1)",
              transition: "transform 0.15s",
            }}>
              {item.icon}
            </span>
            <span style={{
              fontSize: "10px", fontWeight: "500", letterSpacing: "0.02em",
              color: isActive ? "var(--cyan)" : "var(--text-dim)",
              transition: "color 0.15s",
            }}>
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

// â”€â”€ MORE SCREEN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function MoreScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  const { user, logout } = usePrivy()
  const arcId = useArcID()
  const address = user?.wallet?.address ?? ""
  const shortAddr = address ? `${address.slice(0,6)}...${address.slice(-4)}` : "â€”"
  const [registerName, setRegisterName] = React.useState("")
  const [showRegister, setShowRegister] = React.useState(false)

  const resources = [
    { label: "Get Testnet USDC",    sub: "faucet.circle.com",    icon: "â›½", href: APP.faucet     },
    { label: "Blockscout Explorer", sub: "atlas.blockscout.com", icon: "â¬¡", href: "https://atlas.blockscout.com" },
    { label: "Arc Documentation",   sub: "docs.arc.io",          icon: "ðŸ“–", href: APP.arcDocs    },
    { label: "APEXISWAP DEX",       sub: "apexiswap.com",        icon: "âš¡", href: APP.apexiswap  },
    { label: "Circle Developer",    sub: "developers.circle.com",icon: "â—¯",  href: APP.circleDev  },
  ]

  const internalLinks = [
    { label: "P2P/B2B Escrow",      sub: "Non-custodial deal lock",  icon: "âš–", screen: "escrow"    },
    { label: "AI Help",             sub: "Claude-powered assistant",  icon: "â—ˆ", screen: "resources" },
    { label: "Gov & Protocol Info", sub: "Fees, treasury, voting",   icon: "âš™", screen: "resources" },
  ]

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 20,
        background: "var(--bg)", borderBottom: "1px solid var(--border)",
        padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "28px", height: "28px", border: "1.5px solid var(--cyan)", borderRadius: "8px",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "14px", background: "var(--cyan-glow)" }}>â—ˆ</div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "15px", fontWeight: "700",
                         color: "var(--cyan)", letterSpacing: "0.08em" }}>ARCOIN</span>
        </div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-dim)" }}>
          v1.0 Â· Phase 1
        </span>
      </div>

      <div style={{ padding: "16px" }}>
        {/* Resources card */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)",
                      borderRadius: "var(--radius-lg)", marginBottom: "12px", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.12em",
                           color: "var(--text-dim)", textTransform: "uppercase" }}>Resources</span>
          </div>
          {resources.map(r => (
            <a key={r.label} href={r.href} target="_blank" rel="noopener noreferrer" style={{
              display: "flex", alignItems: "center", gap: "12px",
              padding: "12px 16px", borderBottom: "1px solid var(--border)",
              textDecoration: "none", transition: "background 0.1s",
            }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px",
                            background: "var(--surface2)", display: "flex",
                            alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>
                {r.icon}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: "13px", color: "var(--text)", fontWeight: "500" }}>{r.label}</p>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-dim)", marginTop: "2px" }}>{r.sub}</p>
              </div>
              <span style={{ color: "var(--text-muted)", fontSize: "14px" }}>â†—</span>
            </a>
          ))}
        </div>

        {/* ArcID card */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)",
                      borderRadius: "var(--radius-lg)", marginBottom: "12px", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.12em",
                           color: "var(--text-dim)", textTransform: "uppercase" }}>My ArcID</span>
          </div>
          <div style={{ padding: "16px" }}>
            <div style={{ background: "var(--bg)", borderRadius: "var(--radius)", padding: "14px",
                          textAlign: "center", marginBottom: "12px" }}>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "18px", fontWeight: "700",
                          color: "var(--cyan)" }}>@yourname.arc</p>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-dim)", marginTop: "4px" }}>
                {shortAddr}
              </p>
            </div>
            {!showRegister ? (
              <button
                onClick={() => setShowRegister(true)}
                style={{
                  width: "100%", background: "transparent", color: "var(--cyan)",
                  fontSize: "13px", border: "1px solid var(--cyan-dim)",
                  borderRadius: "var(--radius)", padding: "12px", cursor: "pointer",
                  fontFamily: "var(--font-mono)",
                }}
              >
                Register ArcID â€” 1 USDC/year
              </button>
            ) : (
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  value={registerName}
                  onChange={e => setRegisterName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="yourname"
                  style={{
                    flex: 1, background: "var(--bg)", border: "1px solid var(--border)",
                    borderRadius: "var(--radius)", padding: "10px 12px",
                    color: "var(--text)", fontFamily: "var(--font-mono)", fontSize: "14px", outline: "none",
                  }}
                />
                <button
                  onClick={async () => {
                    if (!registerName || registerName.length < 3) return
                    await arcId.register(registerName, 1)
                    setShowRegister(false)
                    setRegisterName("")
                  }}
                  style={{
                    background: "var(--cyan)", color: "#0A0E1A", fontWeight: "700",
                    border: "none", borderRadius: "var(--radius)", padding: "10px 16px",
                    cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: "13px",
                  }}
                >
                  Register
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Internal navigation */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)",
                      borderRadius: "var(--radius-lg)", marginBottom: "12px", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.12em",
                           color: "var(--text-dim)", textTransform: "uppercase" }}>Features</span>
          </div>
          {internalLinks.map((item, i) => (
            <button key={item.label} onClick={() => onNavigate(item.screen)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: "12px",
              padding: "12px 16px", background: "none", border: "none",
              borderBottom: i < internalLinks.length - 1 ? "1px solid var(--border)" : "none",
              cursor: "pointer", textAlign: "left",
            }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px",
                            background: "var(--surface2)", display: "flex",
                            alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>
                {item.icon}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: "13px", color: "var(--text)", fontWeight: "500" }}>{item.label}</p>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-dim)", marginTop: "2px" }}>{item.sub}</p>
              </div>
              <span style={{ color: "var(--cyan)", fontSize: "14px" }}>â†’</span>
            </button>
          ))}
        </div>

        {/* Disconnect */}
        <button
          onClick={logout}
          style={{
            width: "100%", background: "#EF444412",
            border: "1px solid #EF444430", borderRadius: "var(--radius)",
            padding: "14px", color: "var(--red)",
            fontFamily: "var(--font-mono)", fontSize: "13px", cursor: "pointer",
          }}
        >
          Disconnect Wallet
        </button>
      </div>
    </div>
  )
}
