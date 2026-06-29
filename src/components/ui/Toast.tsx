"use client"
/**
 * ARCOIN â€” Toast.tsx
 * Notification toasts with Blockscout tx link support.
 * Usage: import { useToast } from "@/components/ui/Toast"
 */

import { useState, useCallback, createContext, useContext, useRef } from "react"
import { EXPLORER } from "@/lib/constants"
import type { ToastMessage } from "@/types"

// â”€â”€ CONTEXT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface ToastCtx {
  success: (title: string, txHash?: `0x${string}`) => void
  error:   (title: string, message?: string) => void
  info:    (title: string, message?: string) => void
  warn:    (title: string, message?: string) => void
}

const ToastContext = createContext<ToastCtx | null>(null)

export function useToast(): ToastCtx {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be inside ToastProvider")
  return ctx
}

// â”€â”€ PROVIDER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const add = useCallback((toast: Omit<ToastMessage, "id">) => {
    const id = crypto.randomUUID()
    setToasts(prev => [...prev.slice(-2), { ...toast, id }]) // max 3

    const duration = toast.txHash ? 8000 : 4000
    const timer = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
      timers.current.delete(id)
    }, duration)
    timers.current.set(id, timer)
  }, [])

  const ctx: ToastCtx = {
    success: (title, txHash) => add({ type: "success", title, txHash }),
    error:   (title, message) => add({ type: "error",  title, message }),
    info:    (title, message) => add({ type: "info",   title, message }),
    warn:    (title, message) => add({ type: "warning", title, message }),
  }

  const ICONS  = { success: "âœ“", error: "âœ•", info: "â„¹", warning: "âš " }
  const COLORS = {
    success: { border: "var(--green)", icon: "#10B98120" },
    error:   { border: "var(--red)",   icon: "#EF444420" },
    info:    { border: "var(--cyan)",  icon: "var(--cyan-glow)" },
    warning: { border: "var(--amber)", icon: "#F59E0B20" },
  }

  return (
    <ToastContext.Provider value={ctx}>
      {children}

      {/* Toast container â€” above bottom nav */}
      <div style={{
        position:  "fixed",
        bottom:    "calc(80px + env(safe-area-inset-bottom, 0px))",
        left:      "50%",
        transform: "translateX(-50%)",
        width:     "calc(100% - 32px)",
        maxWidth:  "440px",
        zIndex:    90,
        display:   "flex",
        flexDirection: "column",
        gap:       "8px",
        pointerEvents: "none",
      }}>
        {toasts.map(t => {
          const c = COLORS[t.type]
          return (
            <div key={t.id} style={{
              background:    "var(--surface)",
              border:        `1px solid ${c.border}`,
              borderRadius:  "16px",
              padding:       "14px 16px",
              display:       "flex",
              alignItems:    "center",
              gap:           "12px",
              pointerEvents: "auto",
              animation:     "toast-in 0.3s ease forwards",
            }}>
              <div style={{
                width:          "32px",
                height:         "32px",
                borderRadius:   "10px",
                background:     c.icon,
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                fontSize:       "15px",
                color:          c.border,
                flexShrink:     0,
              }}>
                {ICONS[t.type]}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: "13px", fontWeight: "600", color: "var(--text)" }}>
                  {t.title}
                </p>
                {t.txHash ? (
                  <a
                    href={EXPLORER.txUrl(t.txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontFamily:     "var(--font-mono)",
                      fontSize:       "11px",
                      color:          "var(--cyan)",
                      textDecoration: "none",
                      display:        "block",
                      marginTop:      "2px",
                    }}
                  >
                    Blockscout à¤ªà¤° à¤¦à¥‡à¤–à¥‡à¤‚ â†—
                  </a>
                ) : t.message ? (
                  <p style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "2px" }}>
                    {t.message}
                  </p>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
