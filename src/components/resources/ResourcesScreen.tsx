"use client"
/**
 * ARCOIN â€” ResourcesScreen.tsx
 * Resources hub: AI Help (Claude API), Faucet, Links, Gov info.
 *
 * AI Help: Uses Anthropic Claude API via Next.js API route.
 * The API key stays server-side (ANTHROPIC_API_KEY â€” never NEXT_PUBLIC_).
 */

import { useState, useRef, useEffect } from "react"
import { APP, EXPLORER }               from "@/lib/constants"

// â”€â”€ MESSAGE TYPES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface Message {
  role:    "user" | "assistant"
  content: string
  time:    string
}

const QUICK_QUESTIONS = [
  "USDC à¤•à¥‹ Arc Network à¤ªà¤° à¤•à¥ˆà¤¸à¥‡ à¤­à¥‡à¤œà¥‡à¤‚?",
  "Payment stream à¤•à¥à¤¯à¤¾ à¤¹à¥‹à¤¤à¥€ à¤¹à¥ˆ?",
  "Swap à¤•à¥ˆà¤¸à¥‡ à¤•à¤¾à¤® à¤•à¤°à¤¤à¤¾ à¤¹à¥ˆ?",
  "ArcID register à¤•à¥ˆà¤¸à¥‡ à¤•à¤°à¥‡à¤‚?",
  "Escrow à¤•à¥à¤¯à¤¾ à¤¹à¥ˆ à¤”à¤° à¤•à¤¬ use à¤•à¤°à¥‡à¤‚?",
]

const SYSTEM_PROMPT = `You are Arcoin's helpful AI assistant. Arcoin is a DeFi payment hub built on Arc Network (Chain ID 5042002) using USDC as the native gas token.

Key facts:
- Arc Network uses USDC for gas (6 decimals, ERC-20 interface)
- Arcoin features: Send USDC, Payment Streaming (Sablier V2), Token Swap (APEXISWAP), P2P Escrow, ArcID naming
- Block explorer: atlas.blockscout.com
- Testnet faucet: faucet.circle.com
- ArcID format: yourname.arc (registered for 1 USDC/year)
- Payment streaming = USDC flows per-second to recipient
- Escrow = funds locked until delivery confirmed (0.2% fee on release)
- APEXISWAP Router: 0x437b1aBf6e5a69548849b15EC35f83A73Fa1E28F

Answer in Hindi or English based on what the user writes. Be concise and practical. Never give financial advice.`

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function ResourcesScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  const [activeTab, setActiveTab] = useState<"ai" | "links" | "gov">("ai")

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 20,
        background: "var(--bg)", borderBottom: "1px solid var(--border)",
        padding: "14px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        backdropFilter: "blur(12px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => onNavigate("dashboard")} style={{ background: "none", border: "none", color: "var(--text-dim)", fontSize: "20px", cursor: "pointer" }}>â†</button>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", letterSpacing: "0.1em", color: "var(--text)", textTransform: "uppercase", fontWeight: "600" }}>
            Resources
          </span>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "0 16px" }}>
        {([
          { id: "ai",    label: "AI Help"  },
          { id: "links", label: "Links"    },
          { id: "gov",   label: "Gov"      },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, padding: "12px 8px", background: "none",
              border: "none", borderBottom: `2px solid ${activeTab === tab.id ? "var(--cyan)" : "transparent"}`,
              color: activeTab === tab.id ? "var(--cyan)" : "var(--text-dim)",
              fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.08em",
              textTransform: "uppercase", cursor: "pointer", transition: "all 0.15s",
              marginBottom: "-1px",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "ai"    && <AIHelpTab />}
      {activeTab === "links" && <LinksTab />}
      {activeTab === "gov"   && <GovTab />}
    </div>
  )
}

// â”€â”€ AI HELP TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function AIHelpTab() {
  const [messages,   setMessages]   = useState<Message[]>([])
  const [input,      setInput]      = useState("")
  const [isLoading,  setIsLoading]  = useState(false)
  const messagesEnd = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const now = () => new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMsg: Message = { role: "user", content: text.trim(), time: now() }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setIsLoading(true)

    try {
      const res = await fetch("/api/ai-help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          system:   SYSTEM_PROMPT,
        }),
      })

      if (!res.ok) throw new Error(`API error ${res.status}`)
      const data = await res.json()

      setMessages(prev => [...prev, {
        role:    "assistant",
        content: data.content ?? "à¤¸à¤®à¤ à¤¨à¤¹à¥€à¤‚ à¤†à¤¯à¤¾à¥¤ à¤¦à¥‹à¤¬à¤¾à¤°à¤¾ try à¤•à¤°à¥‡à¤‚à¥¤",
        time:    now(),
      }])
    } catch {
      setMessages(prev => [...prev, {
        role:    "assistant",
        content: "AI temporarily unavailableà¥¤ Docs à¤¦à¥‡à¤–à¥‡à¤‚: docs.arc.io",
        time:    now(),
      }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>â—ˆ</div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-dim)", marginBottom: "20px" }}>
              Arcoin AI Assistant<br />
              <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>Powered by Claude</span>
            </p>

            {/* Quick questions */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxWidth: "320px", margin: "0 auto" }}>
              {QUICK_QUESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  style={{
                    background: "var(--surface)", border: "1px solid var(--border)",
                    borderRadius: "var(--radius)", padding: "10px 14px",
                    color: "var(--text-dim)", fontSize: "12px", cursor: "pointer",
                    textAlign: "left", transition: "all 0.15s", fontFamily: "var(--font-sans)",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--cyan-dim)"; e.currentTarget.style.color = "var(--text)" }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-dim)" }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display:       "flex",
              flexDirection: msg.role === "user" ? "row-reverse" : "row",
              gap:           "10px",
              marginBottom:  "12px",
              alignItems:    "flex-end",
            }}
          >
            {/* Avatar */}
            <div style={{
              width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
              background: msg.role === "user" ? "var(--cyan-glow)" : "var(--surface2)",
              border: `1px solid ${msg.role === "user" ? "var(--cyan-dim)" : "var(--border)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "12px", color: msg.role === "user" ? "var(--cyan)" : "var(--text-dim)",
            }}>
              {msg.role === "user" ? "U" : "â—ˆ"}
            </div>

            {/* Bubble */}
            <div style={{
              maxWidth:      "75%",
              background:    msg.role === "user" ? "var(--cyan)" : "var(--surface)",
              border:        msg.role === "user" ? "none" : "1px solid var(--border)",
              borderRadius:  msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              padding:       "10px 14px",
            }}>
              <p style={{
                fontSize:   "13px",
                color:      msg.role === "user" ? "#0A0E1A" : "var(--text)",
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
              }}>
                {msg.content}
              </p>
              <p style={{
                fontFamily: "var(--font-mono)",
                fontSize:   "9px",
                color:      msg.role === "user" ? "rgba(10,14,26,0.5)" : "var(--text-muted)",
                marginTop:  "4px",
                textAlign:  msg.role === "user" ? "left" : "right",
              }}>
                {msg.time}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div style={{ display: "flex", gap: "10px", alignItems: "flex-end", marginBottom: "12px" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "var(--surface2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: "var(--text-dim)" }}>â—ˆ</div>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px 16px 16px 4px", padding: "12px 16px" }}>
              <div style={{ display: "flex", gap: "4px" }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: "6px", height: "6px", borderRadius: "50%",
                    background: "var(--cyan)", opacity: 0.4,
                    animation: `pulse-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEnd} />
      </div>

      {/* Input */}
      <div style={{
        padding:       "12px 16px",
        borderTop:     "1px solid var(--border)",
        display:       "flex",
        gap:           "10px",
        background:    "var(--bg)",
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
          placeholder="Arcoin à¤•à¥‡ à¤¬à¤¾à¤°à¥‡ à¤®à¥‡à¤‚ à¤ªà¥‚à¤›à¥‡à¤‚..."
          style={{
            flex:         1,
            background:   "var(--surface)",
            border:       "1px solid var(--border)",
            borderRadius: "12px",
            padding:      "10px 14px",
            color:        "var(--text)",
            fontSize:     "13px",
            outline:      "none",
          }}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isLoading}
          style={{
            width:         "40px",
            height:        "40px",
            borderRadius:  "50%",
            background:    input.trim() ? "var(--cyan)" : "var(--border)",
            color:         input.trim() ? "#0A0E1A" : "var(--text-muted)",
            border:        "none",
            cursor:        input.trim() ? "pointer" : "not-allowed",
            fontSize:      "16px",
            display:       "flex",
            alignItems:    "center",
            justifyContent: "center",
            flexShrink:    0,
            transition:    "all 0.15s",
          }}
        >
          â†‘
        </button>
      </div>
    </div>
  )
}

// â”€â”€ LINKS TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function LinksTab() {
  const links = [
    { category: "Arc Network",
      items: [
        { label: "Arc Docs",        url: "https://docs.arc.io",                          icon: "ðŸ“–" },
        { label: "Blockscout",      url: "https://atlas.blockscout.com",                 icon: "â¬¡"  },
        { label: "Testnet Faucet",  url: "https://faucet.circle.com",                    icon: "â›½" },
        { label: "Arc Network",     url: "https://arc.network",                          icon: "â—ˆ"  },
      ]
    },
    { category: "DEX & Protocols",
      items: [
        { label: "APEXISWAP",       url: "https://www.apexiswap.com",                   icon: "âš¡" },
        { label: "Circle Developer",url: "https://developers.circle.com",                icon: "â—¯"  },
        { label: "Sablier V2",      url: "https://sablier.com",                         icon: "âŸ³"  },
      ]
    },
    { category: "Arcoin",
      items: [
        { label: "Arcoin App",      url: APP.url,                                        icon: "â—ˆ"  },
        { label: "GitHub",          url: "https://github.com",                           icon: "âŒ¥"  },
      ]
    },
  ]

  return (
    <div style={{ padding: "16px" }}>
      {links.map(section => (
        <div key={section.category} style={{ marginBottom: "16px" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.12em", color: "var(--text-dim)", textTransform: "uppercase", marginBottom: "8px" }}>
            {section.category}
          </p>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
            {section.items.map((item, i) => (
              <a
                key={item.url}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "12px 16px",
                  borderBottom: i < section.items.length - 1 ? "1px solid var(--border)" : "none",
                  textDecoration: "none", transition: "background 0.1s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <span style={{ fontSize: "18px", width: "24px", textAlign: "center" }}>{item.icon}</span>
                <span style={{ flex: 1, fontSize: "13px", color: "var(--text)", fontWeight: "500" }}>{item.label}</span>
                <span style={{ fontSize: "14px", color: "var(--cyan)" }}>â†—</span>
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// â”€â”€ GOV TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function GovTab() {
  return (
    <div style={{ padding: "16px" }}>
      <div style={{ background: "var(--cyan-glow)", border: "1px solid var(--cyan-dim)", borderRadius: "var(--radius)", padding: "14px", marginBottom: "16px" }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--cyan)", fontWeight: "600", marginBottom: "4px" }}>
          Governance â€” Phase 4
        </p>
        <p style={{ fontSize: "12px", color: "var(--text-dim)", lineHeight: 1.6 }}>
          Protocol fee rates, treasury allocation, à¤”à¤° upgrades â€” à¤¸à¤¬ on-chain voting à¤¸à¥‡ control à¤¹à¥‹à¤‚à¤—à¥‡à¥¤
        </p>
      </div>

      {[
        { label: "Protocol Fee", value: "0.1% (10 bps)", desc: "Swap + Stream + Escrow à¤ªà¤°" },
        { label: "Treasury Split", value: "60/25/15", desc: "Dev / Liquidity / Community" },
        { label: "Fee Changes", value: "Governance Vote", desc: "Admin override à¤¨à¤¹à¥€à¤‚ â€” vote required" },
        { label: "Timelock", value: "72 hours", desc: "Distribution execute à¤¹à¥‹à¤¨à¥‡ à¤¸à¥‡ à¤ªà¤¹à¤²à¥‡" },
        { label: "Escrow Fee", value: "0.2%", desc: "Release à¤ªà¤° only â€” create à¤ªà¤° à¤¨à¤¹à¥€à¤‚" },
      ].map(row => (
        <div key={row.label} style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "var(--radius)", padding: "14px 16px", marginBottom: "10px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-dim)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "4px" }}>{row.label}</p>
              <p style={{ fontSize: "12px", color: "var(--text-dim)" }}>{row.desc}</p>
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "14px", fontWeight: "700", color: "var(--cyan)" }}>{row.value}</span>
          </div>
        </div>
      ))}

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "14px", marginTop: "8px" }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-dim)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "8px" }}>Treasury Contracts</p>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-dim)", lineHeight: 1.7 }}>
          ArcoinTreasury.sol â€” 72h timelock, 3-allocation split<br/>
          ArcoinPaymentRouter.sol â€” 0.1% auto-collect<br/>
          ArcoinEscrow.sol â€” 0.2% on release<br/>
          ArcoinRegistry.sol â€” 1 USDC/year ArcID fee
        </p>
      </div>
    </div>
  )
}
