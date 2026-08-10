"use client"
/**
 * ARCOIN â€” TxStatusBar.tsx
 * Full-screen overlay showing real-time transaction progress.
 * Used by Send, Swap, Stream creation â€” any multi-step tx.
 */

import { EXPLORER } from "@/lib/constants"
import type { TxState } from "@/types"

const STEPS = [
  { key: "simulating",   label: "Checking"    },
  { key: "signing",      label: "Signing"     },
  { key: "broadcasting", label: "Sent"        },
  { key: "confirming",   label: "Confirming"  },
  { key: "success",      label: "Done"        },
] as const

const STATUS_INDEX: Record<string, number> = {
  simulating:   0,
  signing:      1,
  broadcasting: 2,
  confirming:   3,
  success:      4,
}

const STATUS_MESSAGES: Record<string, string> = {
  simulating:   "Transaction verify à¤¹à¥‹ à¤°à¤¹à¥€ à¤¹à¥ˆ...",
  signing:      "Wallet à¤¸à¥‡ approve à¤•à¤°à¥‡à¤‚...",
  broadcasting: "Arc Network à¤ªà¤° à¤­à¥‡à¤œà¤¾ à¤œà¤¾ à¤°à¤¹à¤¾ à¤¹à¥ˆ...",
  confirming:   "Block confirmation à¤•à¤¾ à¤‡à¤‚à¤¤à¤œà¤¼à¤¾à¤°...",
  success:      "Transaction confirmed!",
  failed:       "Transaction fail à¤¹à¥‹ à¤—à¤ˆà¥¤",
}

interface Props {
  txState: TxState
  onClose: () => void
  label?:  string   // e.g. "Sending 100 USDC to alice.arc"
}

export function TxStatusBar({ txState, onClose, label }: Props) {
  if (txState.status === "idle") return null

  const currentStep = STATUS_INDEX[txState.status] ?? 0
  const isFailed    = txState.status === "failed"
  const isSuccess   = txState.status === "success"
  const isDone      = isFailed || isSuccess

  return (
    <div style={{
      position:       "fixed",
      inset:          0,
      background:     "rgba(10,14,26,0.92)",
      backdropFilter: "blur(12px)",
      zIndex:         100,
      display:        "flex",
      alignItems:     "center",
      justifyContent: "center",
      padding:        "24px",
    }}>
      <div style={{
        background:    "var(--surface)",
        border:        `1px solid ${isFailed ? "var(--red)" : isSuccess ? "var(--green)" : "var(--border)"}`,
        borderRadius:  "24px",
        padding:       "32px 28px",
        width:         "100%",
        maxWidth:      "380px",
        animation:     "modal-in 0.25s ease forwards",
      }}>

        {/* Icon */}
        <div style={{
          width:          "64px",
          height:         "64px",
          borderRadius:   "18px",
          background:     isFailed ? "var(--red-dim,#EF444418)"
                        : isSuccess ? "var(--green-dim,#10B98118)"
                        : "var(--cyan-glow)",
          border:         `1.5px solid ${isFailed ? "var(--red)" : isSuccess ? "var(--green)" : "var(--cyan-dim)"}`,
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          fontSize:       "28px",
          margin:         "0 auto 20px",
        }}>
          {isFailed ? "âœ•" : isSuccess ? "âœ“" : "â—ˆ"}
        </div>

        {/* Label */}
        {label && (
          <p style={{
            fontFamily: "var(--font-mono)",
            fontSize:   "13px",
            color:      "var(--text-dim)",
            textAlign:  "center",
            marginBottom: "16px",
          }}>
            {label}
          </p>
        )}

        {/* Status message */}
        <p style={{
          fontFamily: "var(--font-mono)",
          fontSize:   "15px",
          fontWeight: "600",
          color:      isFailed ? "var(--red)" : isSuccess ? "var(--green)" : "var(--text)",
          textAlign:  "center",
          marginBottom: "24px",
        }}>
          {STATUS_MESSAGES[txState.status] ?? "Processing..."}
        </p>

        {/* Step indicators */}
        {!isFailed && (
          <div style={{
            display:       "flex",
            alignItems:    "center",
            marginBottom:  "24px",
            gap:           "0",
          }}>
            {STEPS.map((step, i) => {
              const done    = i < currentStep
              const active  = i === currentStep
              const pending = i > currentStep
              return (
                <div key={step.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                  {/* Dot */}
                  <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                    {i > 0 && (
                      <div style={{
                        flex: 1, height: "1px",
                        background: done || active ? "var(--cyan)" : "var(--border)",
                        transition: "background 0.3s",
                      }} />
                    )}
                    <div style={{
                      width:      "20px",
                      height:     "20px",
                      borderRadius: "50%",
                      flexShrink: 0,
                      background: done    ? "var(--cyan)"
                                : active  ? "transparent"
                                :           "var(--border)",
                      border:     active ? "2px solid var(--cyan)" : "none",
                      display:    "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize:   "10px",
                      color:      done ? "#0A0E1A" : "transparent",
                      transition: "all 0.3s",
                      ...(active ? { animation: "pulse-dot 1.5s ease-in-out infinite" } : {}),
                    }}>
                      {done ? "âœ“" : ""}
                    </div>
                    {i < STEPS.length - 1 && (
                      <div style={{
                        flex: 1, height: "1px",
                        background: done ? "var(--cyan)" : "var(--border)",
                        transition: "background 0.3s",
                      }} />
                    )}
                  </div>
                  {/* Label */}
                  <span style={{
                    fontFamily: "var(--font-mono)",
                    fontSize:   "9px",
                    color:      active ? "var(--cyan)" : done ? "var(--text-dim)" : "var(--text-muted)",
                    marginTop:  "4px",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}>
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* TxHash link */}
        {txState.hash && (
          <div style={{
            background:    "var(--bg)",
            borderRadius:  "10px",
            padding:       "10px 14px",
            marginBottom:  "20px",
            display:       "flex",
            justifyContent: "space-between",
            alignItems:    "center",
          }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-dim)" }}>
              {txState.hash.slice(0, 10)}...{txState.hash.slice(-8)}
            </span>
            <a
              href={EXPLORER.txUrl(txState.hash)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--cyan)", textDecoration: "none" }}
            >
              Blockscout â†—
            </a>
          </div>
        )}

        {/* Error detail */}
        {isFailed && txState.error && (
          <div style={{
            background:    "#EF444412",
            border:        "1px solid #EF444430",
            borderRadius:  "10px",
            padding:       "12px 14px",
            marginBottom:  "20px",
          }}>
            <p style={{ fontSize: "13px", color: "var(--red)", lineHeight: 1.5 }}>
              {txState.error.message}
            </p>
          </div>
        )}

        {/* Action button */}
        {isDone && (
          <button
            onClick={onClose}
            style={{
              width:         "100%",
              background:    isSuccess ? "var(--cyan)" : "var(--surface2)",
              color:         isSuccess ? "#0A0E1A" : "var(--text)",
              border:        isSuccess ? "none" : "1px solid var(--border)",
              borderRadius:  "var(--radius)",
              padding:       "14px",
              fontWeight:    "700",
              fontSize:      "15px",
              cursor:        "pointer",
              fontFamily:    "var(--font-sans)",
            }}
          >
            {isSuccess ? "Done âœ“" : "Try Again"}
          </button>
        )}
      </div>
    </div>
  )
}
