"use client"
/**
 * ARCOIN — SwapScreen.tsx
 * APEXISWAP swap interface. Fully wired to useSwap hook.
 *
 * Flow:
 *   Select tokens → Enter amount → getQuote (auto) →
 *   Review (slippage, impact, deadline) → executeSwap → TxStatusBar
 *
 * Routing is automatic:
 *   USDC ↔ EURC  →  StableFX
 *   Others        →  APEXISWAP Router
 */

import { useState, useEffect, useCallback } from "react"
import { useSwap }        from "@/hooks/useSwap"
import { useArcBalance }  from "@/hooks/useArcBalance"
import { TxStatusBar }    from "@/components/ui/TxStatusBar"
import { useToast }       from "@/components/ui/Toast"
import { TOKENS, APEXISWAP, EXPLORER } from "@/lib/constants"
import { formatUSDC, isValidUSDCAmount } from "@/lib/usdc"
import type { SwapQuote } from "@/types"

// ── TOKEN REGISTRY (extend as new Arc tokens launch) ─────────
const TOKEN_LIST = [
  {
    address:  TOKENS.USDC.address,
    symbol:   "USDC",
    name:     "USD Coin",
    decimals: 6,
    color:    "#2775CA",
    icon:     "◎",
  },
  {
    address:  TOKENS.EURC.address,
    symbol:   "EURC",
    name:     "Euro Coin",
    decimals: 6,
    color:    "#0052B4",
    icon:     "€",
  },
  {
    address:  APEXISWAP.WUSDC,
    symbol:   "WUSDC",
    name:     "Wrapped USDC",
    decimals: 6,
    color:    "#22D3EE",
    icon:     "◈",
  },
] as const

type TokenEntry = typeof TOKEN_LIST[number]

// ── SLIPPAGE OPTIONS ─────────────────────────────────────────
const SLIPPAGE_OPTIONS = [
  { label: "0.1%", bps: 10  },
  { label: "0.5%", bps: 50  },
  { label: "1.0%", bps: 100 },
] as const

// ─────────────────────────────────────────────────────────────
export function SwapScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  const { getQuote, executeSwap, txState, quoteState, reset } = useSwap()
  const balance = useArcBalance()
  const toast   = useToast()

  const [tokenIn,     setTokenIn]     = useState<TokenEntry>(TOKEN_LIST[0])
  const [tokenOut,    setTokenOut]    = useState<TokenEntry>(TOKEN_LIST[1])
  const [amountIn,    setAmountIn]    = useState("")
  const [slippageBps, setSlippage]    = useState(50)
  const [showSettings, setSettings]  = useState(false)
  const [quoteTimer,  setQuoteTimer]  = useState<ReturnType<typeof setTimeout> | null>(null)
  const [showTokenIn,  setShowTokenIn]  = useState(false)
  const [showTokenOut, setShowTokenOut] = useState(false)

  const { quote, isLoading: quoteLoading, expiresIn } = quoteState
  const amountValid = isValidUSDCAmount(amountIn)

  // ── AUTO-QUOTE on amount change (300ms debounce) ─────────────
  useEffect(() => {
    if (quoteTimer) clearTimeout(quoteTimer)
    if (!amountIn || !amountValid) return

    const timer = setTimeout(async () => {
      await getQuote(amountIn, tokenIn.address, tokenOut.address)
    }, 300)

    setQuoteTimer(timer)
    return () => { if (timer) clearTimeout(timer) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amountIn, tokenIn.address, tokenOut.address])

  // ── SWAP DIRECTION ────────────────────────────────────────────
  const flipTokens = useCallback(() => {
    setTokenIn(tokenOut)
    setTokenOut(tokenIn)
    setAmountIn("")
    reset()
  }, [tokenIn, tokenOut, reset])

  // ── EXECUTE ───────────────────────────────────────────────────
  const handleSwap = useCallback(async () => {
    if (!quote) return
    await executeSwap(quote, slippageBps)
    if (txState.status === "success" && txState.hash) {
      toast.success("Swap Confirmed!", txState.hash)
    }
  }, [quote, executeSwap, slippageBps, txState, toast])

  // ── PATH LABEL ────────────────────────────────────────────────
  const pathLabel = quote?.path === "stablefx"
    ? "Circle StableFX"
    : quote?.path === "cctp_bridge"
    ? "CCTP Bridge"
    : "APEXISWAP"

  const pathColor = quote?.path === "stablefx" ? "var(--green)" : "var(--cyan)"

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>

      {/* ── TX STATUS OVERLAY ─────────────────────────────────── */}
      {txState.status !== "idle" && (
        <TxStatusBar
          txState={txState}
          label={`Swapping ${amountIn} ${tokenIn.symbol} → ${tokenOut.symbol}`}
          onClose={reset}
        />
      )}

      {/* ── HEADER ────────────────────────────────────────────── */}
      <div style={{
        position:      "sticky", top: 0, zIndex: 20,
        background:    "var(--bg)", borderBottom: "1px solid var(--border)",
        padding:       "14px 20px",
        display:       "flex", alignItems: "center", justifyContent: "space-between",
        backdropFilter: "blur(12px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => onNavigate("dashboard")} style={{
            background: "none", border: "none", color: "var(--text-dim)",
            fontSize: "20px", cursor: "pointer",
          }}>←</button>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: "13px",
            letterSpacing: "0.1em", color: "var(--text)", textTransform: "uppercase", fontWeight: "600",
          }}>Swap</span>
        </div>

        {/* Settings gear */}
        <button
          onClick={() => setSettings(s => !s)}
          style={{
            background:    showSettings ? "var(--cyan-glow)" : "none",
            border:        `1px solid ${showSettings ? "var(--cyan-dim)" : "var(--border)"}`,
            borderRadius:  "8px",
            color:         showSettings ? "var(--cyan)" : "var(--text-dim)",
            fontSize:      "12px",
            padding:       "6px 10px",
            cursor:        "pointer",
            fontFamily:    "var(--font-mono)",
          }}
        >
          ⚙ {(slippageBps / 100).toFixed(1)}%
        </button>
      </div>

      {/* ── SLIPPAGE SETTINGS PANEL ───────────────────────────── */}
      {showSettings && (
        <div style={{
          background:   "var(--surface)",
          border:       "1px solid var(--border)",
          borderBottom: "none",
          padding:      "14px 20px",
        }}>
          <p style={{
            fontFamily: "var(--font-mono)", fontSize: "10px",
            letterSpacing: "0.12em", color: "var(--text-dim)",
            textTransform: "uppercase", marginBottom: "10px",
          }}>
            Slippage Tolerance
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            {SLIPPAGE_OPTIONS.map(opt => (
              <button
                key={opt.bps}
                onClick={() => { setSlippage(opt.bps); setSettings(false) }}
                style={{
                  flex:          1,
                  background:    slippageBps === opt.bps ? "var(--cyan)" : "var(--surface2)",
                  color:         slippageBps === opt.bps ? "#0A0E1A" : "var(--text-dim)",
                  border:        `1px solid ${slippageBps === opt.bps ? "var(--cyan)" : "var(--border)"}`,
                  borderRadius:  "8px",
                  padding:       "8px",
                  cursor:        "pointer",
                  fontFamily:    "var(--font-mono)",
                  fontSize:      "12px",
                  fontWeight:    slippageBps === opt.bps ? "700" : "400",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {slippageBps >= 100 && (
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--amber)", marginTop: "8px" }}>
              ⚠  High slippage — front-running risk बढ़ जाता है।
            </p>
          )}
        </div>
      )}

      <div style={{ padding: "20px", flex: 1 }}>

        {/* ── FROM TOKEN ────────────────────────────────────────── */}
        <div style={{
          background:    "var(--surface)",
          border:        "1px solid var(--border)",
          borderRadius:  "var(--radius-lg)",
          padding:       "16px",
          marginBottom:  "4px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px",
                           color: "var(--text-dim)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              From
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-dim)" }}>
              Balance: {balance.display}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Token selector */}
            <button
              onClick={() => setShowTokenIn(s => !s)}
              style={{
                display:       "flex",
                alignItems:    "center",
                gap:           "8px",
                background:    "var(--surface2)",
                border:        "1px solid var(--border)",
                borderRadius:  "12px",
                padding:       "8px 12px",
                cursor:        "pointer",
                flexShrink:    0,
              }}
            >
              <span style={{
                width: "24px", height: "24px", borderRadius: "50%",
                background: tokenIn.color + "30",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "12px", color: tokenIn.color,
              }}>
                {tokenIn.icon}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "14px",
                             fontWeight: "700", color: "var(--text)" }}>
                {tokenIn.symbol}
              </span>
              <span style={{ fontSize: "10px", color: "var(--text-dim)" }}>▼</span>
            </button>

            {/* Amount input */}
            <input
              value={amountIn}
              onChange={e => setAmountIn(e.target.value)}
              type="number"
              placeholder="0.00"
              min="0"
              step="0.01"
              style={{
                flex:       1,
                background: "transparent",
                border:     "none",
                outline:    "none",
                color:      "var(--text)",
                fontFamily: "var(--font-mono)",
                fontSize:   "24px",
                fontWeight: "700",
                textAlign:  "right",
              }}
            />
          </div>

          {/* Token dropdown */}
          {showTokenIn && (
            <TokenDropdown
              tokens={TOKEN_LIST}
              exclude={tokenOut.address}
              onSelect={t => { setTokenIn(t); setShowTokenIn(false); setAmountIn(""); reset() }}
            />
          )}

          {/* MAX button */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
            <button
              onClick={() => {
                if (balance.raw) {
                  setAmountIn((Number(balance.raw) / 1e6).toFixed(6))
                }
              }}
              style={{
                fontFamily: "var(--font-mono)", fontSize: "10px",
                color: "var(--cyan)", background: "var(--cyan-glow)",
                border: "1px solid var(--cyan-dim)", borderRadius: "6px",
                padding: "3px 8px", cursor: "pointer",
              }}
            >
              MAX
            </button>
          </div>
        </div>

        {/* ── FLIP BUTTON ───────────────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "center", margin: "4px 0", position: "relative", zIndex: 1 }}>
          <button
            onClick={flipTokens}
            style={{
              width:      "36px",
              height:     "36px",
              borderRadius: "50%",
              background: "var(--surface2)",
              border:     "2px solid var(--border)",
              color:      "var(--text-dim)",
              fontSize:   "16px",
              cursor:     "pointer",
              display:    "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "var(--cyan-dim)"
              e.currentTarget.style.color       = "var(--cyan)"
              e.currentTarget.style.transform   = "rotate(180deg)"
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "var(--border)"
              e.currentTarget.style.color       = "var(--text-dim)"
              e.currentTarget.style.transform   = "rotate(0deg)"
            }}
          >
            ⇅
          </button>
        </div>

        {/* ── TO TOKEN ──────────────────────────────────────────── */}
        <div style={{
          background:   "var(--surface)",
          border:       "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding:      "16px",
          marginBottom: "16px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px",
                           color: "var(--text-dim)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              To (estimated)
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Token selector */}
            <button
              onClick={() => setShowTokenOut(s => !s)}
              style={{
                display:      "flex",
                alignItems:   "center",
                gap:          "8px",
                background:   "var(--surface2)",
                border:       "1px solid var(--border)",
                borderRadius: "12px",
                padding:      "8px 12px",
                cursor:       "pointer",
                flexShrink:   0,
              }}
            >
              <span style={{
                width: "24px", height: "24px", borderRadius: "50%",
                background: tokenOut.color + "30",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "12px", color: tokenOut.color,
              }}>
                {tokenOut.icon}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "14px",
                             fontWeight: "700", color: "var(--text)" }}>
                {tokenOut.symbol}
              </span>
              <span style={{ fontSize: "10px", color: "var(--text-dim)" }}>▼</span>
            </button>

            {/* Quote output */}
            <div style={{ flex: 1, textAlign: "right" }}>
              {quoteLoading ? (
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "20px",
                               color: "var(--text-dim)", animation: "pulse-dot 1s infinite" }}>
                  ...
                </span>
              ) : quote ? (
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "24px",
                               fontWeight: "700", color: "var(--text)" }}>
                  {formatUSDC(quote.amountOutRaw, { decimals: 4, showSymbol: false })}
                </span>
              ) : (
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "20px",
                               color: "var(--text-muted)" }}>—</span>
              )}
            </div>
          </div>

          {showTokenOut && (
            <TokenDropdown
              tokens={TOKEN_LIST}
              exclude={tokenIn.address}
              onSelect={t => { setTokenOut(t); setShowTokenOut(false); setAmountIn(""); reset() }}
            />
          )}
        </div>

        {/* ── QUOTE DETAILS ─────────────────────────────────────── */}
        {quote && (
          <div style={{
            background:   "var(--surface)",
            border:       "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding:      "14px",
            marginBottom: "16px",
          }}>
            {[
              {
                label: "Route",
                value: pathLabel,
                valueColor: pathColor,
              },
              {
                label: "Price Impact",
                value: `${quote.priceImpact.toFixed(2)}%`,
                valueColor: quote.priceImpact > 2 ? "var(--amber)"
                          : quote.priceImpact > 5 ? "var(--red)"
                          : "var(--green)",
              },
              {
                label: "Slippage",
                value: `${(slippageBps / 100).toFixed(1)}%`,
              },
              {
                label: "Min. Received",
                value: formatUSDC(
                  (quote.amountOutRaw * BigInt(10000 - slippageBps)) / 10000n,
                  { decimals: 4 }
                ),
              },
              {
                label: "Gas Est.",
                value: "~0.002 USDC",
                dim: true,
              },
            ].map(row => (
              <div key={row.label} style={{
                display:       "flex",
                justifyContent: "space-between",
                alignItems:    "center",
                padding:       "5px 0",
                borderBottom:  "1px solid var(--border)",
              }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px",
                               color: "var(--text-dim)", letterSpacing: "0.08em",
                               textTransform: "uppercase" }}>
                  {row.label}
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px",
                               color: row.valueColor ?? (row.dim ? "var(--text-dim)" : "var(--text)"),
                               fontWeight: "600" }}>
                  {row.value}
                </span>
              </div>
            ))}

            {/* Quote countdown */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: "10px",
                color: expiresIn < 10 ? "var(--red)" : "var(--text-dim)",
              }}>
                Quote expires in {expiresIn}s
                {expiresIn < 10 && " ⚠ "}
              </span>
            </div>
          </div>
        )}

        {/* ── HIGH IMPACT WARNING ───────────────────────────────── */}
        {quote && quote.priceImpact > 3 && (
          <div style={{
            background:   "#F59E0B18",
            border:       "1px solid #F59E0B44",
            borderRadius: "var(--radius)",
            padding:      "12px 14px",
            marginBottom: "16px",
            display:      "flex",
            gap:          "10px",
          }}>
            <span>⚠ </span>
            <p style={{ fontSize: "12px", color: "var(--amber)", lineHeight: 1.5 }}>
              High price impact ({quote.priceImpact.toFixed(1)}%)।
              Amount reduce करें या slippage बढ़ाएं।
            </p>
          </div>
        )}

        {/* ── SWAP BUTTON ───────────────────────────────────────── */}
        <button
          onClick={handleSwap}
          disabled={!quote || !amountValid || quoteLoading || expiresIn === 0}
          style={{
            width:         "100%",
            background:    quote && amountValid && expiresIn > 0
                             ? "var(--cyan)" : "var(--border)",
            color:         quote && amountValid && expiresIn > 0
                             ? "#0A0E1A" : "var(--text-dim)",
            fontWeight:    "700",
            fontSize:      "15px",
            border:        "none",
            borderRadius:  "var(--radius)",
            padding:       "16px",
            cursor:        quote && amountValid ? "pointer" : "not-allowed",
            fontFamily:    "var(--font-sans)",
            transition:    "all 0.15s",
            letterSpacing: "0.01em",
          }}
        >
          {!amountIn       ? "Amount डालें"
           : !amountValid  ? "Invalid Amount"
           : quoteLoading  ? "Quote ले रहे हैं..."
           : !quote        ? "Quote नहीं मिली"
           : expiresIn === 0 ? "Quote Expired — Refresh करें"
           : `Swap ${tokenIn.symbol} → ${tokenOut.symbol}`}
        </button>

        {/* ── APEXISWAP ATTRIBUTION ─────────────────────────────── */}
        <p style={{
          textAlign:  "center",
          marginTop:  "14px",
          fontFamily: "var(--font-mono)",
          fontSize:   "10px",
          color:      "var(--text-muted)",
        }}>
          Powered by{" "}
          <a
            href="https://www.apexiswap.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--cyan)", textDecoration: "none" }}
          >
            APEXISWAP ↗
          </a>
          {" "}· Arc Testnet · Non-custodial
        </p>
      </div>
    </div>
  )
}

// ── TOKEN DROPDOWN ────────────────────────────────────────────
function TokenDropdown({
  tokens,
  exclude,
  onSelect,
}: {
  tokens:   readonly TokenEntry[]
  exclude:  string
  onSelect: (t: TokenEntry) => void
}) {
  return (
    <div style={{
      position:     "absolute",
      left:         0,
      right:        0,
      top:          "100%",
      background:   "var(--surface2)",
      border:       "1px solid var(--border)",
      borderRadius: "var(--radius)",
      zIndex:       50,
      overflow:     "hidden",
      marginTop:    "4px",
      boxShadow:    "0 8px 24px rgba(0,0,0,0.4)",
    }}>
      {tokens
        .filter(t => t.address !== exclude)
        .map(t => (
          <button
            key={t.address}
            onClick={() => onSelect(t)}
            style={{
              width:      "100%",
              display:    "flex",
              alignItems: "center",
              gap:        "12px",
              padding:    "12px 16px",
              background: "none",
              border:     "none",
              borderBottom: "1px solid var(--border)",
              cursor:     "pointer",
              transition: "background 0.1s",
              textAlign:  "left",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--surface)"}
            onMouseLeave={e => e.currentTarget.style.background = "none"}
          >
            <div style={{
              width: "32px", height: "32px", borderRadius: "50%",
              background: t.color + "30",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "14px", color: t.color, flexShrink: 0,
            }}>
              {t.icon}
            </div>
            <div>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "14px",
                          fontWeight: "700", color: "var(--text)" }}>
                {t.symbol}
              </p>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-dim)" }}>
                {t.name}
              </p>
            </div>
          </button>
        ))}
    </div>
  )
}
