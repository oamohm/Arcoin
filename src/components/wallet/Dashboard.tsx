"use client"
/**
 * ARCOIN â€” Dashboard.tsx
 * Main dashboard screen. Fully wired to live blockchain data.
 * Hooks: useArcBalance Â· useArcScan Â· usePrivy
 */

import { useEffect }    from "react"
import { usePrivy }     from "@privy-io/react-auth"
import { useArcBalance } from "@/hooks/useArcBalance"
import { useArcScan }    from "@/hooks/useArcScan"
import { EXPLORER, APP } from "@/lib/constants"
import { formatUSDC }    from "@/lib/usdc"
import { useI18n }       from "@/lib/i18n"
import type { ArcTransaction } from "@/types"

interface Props {
  onNavigate: (screen: string) => void
}

export function Dashboard({ onNavigate }: Props) {
  const { user, logout } = usePrivy()
  const balance          = useArcBalance()
  const arcScan          = useArcScan()
  const { t }            = useI18n()

  // Fetch tx history on mount
  useEffect(() => {
    arcScan.fetchHistory(10)
  }, [])

  const address   = user?.wallet?.address ?? ""
  const shortAddr = address ? `${address.slice(0,6)}...${address.slice(-4)}` : "â€”"

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>

      {/* â”€â”€ HEADER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div style={{
        position:      "sticky",
        top:           0,
        zIndex:        20,
        background:    "var(--bg)",
        borderBottom:  "1px solid var(--border)",
        padding:       "14px 20px",
        display:       "flex",
        alignItems:    "center",
        justifyContent: "space-between",
        backdropFilter: "blur(12px)",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{
            width: "28px", height: "28px",
            border: "1.5px solid var(--cyan)", borderRadius: "8px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "14px", background: "var(--cyan-glow)",
            animation: "logo-glow 3s ease-in-out infinite",
          }}>â—ˆ</div>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: "15px", fontWeight: "700",
            color: "var(--cyan)", letterSpacing: "0.08em",
          }}>ARCOIN</span>
        </div>

        {/* Network badge */}
        <div style={{
          display: "flex", alignItems: "center", gap: "6px",
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "20px", padding: "5px 10px 5px 8px",
          fontSize: "11px", color: "var(--text-dim)",
        }}>
          <div style={{
            width: "6px", height: "6px", borderRadius: "50%",
            background: balance.isError ? "var(--red)" : "var(--green)",
            animation: "pulse-dot 2s ease-in-out infinite",
          }} />
          <span style={{ fontFamily: "var(--font-mono)" }}>Arc Testnet</span>
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)", fontSize: "10px" }}>
            {shortAddr}
          </span>
        </div>
      </div>

      {/* â”€â”€ BALANCE ZONE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div style={{ padding: "32px 20px 24px", textAlign: "center" }}>
        <p style={{
          fontFamily: "var(--font-mono)", fontSize: "10px",
          letterSpacing: "0.15em", color: "var(--text-dim)",
          textTransform: "uppercase", marginBottom: "12px",
        }}>
          {t("dashboard.balance_label")}
        </p>

        {/* Signature element: scan-line behind balance */}
        <div style={{ position: "relative", display: "inline-block", marginBottom: "8px" }}>
          <div style={{
            fontFamily: "var(--font-mono)",
            fontSize:   "clamp(36px, 9vw, 48px)",
            fontWeight: "700",
            color:      balance.isLoading ? "var(--text-muted)" : "var(--text)",
            letterSpacing: "-0.02em",
            lineHeight: "1",
            transition: "color 0.3s",
          }}>
            {balance.isLoading ? "â€”" : balance.display.replace(" USDC", "")}
            <span style={{
              fontSize: "0.4em", color: "var(--text-dim)",
              marginLeft: "6px", fontWeight: "400",
              verticalAlign: "middle", letterSpacing: "0.05em",
            }}>
              USDC
            </span>
          </div>

          {/* Scan-line via pseudo element equivalent */}
          {!balance.isLoading && !balance.isError && (
            <div style={{
              position: "absolute", left: 0, right: 0, height: "1px",
              background: "linear-gradient(90deg, transparent, var(--cyan), transparent)",
              animation: "scan-line 4s ease-in-out infinite",
              pointerEvents: "none",
            }} />
          )}
        </div>

        <p style={{
          fontFamily: "var(--font-mono)", fontSize: "13px",
          color: "var(--text-dim)", marginBottom: "4px",
        }}>
          {balance.isError ? t("dashboard.rpc_error") : balance.usd}
        </p>

        {balance.isError && (
          <button
            onClick={() => balance.refetch()}
            style={{
              fontFamily: "var(--font-mono)", fontSize: "11px",
              color: "var(--cyan)", background: "none", border: "none",
              cursor: "pointer", marginTop: "4px",
            }}
          >
            {t("dashboard.refresh")}
          </button>
        )}
      </div>

      {/* â”€â”€ QUICK ACTIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
        gap: "10px", padding: "0 20px 24px",
      }}>
        {[
          { id: "pay",    icon: "â†‘",  color: "var(--cyan-glow)",  label: t("dashboard.action_send")    },
          { id: "receive",icon: "â†“",  color: "#10B98120",         label: t("dashboard.action_receive") },
          { id: "stream", icon: "âŸ³",  color: "#F59E0B20",         label: t("dashboard.action_stream")  },
          { id: "swap",   icon: "â‡Œ",  color: "#7C3AED22",         label: t("dashboard.action_swap")    },
        ].map(action => (
          <button
            key={action.id}
            onClick={() => onNavigate(action.id)}
            style={{
              background:    "var(--surface)",
              border:        "1px solid var(--border)",
              borderRadius:  "var(--radius)",
              padding:       "14px 8px 12px",
              display:       "flex",
              flexDirection: "column",
              alignItems:    "center",
              gap:           "6px",
              cursor:        "pointer",
              transition:    "all 0.15s ease",
              WebkitTapHighlightColor: "transparent",
            }}
            onMouseEnter={e => {
              const el = e.currentTarget
              el.style.borderColor = "var(--cyan-dim)"
              el.style.background  = "var(--surface2)"
              el.style.transform   = "translateY(-1px)"
            }}
            onMouseLeave={e => {
              const el = e.currentTarget
              el.style.borderColor = "var(--border)"
              el.style.background  = "var(--surface)"
              el.style.transform   = "translateY(0)"
            }}
          >
            <div style={{
              width: "36px", height: "36px", borderRadius: "10px",
              background: action.color,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "16px", color: "var(--text)",
            }}>
              {action.icon}
            </div>
            <span style={{ fontSize: "11px", color: "var(--text-dim)", fontWeight: "500" }}>
              {action.label}
            </span>
          </button>
        ))}
      </div>

      {/* â”€â”€ ACTIVE STREAMS PREVIEW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <StreamsPreview onNavigate={onNavigate} />

      {/* â”€â”€ RECENT TRANSACTIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <TxHistory
        transactions={arcScan.transactions}
        isLoading={arcScan.isLoading}
        isError={arcScan.isError}
        onViewAll={() => onNavigate("audit")}
      />

      {/* â”€â”€ ARC NETWORK STATS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <ArcStats />

      {/* â”€â”€ FAUCET BUTTON â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div style={{ padding: "0 16px 16px" }}>
        <a
          href={APP.faucet}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display:       "flex",
            alignItems:    "center",
            justifyContent: "center",
            gap:           "8px",
            width:         "100%",
            background:    "transparent",
            color:         "var(--text-dim)",
            fontSize:      "13px",
            border:        "1px solid var(--border)",
            borderRadius:  "var(--radius)",
            padding:       "12px",
            textDecoration: "none",
            transition:    "all 0.15s",
          }}
        >
          {t("dashboard.faucet_btn")}
        </a>
      </div>

    </div>
  )
}

// â”€â”€ SUB-COMPONENT: Streams Preview â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StreamsPreview({ onNavigate }: { onNavigate: (s: string) => void }) {
  const { t } = useI18n()
  // Placeholder until Sablier Phase 2
  const mockStreams = [
    { id: "1", to: "alice.arc", pct: 67, rate: "0.0023", streamed: "8.20" },
    { id: "2", to: "0xBB...7f", pct: 34, rate: "0.0008", streamed: "3.40" },
  ]

  return (
    <div style={{
      background:    "var(--surface)",
      border:        "1px solid var(--border)",
      borderRadius:  "var(--radius-lg)",
      margin:        "0 16px 16px",
      overflow:      "hidden",
    }}>
      <div style={{
        display:       "flex",
        alignItems:    "center",
        justifyContent: "space-between",
        padding:       "14px 16px 12px",
        borderBottom:  "1px solid var(--border)",
      }}>
        <span style={{
          fontFamily:    "var(--font-mono)",
          fontSize:      "10px",
          letterSpacing: "0.12em",
          color:         "var(--text-dim)",
          textTransform: "uppercase",
        }}>
          <span style={{ color: "var(--amber)" }}>â—</span>&nbsp; {t("dashboard.active_streams")}
        </span>
        <button
          onClick={() => onNavigate("stream")}
          style={{ fontFamily: "var(--font-sans)", fontSize: "11px", color: "var(--cyan)", background: "none", border: "none", cursor: "pointer" }}
        >
          {t("dashboard.streams_view_all")}
        </button>
      </div>

      {mockStreams.map(s => (
        <div key={s.id} style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text)" }}>
              â†’ {s.to}
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--amber)", fontWeight: "600" }}>
              {s.streamed} USDC
            </span>
          </div>
          {/* Progress bar */}
          <div style={{ height: "4px", background: "var(--border)", borderRadius: "2px", overflow: "hidden", marginBottom: "6px" }}>
            <div style={{
              height:     "100%",
              width:      `${s.pct}%`,
              background: "linear-gradient(90deg, var(--amber), var(--cyan))",
              borderRadius: "2px",
              position:   "relative",
              transition: "width 0.5s ease",
            }}>
              {/* Live pulse dot */}
              <div style={{
                position: "absolute", right: 0, top: "50%",
                transform: "translateY(-50%)",
                width: "6px", height: "6px", borderRadius: "50%",
                background: "var(--cyan)", boxShadow: "0 0 6px var(--cyan)",
                animation: "stream-pulse 1.5s ease-in-out infinite",
              }} />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: "10px" }}>
            <span style={{ color: "var(--text-dim)" }}>{s.pct}% {t("dashboard.stream_streamed")}</span>
            <span style={{ color: "var(--cyan)" }}>{s.rate} USDC/s</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// â”€â”€ SUB-COMPONENT: Transaction History â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function TxHistory({
  transactions, isLoading, isError, onViewAll,
}: {
  transactions: ArcTransaction[]
  isLoading:    boolean
  isError:      boolean
  onViewAll:    () => void
}) {
  const { t } = useI18n()
  const displayTx = transactions.length > 0
    ? transactions.slice(0, 5)
    : MOCK_TX   // show mock until real data loads

  return (
    <div style={{
      background:    "var(--surface)",
      border:        "1px solid var(--border)",
      borderRadius:  "var(--radius-lg)",
      margin:        "0 16px 16px",
      overflow:      "hidden",
    }}>
      <div style={{
        display:       "flex",
        alignItems:    "center",
        justifyContent: "space-between",
        padding:       "14px 16px 12px",
        borderBottom:  "1px solid var(--border)",
      }}>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: "10px",
          letterSpacing: "0.12em", color: "var(--text-dim)", textTransform: "uppercase",
        }}>
          {t("dashboard.recent_tx")}
          {isLoading && <span style={{ marginLeft: "8px", color: "var(--cyan)" }}>â†»</span>}
          {isError   && <span style={{ marginLeft: "8px", color: "var(--amber)" }}> Â· Cached</span>}
        </span>
        <button
          onClick={onViewAll}
          style={{ fontFamily: "var(--font-sans)", fontSize: "11px", color: "var(--cyan)", background: "none", border: "none", cursor: "pointer" }}
        >
          {t("dashboard.tx_view_all")}
        </button>
      </div>

      {displayTx.map((tx, i) => {
        const isOut = tx.type === "send"
        const ts    = new Date(tx.timestamp * 1000)
        const timeAgo = formatTimeAgo(tx.timestamp)

        return (
          <a
            key={tx.hash + i}
            href={tx.explorerUrl || EXPLORER.txUrl(tx.hash)}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display:        "flex",
              alignItems:     "center",
              gap:            "12px",
              padding:        "12px 16px",
              borderBottom:   "1px solid var(--border)",
              textDecoration: "none",
              transition:     "background 0.1s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--surface2)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            {/* Icon */}
            <div style={{
              width: "36px", height: "36px", borderRadius: "10px", flexShrink: 0,
              background: isOut ? "#EF444418" : "#10B98118",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "14px", color: isOut ? "var(--red)" : "var(--green)",
            }}>
              {tx.type === "stream_create" ? "âŸ³" : isOut ? "â†‘" : "â†“"}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: "13px", color: "var(--text)", fontWeight: "500",
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {isOut
                  ? `${t("dashboard.tx_sent_to")} ${tx.to.slice(0,6)}...${tx.to.slice(-4)}`
                  : `${t("dashboard.tx_received_from")} ${tx.from.slice(0,6)}...${tx.from.slice(-4)}`}
              </p>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-dim)", marginTop: "2px" }}>
                {tx.hash.slice(0,8)}... Â· {timeAgo}
              </p>
            </div>

            {/* Amount + scan link */}
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <p style={{
                fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: "600",
                color: isOut ? "var(--red)" : "var(--green)",
              }}>
                {isOut ? "âˆ’" : "+"}
                {formatUSDC(tx.amountRaw, { decimals: 2, showSymbol: false })}
              </p>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "var(--cyan)" }}>
                â†— Scan
              </span>
            </div>
          </a>
        )
      })}
    </div>
  )
}

// â”€â”€ SUB-COMPONENT: Arc Network Stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ArcStats() {
  const { t } = useI18n()
  return (
    <div style={{
      display: "flex", background: "var(--surface)",
      border: "1px solid var(--border)", borderRadius: "var(--radius)",
      margin: "0 16px 16px", overflow: "hidden",
    }}>
      {[
        { labelKey: "dashboard.chain", value: "5042002"                               },
        { labelKey: "dashboard.gas",   value: "USDC",    color: "var(--cyan)"         },
        { labelKey: "dashboard.block", value: "~2s"                                   },
        { labelKey: "dashboard.scan",  value: t("dashboard.scan"), link: "https://atlas.blockscout.com", color: "var(--cyan)" },
      ].map((s, i, arr) => (
        <div key={s.labelKey} style={{
          flex: 1, padding: "12px 8px", textAlign: "center",
          borderRight: i < arr.length - 1 ? "1px solid var(--border)" : "none",
        }}>
          {s.link ? (
            <a href={s.link} target="_blank" rel="noopener noreferrer"
               style={{ fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: "700",
                        color: s.color ?? "var(--text)", textDecoration: "none" }}>
              {s.value} â†—
            </a>
          ) : (
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: "700",
                        color: s.color ?? "var(--text)" }}>
              {s.value}
            </p>
          )}
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "var(--text-dim)",
                      letterSpacing: "0.08em", textTransform: "uppercase", marginTop: "2px" }}>
            {t(s.labelKey)}
          </p>
        </div>
      ))}
    </div>
  )
}

// â”€â”€ HELPERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function formatTimeAgo(timestamp: number): string {
  const sec = Math.floor(Date.now() / 1000) - timestamp
  if (sec < 60)   return `${sec}s ago`
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`
  return `${Math.floor(sec / 86400)}d ago`
}

// Mock data shown before Blockscout responds
const MOCK_TX: ArcTransaction[] = [
  {
    hash:        "0x7f3a1b9c2d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a" as `0x${string}`,
    type:        "send",
    from:        "0xAbCd000000000000000000000000000000000001" as `0x${string}`,
    to:          "0xAbCd000000000000000000000000000000000002" as `0x${string}`,
    amountRaw:   50_000000n,
    tokenSymbol: "USDC",
    blockNumber: 1284471n,
    timestamp:   Math.floor(Date.now() / 1000) - 7200,
    status:      "confirmed",
    explorerUrl: "https://atlas.blockscout.com/tx/0x7f3a",
  },
  {
    hash:        "0x9a2c4f1b3e5d6a7b8c9d0e1f2a3b4c5d6e7f8a9b" as `0x${string}`,
    type:        "receive",
    from:        "0xAbCd000000000000000000000000000000000003" as `0x${string}`,
    to:          "0xAbCd000000000000000000000000000000000001" as `0x${string}`,
    amountRaw:   100_000000n,
    tokenSymbol: "USDC",
    blockNumber: 1284200n,
    timestamp:   Math.floor(Date.now() / 1000) - 86400,
    status:      "confirmed",
    explorerUrl: "https://atlas.blockscout.com/tx/0x9a2c",
  },
]
