"use client"
/**
 * ARCOIN — Dashboard.tsx
 * Main dashboard screen. Fully wired to live blockchain data.
 * Hooks: useArcBalance · useArcScan · usePrivy
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

  // Fetch tx history on mount, and re-fetch on an interval so a newly
  // sent/received transaction (done on another screen) shows up here
  // without needing a manual reload.
  useEffect(() => {
    arcScan.fetchHistory(10)
    const interval = setInterval(() => arcScan.fetchHistory(10), 15000)
    return () => clearInterval(interval)
  }, [])

  const address   = user?.wallet?.address ?? ""
  const shortAddr = address ? `${address.slice(0,6)}...${address.slice(-4)}` : "—"

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>

      {/* ── HEADER ──────────────────────────────────────────── */}
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
          }}>◈</div>
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

      {/* ── BALANCE ZONE ────────────────────────────────────── */}
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
            {balance.isLoading ? "—" : balance.display.replace(" USDC", "")}
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

      {/* ── QUICK ACTIONS ────────────────────────────────────── */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
        gap: "10px", padding: "0 20px 24px",
      }}>
        {[
          { id: "pay",    icon: "↑",  color: "var(--cyan-glow)",  label: t("dashboard.action_send")    },
          { id: "receive",icon: "↓",  color: "#10B98120",         label: t("dashboard.action_receive") },
          { id: "stream", icon: "⟳",  color: "#F59E0B20",         label: t("dashboard.action_stream")  },
          { id: "swap",   icon: "⇌",  color: "#7C3AED22",         label: t("dashboard.action_swap")    },
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

      {/* ── ACTIVE STREAMS PREVIEW ───────────────────────────── */}
      <StreamsPreview onNavigate={onNavigate} />

      {/* ── RECENT TRANSACTIONS ──────────────────────────────── */}
      <TxHistory
        transactions={arcScan.transactions}
        isLoading={arcScan.isLoading}
        isError={arcScan.isError}
        onViewAll={() => onNavigate("audit")}
      />

      {/* ── ARC NETWORK STATS ────────────────────────────────── */}
      <ArcStats />

      {/* ── FAUCET BUTTON ────────────────────────────────────── */}
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

// ── SUB-COMPONENT: Streams Preview ───────────────────────────
function StreamsPreview({ onNavigate }: { onNavigate: (s: string) => void }) {
  const { t } = useI18n()
  // Real streams only. Empty by default -- no fake/demo data shown to the user.
  // Wired up in Phase 2 (Sablier) to pull the connected wallet's actual streams.
  const streams: { id: string; to: string; pct: number; rate: string; streamed: string }[] = []

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
          <span style={{ color: "var(--amber)" }}>●</span>&nbsp; {t("dashboard.active_streams")}
        </span>
        <button
          onClick={() => onNavigate("stream")}
          style={{ fontFamily: "var(--font-sans)", fontSize: "11px", color: "var(--cyan)", background: "none", border: "none", cursor: "pointer" }}
        >
          {t("dashboard.streams_view_all")}
        </button>
      </div>

      {streams.length === 0 ? (
        <div style={{ padding: "24px 16px", textAlign: "center" }}>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "var(--text-dim)", marginBottom: "10px" }}>
            No active streams yet
          </p>
          <button
            onClick={() => onNavigate("stream")}
            style={{
              fontFamily: "var(--font-sans)", fontSize: "12px", color: "var(--cyan)",
              background: "none", border: "1px solid var(--cyan)", borderRadius: "8px",
              padding: "6px 14px", cursor: "pointer",
            }}
          >
            + Start a stream
          </button>
        </div>
      ) : streams.map(s => (
        <div key={s.id} style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text)" }}>
              → {s.to}
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

// ── SUB-COMPONENT: Transaction History ───────────────────────
function TxHistory({
  transactions, isLoading, isError, onViewAll,
}: {
  transactions: ArcTransaction[]
  isLoading:    boolean
  isError:      boolean
  onViewAll:    () => void
}) {
  const { t } = useI18n()
  // Only ever show real transactions -- no mock/demo data as a fallback.
  const displayTx = transactions.slice(0, 5)

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
          {isLoading && <span style={{ marginLeft: "8px", color: "var(--cyan)" }}>↻</span>}
          {isError   && <span style={{ marginLeft: "8px", color: "var(--amber)" }}> · Cached</span>}
        </span>
        <button
          onClick={onViewAll}
          style={{ fontFamily: "var(--font-sans)", fontSize: "11px", color: "var(--cyan)", background: "none", border: "none", cursor: "pointer" }}
        >
          {t("dashboard.tx_view_all")}
        </button>
      </div>

      {displayTx.length === 0 && !isLoading ? (
        <div style={{ padding: "24px 16px", textAlign: "center" }}>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "var(--text-dim)" }}>
            No transactions yet
          </p>
        </div>
      ) : displayTx.map((tx, i) => {
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
              {tx.type === "stream_create" ? "⟳" : isOut ? "↑" : "↓"}
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
                {tx.hash.slice(0,8)}... · {timeAgo}
              </p>
            </div>

            {/* Amount + scan link */}
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <p style={{
                fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: "600",
                color: isOut ? "var(--red)" : "var(--green)",
              }}>
                {isOut ? "−" : "+"}
                {formatUSDC(tx.amountRaw, { decimals: 2, showSymbol: false })}
              </p>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "var(--cyan)" }}>
                ↗ Scan
              </span>
            </div>
          </a>
        )
      })}
    </div>
  )
}

// ── SUB-COMPONENT: Arc Network Stats ─────────────────────────
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
              {s.value} ↗
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

// ── HELPERS ───────────────────────────────────────────────────
function formatTimeAgo(timestamp: number): string {
  const sec = Math.floor(Date.now() / 1000) - timestamp
  if (sec < 60)   return `${sec}s ago`
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`
  return `${Math.floor(sec / 86400)}d ago`
}
