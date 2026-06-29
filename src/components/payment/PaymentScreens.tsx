"use client"
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ARCOIN â€” Payment + Audit Screens
// SendScreen Â· ReceiveScreen Â· AuditScreen
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

import { useState, useCallback }  from "react"
import { usePrivy }                from "@privy-io/react-auth"
import QRCode                      from "qrcode.react"
import { useSendPayment }          from "@/hooks/useSendPayment"
import { useArcBalance }           from "@/hooks/useArcBalance"
import { useArcScan }              from "@/hooks/useArcScan"
import { useToast }                from "@/components/ui/Toast"
import { TxStatusBar }             from "@/components/ui/TxStatusBar"
import { isValidUSDCAmount }       from "@/lib/usdc"
import { generateAuditCSV,
         generateTransactionProof } from "@/lib/ArcoinProof"
import { EXPLORER }                from "@/lib/constants"
import { useI18n }                 from "@/lib/i18n"
import type { TxState }            from "@/types"

// â”€â”€ SHARED HEADER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ScreenHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 20,
      background: "var(--bg)", borderBottom: "1px solid var(--border)",
      padding: "14px 20px", display: "flex", alignItems: "center", gap: "12px",
      backdropFilter: "blur(12px)",
    }}>
      <button onClick={onBack} style={{
        background: "none", border: "none", color: "var(--text-dim)",
        fontSize: "20px", cursor: "pointer", lineHeight: 1, padding: "0 4px",
      }}>â†</button>
      <span style={{
        fontFamily: "var(--font-mono)", fontSize: "13px", letterSpacing: "0.1em",
        color: "var(--text)", textTransform: "uppercase", fontWeight: "600",
      }}>{title}</span>
    </div>
  )
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SEND SCREEN
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
export function SendScreen({
  onNavigate,
  onTxState,
}: {
  onNavigate: (s: string) => void
  onTxState:  (state: TxState, label?: string) => void
}) {
  const { send, txState, reset } = useSendPayment()
  const balance = useArcBalance()
  const toast   = useToast()
  const { t }   = useI18n()

  const [to,     setTo]     = useState("")
  const [amount, setAmount] = useState("")
  const [note,   setNote]   = useState("")

  const fee        = amount ? (parseFloat(amount) * 0.001).toFixed(6) : "0.000000"
  const amountValid = isValidUSDCAmount(amount)
  const toValid     = to.startsWith("0x") && to.length === 42

  const handleSend = useCallback(async () => {
    if (!toValid || !amountValid) return

    onTxState({ status: "simulating" }, `Sending ${amount} USDC to ${to.slice(0,6)}...`)

    await send({ to, amount, note: note || undefined })

    if (txState.status === "success" && txState.hash) {
      toast.success("Transaction Confirmed!", txState.hash)
      onTxState({ status: "idle" })
      onNavigate("dashboard")
    } else if (txState.status === "failed") {
      onTxState(txState)
    }
  }, [to, amount, note, toValid, amountValid, send, txState, toast, onNavigate, onTxState])

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <ScreenHeader title={t("send.title")} onBack={() => onNavigate("dashboard")} />

      {/* Inline tx status (not global overlay for send) */}
      {txState.status !== "idle" && (
        <TxStatusBar
          txState={txState}
          label={`Sending ${amount} USDC`}
          onClose={reset}
        />
      )}

      <div style={{ padding: "24px 20px", flex: 1 }}>

        {/* TO field */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{
            fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.12em",
            color: "var(--text-dim)", textTransform: "uppercase", display: "block", marginBottom: "8px",
          }}>
            {t("send.recipient_label")}
          </label>
          <input
            value={to}
            onChange={e => setTo(e.target.value.trim())}
            placeholder={t("send.recipient_placeholder")}
            style={{
              width: "100%", background: "var(--surface)",
              border: `1px solid ${to && !toValid ? "var(--red)" : "var(--border)"}`,
              borderRadius: "var(--radius)", padding: "14px 16px",
              color: "var(--text)", fontFamily: "var(--font-mono)",
              fontSize: "13px", outline: "none", transition: "border-color 0.2s",
            }}
            onFocus={e => e.target.style.borderColor = "var(--cyan-dim)"}
            onBlur={e => e.target.style.borderColor = to && !toValid ? "var(--red)" : "var(--border)"}
          />
          {to && !toValid && (
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--red)", marginTop: "4px" }}>
              {t("send.recipient_error")}
            </p>
          )}
        </div>

        {/* AMOUNT field */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{
            fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.12em",
            color: "var(--text-dim)", textTransform: "uppercase", display: "block", marginBottom: "8px",
          }}>
            {t("send.amount_label")}
          </label>
          <div style={{ position: "relative" }}>
            <input
              value={amount}
              onChange={e => setAmount(e.target.value)}
              type="number" placeholder="0.00" min="0.01" step="0.01"
              style={{
                width: "100%", background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)", padding: "14px 60px 14px 16px",
                color: "var(--text)", fontFamily: "var(--font-mono)",
                fontSize: "22px", fontWeight: "700", outline: "none",
              }}
            />
            <span style={{
              position: "absolute", right: "16px", top: "50%",
              transform: "translateY(-50%)", fontFamily: "var(--font-mono)",
              fontSize: "12px", color: "var(--text-dim)",
            }}>USDC</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-dim)" }}>
              {t("send.balance_prefix")} {balance.display}
            </span>
            <button
              onClick={() => setAmount(balance.raw ? (Number(balance.raw) / 1e6).toString() : "0")}
              style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--cyan)",
                       background: "none", border: "none", cursor: "pointer" }}
            >
              {t("send.max_btn")}
            </button>
          </div>
        </div>

        {/* NOTE field */}
        <div style={{ marginBottom: "24px" }}>
          <label style={{
            fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.12em",
            color: "var(--text-dim)", textTransform: "uppercase", display: "block", marginBottom: "8px",
          }}>
            {t("send.note_label")}
          </label>
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder={t("send.note_placeholder")}
            style={{
              width: "100%", background: "var(--surface)",
              border: "1px solid var(--border)", borderRadius: "var(--radius)",
              padding: "12px 16px", color: "var(--text)",
              fontSize: "13px", outline: "none",
            }}
          />
        </div>

        {/* Fee preview */}
        {amount && amountValid && (
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: "var(--radius)", padding: "14px", marginBottom: "20px",
          }}>
            {[
              { label: t("send.fee_amount"),   value: `${parseFloat(amount).toFixed(6)} USDC` },
              { label: t("send.fee_protocol"), value: `${fee} USDC`,           dim: true },
              { label: t("send.fee_gas"),      value: t("send.fee_gas_value"), dim: true },
            ].map(row => (
              <div key={row.label} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "5px 0", borderBottom: "1px solid var(--border)",
              }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px",
                               color: "var(--text-dim)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  {row.label}
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px",
                               color: row.dim ? "var(--text-dim)" : "var(--text)", fontWeight: "600" }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={!toValid || !amountValid}
          style={{
            width: "100%", background: toValid && amountValid ? "var(--cyan)" : "var(--border)",
            color: toValid && amountValid ? "#0A0E1A" : "var(--text-dim)",
            fontWeight: "700", fontSize: "15px", border: "none",
            borderRadius: "var(--radius)", padding: "14px", cursor: toValid && amountValid ? "pointer" : "not-allowed",
            fontFamily: "var(--font-sans)", transition: "all 0.15s",
          }}
        >
          {t("send.preview_btn")}
        </button>
      </div>
    </div>
  )
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// RECEIVE SCREEN
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
export function ReceiveScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  const { user }  = usePrivy()
  const toast     = useToast()
  const address   = user?.wallet?.address ?? ""
  const [copied, setCopied] = useState(false)

  const copyAddress = async () => {
    if (!address) return
    await navigator.clipboard.writeText(address)
    setCopied(true)
    toast.info("Address Copied", "Clipboard à¤®à¥‡à¤‚ copy à¤¹à¥‹ à¤—à¤¯à¤¾à¥¤")
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <ScreenHeader title="Receive USDC" onBack={() => onNavigate("dashboard")} />

      <div style={{ padding: "32px 20px", flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.15em",
                    color: "var(--text-dim)", textTransform: "uppercase", marginBottom: "24px" }}>
          Scan or Copy Address
        </p>

        {/* QR Code */}
        {address && (
          <div style={{
            background: "white", padding: "16px", borderRadius: "16px",
            marginBottom: "24px", display: "inline-block",
          }}>
            <QRCode value={address} size={180} level="H" />
          </div>
        )}

        {/* Address display */}
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "var(--radius)", padding: "14px 16px",
          width: "100%", maxWidth: "320px", marginBottom: "12px",
          textAlign: "center",
        }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text)",
                      wordBreak: "break-all", lineHeight: 1.6 }}>
            {address || "Wallet not connected"}
          </p>
        </div>

        <button
          onClick={copyAddress}
          style={{
            width: "100%", maxWidth: "320px",
            background: copied ? "var(--green)" : "var(--cyan)",
            color: "#0A0E1A", fontWeight: "700", fontSize: "15px",
            border: "none", borderRadius: "var(--radius)", padding: "14px",
            cursor: "pointer", transition: "background 0.3s", fontFamily: "var(--font-sans)",
            marginBottom: "12px",
          }}
        >
          {copied ? "âœ“ Copied!" : "Copy Address"}
        </button>

        <a
          href={EXPLORER.addressUrl(address)}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: "var(--font-mono)", fontSize: "12px",
            color: "var(--cyan)", textDecoration: "none",
          }}
        >
          Blockscout à¤ªà¤° à¤¦à¥‡à¤–à¥‡à¤‚ â†—
        </a>

        <div style={{
          marginTop: "32px", background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "var(--radius)", padding: "14px", width: "100%", maxWidth: "320px",
        }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-dim)",
                      letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "6px" }}>
            Network Info
          </p>
          <p style={{ fontSize: "12px", color: "var(--text-dim)", lineHeight: 1.6 }}>
            à¤•à¥‡à¤µà¤² <span style={{ color: "var(--cyan)" }}>Arc Testnet (Chain 5042002)</span> à¤¸à¥‡ USDC à¤­à¥‡à¤œà¥‡à¤‚à¥¤
            à¤…à¤¨à¥à¤¯ network à¤¸à¥‡ à¤­à¥‡à¤œà¤¨à¥‡ à¤ªà¤° funds à¤–à¥‹ à¤¸à¤•à¤¤à¥‡ à¤¹à¥ˆà¤‚à¥¤
          </p>
        </div>
      </div>
    </div>
  )
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// AUDIT SCREEN
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
export function AuditScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  const arcScan   = useArcScan()
  const toast     = useToast()
  const [private_, setPrivate] = useState(false)

  const exportCSV = () => {
    // Client-side CSV generation (Confidential mode compliant)
    const rows = ["Hash,Type,Amount,Timestamp,Explorer"]
    arcScan.transactions.forEach(tx => {
      rows.push([
        tx.hash,
        tx.type,
        (Number(tx.amountRaw) / 1e6).toFixed(6),
        new Date(tx.timestamp * 1000).toISOString(),
        tx.explorerUrl,
      ].join(","))
    })
    const blob = new Blob([rows.join("\n")], { type: "text/csv" })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a")
    a.href     = url
    a.download = "arcoin-transactions.csv"
    a.click()
    URL.revokeObjectURL(url)
    toast.success("CSV Exported", "Transaction history downloaded.")
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <div style={{
        position: "sticky", top: 0, zIndex: 20,
        background: "var(--bg)", borderBottom: "1px solid var(--border)",
        padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => onNavigate("dashboard")} style={{
            background: "none", border: "none", color: "var(--text-dim)", fontSize: "20px", cursor: "pointer",
          }}>â†</button>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", letterSpacing: "0.1em",
                         color: "var(--text)", textTransform: "uppercase", fontWeight: "600" }}>Audit</span>
        </div>
        <button
          onClick={() => setPrivate(p => !p)}
          style={{
            background: "none", border: `1px solid ${private_ ? "var(--cyan-dim)" : "var(--border)"}`,
            borderRadius: "8px", color: private_ ? "var(--cyan)" : "var(--text-dim)",
            fontSize: "11px", padding: "6px 10px", cursor: "pointer",
            fontFamily: "var(--font-mono)",
          }}
        >
          {private_ ? "ðŸ”’ Private" : "ðŸ”“ Public"}
        </button>
      </div>

      <div style={{ padding: "16px" }}>

        {/* Privacy notice */}
        {private_ && (
          <div style={{
            background: "var(--surface)", border: "1px solid var(--cyan-dim)",
            borderRadius: "var(--radius)", padding: "12px 14px", marginBottom: "16px",
            display: "flex", alignItems: "flex-start", gap: "10px",
          }}>
            <span style={{ fontSize: "16px" }}>ðŸ”’</span>
            <div>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--cyan)",
                          fontWeight: "600", marginBottom: "2px" }}>Confidential Mode Active</p>
              <p style={{ fontSize: "11px", color: "var(--text-dim)", lineHeight: 1.5 }}>
                Data stays on your device. PDF/CSV generated locally. No server calls.
              </p>
            </div>
          </div>
        )}

        {/* 30-day summary â€” live from Blockscout data */}
        {(() => {
          const cutoff = Math.floor(Date.now() / 1000) - 30 * 86400
          const recent = arcScan.transactions.filter(t => t.timestamp >= cutoff)
          const totalOut = recent.filter(t => t.type === "send")
            .reduce((s, t) => s + Number(t.amountRaw) / 1e6, 0)
          const totalIn  = recent.filter(t => t.type === "receive")
            .reduce((s, t) => s + Number(t.amountRaw) / 1e6, 0)
          return (
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)",
                          borderRadius: "var(--radius-lg)", marginBottom: "12px", overflow: "hidden" }}>
              <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.12em",
                               color: "var(--text-dim)", textTransform: "uppercase" }}>
                  30-Day Summary
                  {arcScan.isLoading && <span style={{ marginLeft: "8px", color: "var(--cyan)" }}>â†»</span>}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                {[
                  { label: "Total Out", value: totalOut.toFixed(2), color: "var(--red)"   },
                  { label: "Total In",  value: totalIn.toFixed(2),  color: "var(--green)" },
                ].map((s, i) => (
                  <div key={s.label} style={{ padding: "16px", borderRight: i === 0 ? "1px solid var(--border)" : "none" }}>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-dim)",
                                letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "6px" }}>
                      {s.label}
                    </p>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: "22px", fontWeight: "700", color: s.color }}>
                      {arcScan.isLoading ? "â€”" : s.value}
                    </p>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-dim)" }}>USDC</p>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Export buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
          <button
            onClick={async () => {
              if (arcScan.transactions.length === 0) {
                toast.info("No transactions", "History load à¤¹à¥‹ à¤°à¤¹à¥€ à¤¹à¥ˆ...")
                return
              }
              try {
                await generateTransactionProof(arcScan.transactions[0])
                toast.success("Arcoin Proof generated!")
              } catch (e) {
                toast.error("PDF Error", "Generation failedà¥¤ Retry à¤•à¤°à¥‡à¤‚à¥¤")
              }
            }}
            style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: "var(--radius)", padding: "14px", color: "var(--text)",
              cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: "12px",
            }}
          >
            â†“ Arcoin Proof PDF
          </button>
          <button
            onClick={() => {
              if (arcScan.transactions.length === 0) {
                toast.info("No transactions", "History load à¤¹à¥‹ à¤°à¤¹à¥€ à¤¹à¥ˆ...")
                return
              }
              generateAuditCSV(arcScan.transactions)
              toast.success("CSV Exported!")
            }}
            style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: "var(--radius)", padding: "14px", color: "var(--text)",
              cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: "12px",
            }}
          >
            â†“ Export CSV
          </button>
        </div>

        {/* Tx history */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)",
                      borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.12em",
                           color: "var(--text-dim)", textTransform: "uppercase" }}>
              Transaction History
              {arcScan.isLoading && <span style={{ marginLeft: "8px", color: "var(--cyan)" }}> â†» Loading</span>}
            </span>
          </div>
          {arcScan.transactions.length === 0 && !arcScan.isLoading && (
            <p style={{ padding: "24px 16px", textAlign: "center", fontFamily: "var(--font-mono)",
                        fontSize: "12px", color: "var(--text-dim)" }}>
              No transactions found
            </p>
          )}
          {arcScan.transactions.map(tx => {
            const isOut = tx.type === "send"
            return (
              <a key={tx.hash} href={tx.explorerUrl} target="_blank" rel="noopener noreferrer"
                style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "12px 16px", borderBottom: "1px solid var(--border)",
                  textDecoration: "none",
                }}>
                <div style={{
                  width: "36px", height: "36px", borderRadius: "10px",
                  background: isOut ? "#EF444418" : "#10B98118",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "14px", color: isOut ? "var(--red)" : "var(--green)", flexShrink: 0,
                }}>
                  {isOut ? "â†‘" : "â†“"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "13px", color: "var(--text)", fontWeight: "500" }}>
                    {isOut ? `Sent to ${tx.to.slice(0,6)}...` : `Received from ${tx.from.slice(0,6)}...`}
                  </p>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-dim)", marginTop: "2px" }}>
                    {tx.hash.slice(0,8)}...
                  </p>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: "600",
                              color: isOut ? "var(--red)" : "var(--green)" }}>
                    {isOut ? "âˆ’" : "+"}{(Number(tx.amountRaw) / 1e6).toFixed(2)}
                  </p>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "var(--cyan)" }}>
                    â†— Scan
                  </span>
                </div>
              </a>
            )
          })}
        </div>
      </div>
    </div>
  )
}
