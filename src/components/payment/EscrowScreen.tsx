"use client"
/**
 * ARCOIN â€” EscrowScreen.tsx
 * Non-custodial P2P/B2B escrow interface.
 *
 * Flows:
 *   Create â†’ lock funds â†’ recipient delivers â†’ sender releases
 *   Dispute â†’ arbiter resolves â†’ split or full award
 *   Timeout â†’ sender refunds
 */

import { useState, useEffect }  from "react"
import { useEscrow }             from "@/hooks/useEscrow"
import { useArcBalance }         from "@/hooks/useArcBalance"
import { TxStatusBar }           from "@/components/ui/TxStatusBar"
import { useToast }              from "@/components/ui/Toast"
import { isValidUSDCAmount }     from "@/lib/usdc"
import { EXPLORER }              from "@/lib/constants"
import type { EscrowData }       from "@/hooks/useEscrow"

type EscrowView = "list" | "create"

// â”€â”€ STATUS COLORS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const STATUS_CONFIG = {
  Active:   { color: "var(--cyan)",  bg: "var(--cyan-glow)",    icon: "âŸ³" },
  Released: { color: "var(--green)", bg: "#10B98118",            icon: "âœ“" },
  Refunded: { color: "var(--text-dim)", bg: "var(--border)",    icon: "â†©" },
  Disputed: { color: "var(--amber)", bg: "#F59E0B18",            icon: "âš " },
  Resolved: { color: "var(--green)", bg: "#10B98118",            icon: "âš–" },
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function EscrowScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  const escrow  = useEscrow()
  const toast   = useToast()
  const [view, setView] = useState<EscrowView>("list")

  useEffect(() => { escrow.fetchUserEscrows() }, [])

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>

      {escrow.txState.status !== "idle" && (
        <TxStatusBar txState={escrow.txState} label="Escrow operation" onClose={escrow.reset} />
      )}

      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 20,
        background: "var(--bg)", borderBottom: "1px solid var(--border)",
        padding: "14px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        backdropFilter: "blur(12px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {view !== "list"
            ? <button onClick={() => setView("list")} style={{ background: "none", border: "none", color: "var(--text-dim)", fontSize: "20px", cursor: "pointer" }}>â†</button>
            : <button onClick={() => onNavigate("dashboard")} style={{ background: "none", border: "none", color: "var(--text-dim)", fontSize: "20px", cursor: "pointer" }}>â†</button>
          }
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", letterSpacing: "0.1em", color: "var(--text)", textTransform: "uppercase", fontWeight: "600" }}>
            {view === "list" ? "Escrow" : "New Escrow"}
          </span>
        </div>
        {view === "list" && (
          <button
            onClick={() => setView("create")}
            style={{ background: "var(--cyan-glow)", border: "1px solid var(--cyan-dim)", borderRadius: "8px", color: "var(--cyan)", fontSize: "11px", padding: "6px 10px", cursor: "pointer", fontFamily: "var(--font-mono)" }}
          >
            + New
          </button>
        )}
      </div>

      {/* Contract not deployed banner */}
      {!escrow.isContractDeployed && (
        <div style={{ margin: "16px 16px 0", background: "#F59E0B18", border: "1px solid #F59E0B44", borderRadius: "var(--radius)", padding: "12px 14px" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--amber)", lineHeight: 1.5 }}>
            âš  Escrow contract deploy à¤¨à¤¹à¥€à¤‚ à¤¹à¥à¤†à¥¤<br />
            <code>npx hardhat run contracts/scripts/deploy-all.ts</code> à¤šà¤²à¤¾à¤à¤‚à¥¤
          </p>
        </div>
      )}

      {view === "list"   && <EscrowList   escrows={escrow.escrows} isLoading={escrow.isLoading} onRelease={escrow.release} onRefund={escrow.refund} onDispute={escrow.raiseDispute} toast={toast} />}
      {view === "create" && <CreateEscrow onNavigate={onNavigate} escrow={escrow} toast={toast} onSuccess={() => { setView("list"); escrow.fetchUserEscrows() }} />}
    </div>
  )
}

// â”€â”€ ESCROW LIST â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function EscrowList({
  escrows, isLoading,
  onRelease, onRefund, onDispute, toast,
}: {
  escrows:   EscrowData[]
  isLoading: boolean
  onRelease: (id: bigint) => void
  onRefund:  (id: bigint) => void
  onDispute: (id: bigint, reason: string) => void
  toast:     ReturnType<typeof useToast>
}) {
  if (isLoading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-dim)" }}>Loading escrows...</p>
      </div>
    )
  }

  if (escrows.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", textAlign: "center" }}>
        <div style={{ fontSize: "40px", marginBottom: "16px" }}>âš–</div>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--text-dim)" }}>
          à¤•à¥‹à¤ˆ active escrow à¤¨à¤¹à¥€à¤‚à¥¤<br />+ New à¤¸à¥‡ P2P deal à¤¶à¥à¤°à¥‚ à¤•à¤°à¥‡à¤‚à¥¤
        </p>
      </div>
    )
  }

  return (
    <div style={{ padding: "16px" }}>
      {escrows.map(e => {
        const cfg     = STATUS_CONFIG[e.status] ?? STATUS_CONFIG.Active
        const isActive = e.status === "Active"

        return (
          <div key={e.id.toString()} style={{
            background: "var(--surface)", border: `1px solid ${isActive ? "var(--border)" : "var(--text-muted)"}`,
            borderRadius: "var(--radius-lg)", marginBottom: "12px", overflow: "hidden",
            opacity: isActive ? 1 : 0.7,
          }}>
            {/* Header */}
            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-dim)" }}>
                    #{e.id.toString()}
                  </span>
                  <span style={{
                    background: cfg.bg, color: cfg.color,
                    borderRadius: "6px", padding: "2px 8px",
                    fontFamily: "var(--font-mono)", fontSize: "9px",
                    letterSpacing: "0.08em", textTransform: "uppercase",
                  }}>
                    {cfg.icon} {e.status}
                  </span>
                </div>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-dim)" }}>
                  â†’ {e.recipient.slice(0,6)}...{e.recipient.slice(-4)}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: "18px", fontWeight: "700", color: "var(--text)" }}>
                  {e.amountDisplay}
                </p>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: isActive && !e.isExpired ? "var(--cyan)" : "var(--text-dim)" }}>
                  {e.timeRemaining}
                </p>
              </div>
            </div>

            {/* Dispute log */}
            {e.disputeLog && (
              <div style={{ padding: "10px 16px", background: "#F59E0B08", borderBottom: "1px solid var(--border)" }}>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--amber)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "4px" }}>Dispute Resolution</p>
                <p style={{ fontSize: "12px", color: "var(--text-dim)", lineHeight: 1.5 }}>{e.disputeLog}</p>
              </div>
            )}

            {/* Actions */}
            {isActive && (
              <div style={{ padding: "12px 16px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {/* Release */}
                <button
                  onClick={() => onRelease(e.id)}
                  style={{ flex: 1, minWidth: "80px", background: "var(--cyan-glow)", border: "1px solid var(--cyan-dim)", borderRadius: "8px", color: "var(--cyan)", fontSize: "11px", padding: "8px", cursor: "pointer", fontFamily: "var(--font-mono)" }}
                >
                  âœ“ Release
                </button>

                {/* Refund (only if expired) */}
                {e.isExpired && (
                  <button
                    onClick={() => onRefund(e.id)}
                    style={{ flex: 1, minWidth: "80px", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text-dim)", fontSize: "11px", padding: "8px", cursor: "pointer", fontFamily: "var(--font-mono)" }}
                  >
                    â†© Refund
                  </button>
                )}

                {/* Dispute (only if arbiter set and not expired) */}
                {e.arbiter !== "0x0000000000000000000000000000000000000000" && !e.isExpired && (
                  <button
                    onClick={() => {
                      const reason = window.prompt("Dispute à¤•à¤¾ à¤•à¤¾à¤°à¤£ à¤¬à¤¤à¤¾à¤à¤‚:")
                      if (reason) onDispute(e.id, reason)
                    }}
                    style={{ flex: 1, minWidth: "80px", background: "#F59E0B12", border: "1px solid #F59E0B44", borderRadius: "8px", color: "var(--amber)", fontSize: "11px", padding: "8px", cursor: "pointer", fontFamily: "var(--font-mono)" }}
                  >
                    âš  Dispute
                  </button>
                )}

                {/* Scan */}
                <a
                  href={EXPLORER.addressUrl(ARCOIN_CONTRACTS.Escrow || "0x")}
                  target="_blank" rel="noopener noreferrer"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--cyan)", fontSize: "11px", padding: "8px 10px", textDecoration: "none", display: "flex", alignItems: "center" }}
                >
                  â†—
                </a>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// â”€â”€ CREATE ESCROW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CreateEscrow({ onNavigate, escrow, toast, onSuccess }: {
  onNavigate: (s: string) => void
  escrow:     ReturnType<typeof useEscrow>
  toast:      ReturnType<typeof useToast>
  onSuccess:  () => void
}) {
  const balance = useArcBalance()

  const [recipient,    setRecipient]    = useState("")
  const [amount,       setAmount]       = useState("")
  const [deadlineDays, setDeadline]     = useState("7")
  const [arbiter,      setArbiter]      = useState("")
  const [description,  setDescription]  = useState("")

  const amountValid = isValidUSDCAmount(amount)
  const recpValid   = recipient.startsWith("0x") && recipient.length === 42

  const handleCreate = async () => {
    if (!recpValid || !amountValid || !description) return

    const id = await escrow.createEscrow({
      recipient,
      amountUSDC:   amount,
      deadlineDays: Number(deadlineDays),
      arbiter:      arbiter || undefined,
      description,
    })

    if (id !== null) {
      toast.success(`Escrow #${id} created!`, escrow.txState.hash)
      onSuccess()
    }
  }

  const inputStyle = {
    width: "100%", background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: "var(--radius)", padding: "12px 14px", color: "var(--text)",
    fontFamily: "var(--font-mono)", fontSize: "13px", outline: "none",
    transition: "border-color 0.2s",
  }
  const labelStyle = {
    fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.12em",
    color: "var(--text-dim)", textTransform: "uppercase" as const,
    display: "block" as const, marginBottom: "8px",
  }

  return (
    <div style={{ padding: "24px 20px", flex: 1 }}>

      {/* Info */}
      <div style={{ background: "var(--cyan-glow)", border: "1px solid var(--cyan-dim)", borderRadius: "var(--radius)", padding: "12px 14px", marginBottom: "24px" }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--cyan)", fontWeight: "600", marginBottom: "4px" }}>Non-Custodial Escrow</p>
        <p style={{ fontSize: "12px", color: "var(--text-dim)", lineHeight: 1.5 }}>
          Funds blockchain à¤ªà¤° lock à¤¹à¥‹à¤‚à¤—à¥‡à¥¤ Sender release à¤•à¤°à¤¨à¥‡ à¤ªà¤° recipient à¤•à¥‹ à¤®à¤¿à¤²à¥‡à¤‚à¤—à¥‡ (0.2% fee)à¥¤
          Deadline à¤•à¥‡ à¤¬à¤¾à¤¦ refund possibleà¥¤
        </p>
      </div>

      <div style={{ marginBottom: "18px" }}>
        <label style={labelStyle}>Recipient Address</label>
        <input value={recipient} onChange={e => setRecipient(e.target.value.trim())} placeholder="0x..." style={{ ...inputStyle, borderColor: recipient && !recpValid ? "var(--red)" : "var(--border)" }} />
      </div>

      <div style={{ marginBottom: "18px" }}>
        <label style={labelStyle}>Amount (USDC)</label>
        <div style={{ position: "relative" }}>
          <input value={amount} onChange={e => setAmount(e.target.value)} type="number" placeholder="500.00" style={{ ...inputStyle, paddingRight: "60px", fontSize: "20px", fontWeight: "700" }} />
          <span style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-dim)" }}>USDC</span>
        </div>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-dim)", marginTop: "6px" }}>Balance: {balance.display}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "18px" }}>
        <div>
          <label style={labelStyle}>Deadline (days)</label>
          <input value={deadlineDays} onChange={e => setDeadline(e.target.value)} type="number" min="1" max="90" placeholder="7" style={{ ...inputStyle, fontSize: "18px", fontWeight: "700" }} />
        </div>
        <div>
          <label style={labelStyle}>Arbiter (optional)</label>
          <input value={arbiter} onChange={e => setArbiter(e.target.value.trim())} placeholder="0x... or blank" style={{ ...inputStyle, fontSize: "11px" }} />
        </div>
      </div>

      <div style={{ marginBottom: "24px" }}>
        <label style={labelStyle}>Deal Description (hashed on-chain)</label>
        <textarea
          value={description} onChange={e => setDescription(e.target.value)}
          placeholder="Logo design, 3 revisions, delivered by 30 June..."
          rows={3}
          style={{ ...inputStyle, resize: "none" as const, lineHeight: 1.6 }}
        />
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>
          Privacy: à¤•à¥‡à¤µà¤² hash stored on-chainà¥¤ Text local à¤°à¤¹à¤¤à¤¾ à¤¹à¥ˆà¥¤
        </p>
      </div>

      {/* Fee preview */}
      {amountValid && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "12px 14px", marginBottom: "20px" }}>
          {[
            { label: "Escrow Amount",  value: `${amount} USDC`                              },
            { label: "Release Fee",    value: `${(Number(amount) * 0.002).toFixed(4)} USDC (0.2%)`, dim: true },
            { label: "Deadline",       value: `${deadlineDays} days from now`               },
            { label: "Arbiter",        value: arbiter ? "Custom" : "None (bilateral only)"  },
          ].map(row => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-dim)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{row.label}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: row.dim ? "var(--text-dim)" : "var(--text)", fontWeight: "600" }}>{row.value}</span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleCreate}
        disabled={!recpValid || !amountValid || !description || !escrow.isContractDeployed}
        style={{
          width: "100%",
          background: recpValid && amountValid && description && escrow.isContractDeployed ? "var(--cyan)" : "var(--border)",
          color:      recpValid && amountValid && description && escrow.isContractDeployed ? "#0A0E1A" : "var(--text-dim)",
          fontWeight: "700", fontSize: "15px", border: "none",
          borderRadius: "var(--radius)", padding: "16px",
          cursor: "pointer", fontFamily: "var(--font-sans)", transition: "all 0.15s",
        }}
      >
        {!escrow.isContractDeployed ? "Contract Deploy à¤•à¤°à¥‡à¤‚ à¤ªà¤¹à¤²à¥‡" : "Lock Funds in Escrow â†’"}
      </button>
    </div>
  )
}

// Need this import for ARCOIN_CONTRACTS
import { ARCOIN_CONTRACTS } from "@/lib/constants"
