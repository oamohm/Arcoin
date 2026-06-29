"use client"
/**
 * ARCOIN â€” StreamScreen.tsx
 * Payment streaming interface. Wired to useSablier hook.
 *
 * Features:
 *   - Create linear stream (with optional cliff)
 *   - StreamSplit: CSV bulk payroll upload
 *   - Active stream cards with live progress
 *   - Withdraw + Cancel actions
 *   - Arcoin Proof download per stream
 */

import { useState, useRef, useCallback } from "react"
import { useSablier }      from "@/hooks/useSablier"
import { useArcBalance }   from "@/hooks/useArcBalance"
import { TxStatusBar }     from "@/components/ui/TxStatusBar"
import { useToast }        from "@/components/ui/Toast"
import { formatUSDC,
         calculateStreamRate,
         calculateStreamProgress,
         isValidUSDCAmount } from "@/lib/usdc"
import { EXPLORER }          from "@/lib/constants"
import type { Stream, StreamRecipient } from "@/types"

type StreamView = "list" | "create" | "bulk"

export function StreamScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  const sablier = useSablier()
  const balance = useArcBalance()
  const toast   = useToast()

  const [view,       setView]      = useState<StreamView>("list")
  const [mockStreams, setMockStreams] = useState<Stream[]>(DEMO_STREAMS)

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>

      {/* TX overlay */}
      {sablier.txState.status !== "idle" && (
        <TxStatusBar
          txState={sablier.txState}
          label="Stream operation"
          onClose={sablier.reset}
        />
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
          {view !== "list" ? (
            <button onClick={() => setView("list")} style={{
              background: "none", border: "none", color: "var(--text-dim)",
              fontSize: "20px", cursor: "pointer",
            }}>â†</button>
          ) : (
            <button onClick={() => onNavigate("dashboard")} style={{
              background: "none", border: "none", color: "var(--text-dim)",
              fontSize: "20px", cursor: "pointer",
            }}>â†</button>
          )}
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px",
                         letterSpacing: "0.1em", color: "var(--text)",
                         textTransform: "uppercase", fontWeight: "600" }}>
            {view === "list"   ? "Payment Streams"
             : view === "create" ? "New Stream"
             : "StreamSplitâ„¢"}
          </span>
        </div>
        {view === "list" && (
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setView("bulk")}
              style={{
                background: "var(--amber-dim,#F59E0B20)", border: "1px solid #F59E0B44",
                borderRadius: "8px", color: "var(--amber)", fontSize: "11px",
                padding: "6px 10px", cursor: "pointer", fontFamily: "var(--font-mono)",
              }}
            >
              ðŸ“‹ Bulk
            </button>
            <button
              onClick={() => setView("create")}
              style={{
                background: "var(--cyan-glow)", border: "1px solid var(--cyan-dim)",
                borderRadius: "8px", color: "var(--cyan)", fontSize: "11px",
                padding: "6px 10px", cursor: "pointer", fontFamily: "var(--font-mono)",
              }}
            >
              + New
            </button>
          </div>
        )}
      </div>

      {/* Views */}
      {view === "list"   && <StreamList   streams={mockStreams} sablier={sablier} toast={toast} />}
      {view === "create" && <CreateStream sablier={sablier} balance={balance} toast={toast} onSuccess={() => setView("list")} />}
      {view === "bulk"   && <StreamSplit  sablier={sablier} balance={balance} toast={toast} onSuccess={() => setView("list")} />}
    </div>
  )
}

// â”€â”€ STREAM LIST â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StreamList({ streams, sablier, toast }: {
  streams: Stream[]
  sablier: ReturnType<typeof useSablier>
  toast:   ReturnType<typeof useToast>
}) {
  const now = Math.floor(Date.now() / 1000)

  if (streams.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center", padding: "40px 24px", textAlign: "center" }}>
        <div style={{ fontSize: "40px", marginBottom: "16px" }}>âŸ³</div>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--text-dim)" }}>
          à¤•à¥‹à¤ˆ active stream à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆà¥¤<br />+ New à¤¸à¥‡ à¤¶à¥à¤°à¥‚ à¤•à¤°à¥‡à¤‚à¥¤
        </p>
      </div>
    )
  }

  return (
    <div style={{ padding: "16px" }}>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.12em",
                  color: "var(--text-dim)", textTransform: "uppercase", marginBottom: "12px" }}>
        Active Streams ({streams.filter(s => s.status === "active").length})
      </p>

      {streams.map(stream => {
        const pct        = calculateStreamProgress(stream.startTime, stream.endTime, now)
        const rateData   = calculateStreamRate(
          String(Number(stream.totalAmountRaw) / 1e6),
          (stream.endTime - stream.startTime) / 86400
        )
        const isActive   = stream.status === "active"

        return (
          <div key={stream.id.toString()} style={{
            background:   "var(--surface)",
            border:       `1px solid ${isActive ? "var(--border)" : "var(--text-muted)"}`,
            borderRadius: "var(--radius-lg)",
            marginBottom: "12px",
            overflow:     "hidden",
            opacity:      isActive ? 1 : 0.65,
          }}>
            {/* Stream header */}
            <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px",
                                 color: "var(--text)", fontWeight: "600" }}>
                    â†’ {stream.recipient.slice(0,6)}...{stream.recipient.slice(-4)}
                  </span>
                  <span style={{
                    marginLeft: "8px",
                    background: isActive ? "var(--amber-dim,#F59E0B20)" : "var(--border)",
                    color:      isActive ? "var(--amber)" : "var(--text-dim)",
                    borderRadius: "6px", padding: "2px 6px",
                    fontFamily: "var(--font-mono)", fontSize: "9px",
                    letterSpacing: "0.1em", textTransform: "uppercase",
                  }}>
                    {stream.status}
                  </span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: "14px",
                              fontWeight: "700", color: "var(--amber)" }}>
                    {formatUSDC(stream.streamedRaw, { decimals: 2, showSymbol: false })}
                  </p>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "var(--text-dim)" }}>
                    / {formatUSDC(stream.totalAmountRaw, { decimals: 2 })}
                  </p>
                </div>
              </div>
            </div>

            {/* Progress */}
            <div style={{ padding: "12px 16px 14px" }}>
              <div style={{ height: "6px", background: "var(--border)", borderRadius: "3px",
                            overflow: "hidden", marginBottom: "8px" }}>
                <div style={{
                  height: "100%", width: `${pct}%`,
                  background: "linear-gradient(90deg, var(--amber), var(--cyan))",
                  borderRadius: "3px", position: "relative", transition: "width 0.5s",
                }}>
                  {isActive && (
                    <div style={{
                      position: "absolute", right: 0, top: "50%",
                      transform: "translateY(-50%)",
                      width: "8px", height: "8px", borderRadius: "50%",
                      background: "var(--cyan)", boxShadow: "0 0 8px var(--cyan)",
                      animation: "stream-pulse 1.5s ease-in-out infinite",
                    }} />
                  )}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between",
                            fontFamily: "var(--font-mono)", fontSize: "10px",
                            color: "var(--text-dim)", marginBottom: "12px" }}>
                <span>{pct}% streamed</span>
                <span style={{ color: "var(--cyan)" }}>{rateData.perSecondDisplay} USDC/s</span>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: "8px" }}>
                {isActive && (
                  <>
                    <button
                      onClick={() => sablier.withdrawMax(stream.id)}
                      style={{
                        flex:         1,
                        background:   "var(--cyan-glow)",
                        border:       "1px solid var(--cyan-dim)",
                        borderRadius: "8px",
                        color:        "var(--cyan)",
                        fontSize:     "12px",
                        padding:      "8px",
                        cursor:       "pointer",
                        fontFamily:   "var(--font-mono)",
                      }}
                    >
                      â†“ Withdraw
                    </button>
                    {stream.cancelable && (
                      <button
                        onClick={() => sablier.cancelStream(stream.id)}
                        style={{
                          flex:         1,
                          background:   "#EF444412",
                          border:       "1px solid #EF444430",
                          borderRadius: "8px",
                          color:        "var(--red)",
                          fontSize:     "12px",
                          padding:      "8px",
                          cursor:       "pointer",
                          fontFamily:   "var(--font-mono)",
                        }}
                      >
                        âœ• Cancel
                      </button>
                    )}
                  </>
                )}
                {/* Arcoin Proof */}
                <button
                  onClick={() => toast.info("Arcoin Proof", "PDF generation Phase 2 à¤®à¥‡à¤‚ à¤† à¤°à¤¹à¤¾ à¤¹à¥ˆà¥¤")}
                  style={{
                    flex:         isActive ? 0 : 1,
                    background:   "var(--surface2)",
                    border:       "1px solid var(--border)",
                    borderRadius: "8px",
                    color:        "var(--text-dim)",
                    fontSize:     "12px",
                    padding:      "8px 12px",
                    cursor:       "pointer",
                    fontFamily:   "var(--font-mono)",
                    whiteSpace:   "nowrap",
                  }}
                >
                  â†“ Proof
                </button>

                <a
                  href={EXPLORER.txUrl("0x" + stream.id.toString(16))}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex:         0,
                    background:   "var(--surface2)",
                    border:       "1px solid var(--border)",
                    borderRadius: "8px",
                    color:        "var(--cyan)",
                    fontSize:     "12px",
                    padding:      "8px 12px",
                    textDecoration: "none",
                    fontFamily:   "var(--font-mono)",
                    display:      "flex",
                    alignItems:   "center",
                  }}
                >
                  â†—
                </a>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// â”€â”€ CREATE STREAM â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CreateStream({ sablier, balance, toast, onSuccess }: {
  sablier:   ReturnType<typeof useSablier>
  balance:   ReturnType<typeof useArcBalance>
  toast:     ReturnType<typeof useToast>
  onSuccess: () => void
}) {
  const [recipient,    setRecipient]    = useState("")
  const [amount,       setAmount]       = useState("")
  const [durationDays, setDuration]     = useState("30")
  const [cliffDays,    setCliff]        = useState("0")
  const [cancelable,   setCancelable]   = useState(true)

  const amountValid = isValidUSDCAmount(amount)
  const rateData    = amount && amountValid && Number(durationDays) > 0
    ? calculateStreamRate(amount, Number(durationDays))
    : null

  const handleCreate = async () => {
    if (!recipient || !amountValid || !durationDays) return

    const id = await sablier.createStream({
      recipient,
      totalAmount:  amount,
      durationDays: Number(durationDays),
      cliffDays:    Number(cliffDays),
      cancelable,
    })

    if (id !== null) {
      toast.success("Stream Created!", sablier.txState.hash)
      onSuccess()
    }
  }

  return (
    <div style={{ padding: "24px 20px", flex: 1 }}>

      {/* Recipient */}
      <div style={{ marginBottom: "20px" }}>
        <label style={{ fontFamily: "var(--font-mono)", fontSize: "10px",
                        letterSpacing: "0.12em", color: "var(--text-dim)",
                        textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
          Recipient Address or ArcID
        </label>
        <input
          value={recipient} onChange={e => setRecipient(e.target.value.trim())}
          placeholder="0x... or alice.arc"
          style={{
            width: "100%", background: "var(--surface)",
            border: "1px solid var(--border)", borderRadius: "var(--radius)",
            padding: "14px 16px", color: "var(--text)",
            fontFamily: "var(--font-mono)", fontSize: "13px", outline: "none",
          }}
        />
      </div>

      {/* Amount */}
      <div style={{ marginBottom: "20px" }}>
        <label style={{ fontFamily: "var(--font-mono)", fontSize: "10px",
                        letterSpacing: "0.12em", color: "var(--text-dim)",
                        textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
          Total Amount (USDC)
        </label>
        <input
          value={amount} onChange={e => setAmount(e.target.value)}
          type="number" placeholder="500.00"
          style={{
            width: "100%", background: "var(--surface)",
            border: "1px solid var(--border)", borderRadius: "var(--radius)",
            padding: "14px 16px", color: "var(--text)",
            fontFamily: "var(--font-mono)", fontSize: "20px", fontWeight: "700", outline: "none",
          }}
        />
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px",
                    color: "var(--text-dim)", marginTop: "6px" }}>
          Balance: {balance.display}
        </p>
      </div>

      {/* Duration + Cliff */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
        <div>
          <label style={{ fontFamily: "var(--font-mono)", fontSize: "10px",
                          letterSpacing: "0.12em", color: "var(--text-dim)",
                          textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
            Duration (days)
          </label>
          <input
            value={durationDays} onChange={e => setDuration(e.target.value)}
            type="number" placeholder="30" min="1"
            style={{
              width: "100%", background: "var(--surface)",
              border: "1px solid var(--border)", borderRadius: "var(--radius)",
              padding: "12px 14px", color: "var(--text)",
              fontFamily: "var(--font-mono)", fontSize: "16px", fontWeight: "700", outline: "none",
            }}
          />
        </div>
        <div>
          <label style={{ fontFamily: "var(--font-mono)", fontSize: "10px",
                          letterSpacing: "0.12em", color: "var(--text-dim)",
                          textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
            Cliff (days)
          </label>
          <input
            value={cliffDays} onChange={e => setCliff(e.target.value)}
            type="number" placeholder="0" min="0"
            style={{
              width: "100%", background: "var(--surface)",
              border: "1px solid var(--border)", borderRadius: "var(--radius)",
              padding: "12px 14px", color: "var(--text)",
              fontFamily: "var(--font-mono)", fontSize: "16px", fontWeight: "700", outline: "none",
            }}
          />
        </div>
      </div>

      {/* Rate preview */}
      {rateData && (
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "var(--radius)", padding: "14px", marginBottom: "20px",
        }}>
          {[
            { label: "Total",    value: `${amount} USDC` },
            { label: "Duration", value: `${durationDays} days` },
            { label: "Rate",     value: `${rateData.perSecondDisplay} USDC/second`, color: "var(--cyan)" },
            { label: "Cliff",    value: Number(cliffDays) > 0 ? `${cliffDays} days` : "None" },
            { label: "Cancelable", value: cancelable ? "Yes" : "No" },
          ].map(row => (
            <div key={row.label} style={{
              display: "flex", justifyContent: "space-between",
              padding: "5px 0", borderBottom: "1px solid var(--border)",
            }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px",
                             color: "var(--text-dim)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {row.label}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px",
                             color: row.color ?? "var(--text)", fontWeight: "600" }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Cancelable toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                    marginBottom: "24px" }}>
        <div>
          <p style={{ fontSize: "13px", color: "var(--text)", fontWeight: "500" }}>Cancelable</p>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-dim)" }}>
            Stream à¤•à¥‹ à¤¬à¤¾à¤¦ à¤®à¥‡à¤‚ cancel à¤•à¤° à¤¸à¤•à¤¤à¥‡ à¤¹à¥ˆà¤‚
          </p>
        </div>
        <button
          onClick={() => setCancelable(c => !c)}
          style={{
            width: "44px", height: "24px",
            background:   cancelable ? "var(--cyan)" : "var(--border)",
            borderRadius: "12px", border: "none", cursor: "pointer",
            position:     "relative", transition: "background 0.2s",
          }}
        >
          <div style={{
            position:   "absolute",
            top:        "2px",
            left:       cancelable ? "22px" : "2px",
            width:      "20px",
            height:     "20px",
            borderRadius: "50%",
            background: "white",
            transition: "left 0.2s",
          }} />
        </button>
      </div>

      <button
        onClick={handleCreate}
        disabled={!recipient || !amountValid || !durationDays}
        style={{
          width:         "100%",
          background:    recipient && amountValid ? "var(--cyan)" : "var(--border)",
          color:         recipient && amountValid ? "#0A0E1A" : "var(--text-dim)",
          fontWeight:    "700", fontSize: "15px",
          border:        "none", borderRadius: "var(--radius)",
          padding:       "16px", cursor: recipient && amountValid ? "pointer" : "not-allowed",
          fontFamily:    "var(--font-sans)", transition: "all 0.15s",
        }}
      >
        Create Stream â†’
      </button>
    </div>
  )
}

// â”€â”€ STREAMSPLIT â€” BULK PAYROLL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StreamSplit({ sablier, balance, toast, onSuccess }: {
  sablier:   ReturnType<typeof useSablier>
  balance:   ReturnType<typeof useArcBalance>
  toast:     ReturnType<typeof useToast>
  onSuccess: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [recipients, setRecipients] = useState<StreamRecipient[]>([])
  const [parsing, setParsing]       = useState(false)
  const [defaultDays, setDefaultDays] = useState("30")

  const totalUSDC = recipients.reduce((sum, r) => sum + Number(r.amountUSDC), 0)

  const handleCSV = async (file: File) => {
    setParsing(true)
    const Papa = (await import("papaparse")).default
    Papa.parse(file, {
      header:    true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed: StreamRecipient[] = (results.data as Record<string, string>[])
          .map(row => ({
            address:      (row.address ?? row.Address ?? "").trim() as `0x${string}`,
            name:         row.name ?? row.Name ?? "",
            amountUSDC:   (row.amount ?? row.Amount ?? "0").trim(),
            durationDays: Number(row.days ?? row.Days ?? defaultDays),
          }))
          .filter(r => r.address.startsWith("0x") && isValidUSDCAmount(r.amountUSDC))

        setRecipients(parsed)
        setParsing(false)
        toast.info(`${parsed.length} recipients loaded`, `Total: ${parsed.reduce((s,r)=>s+Number(r.amountUSDC),0).toFixed(2)} USDC`)
      },
      error: () => {
        setParsing(false)
        toast.error("CSV Error", "File format check à¤•à¤°à¥‡à¤‚à¥¤")
      }
    })
  }

  const handleBulkCreate = async () => {
    if (recipients.length === 0) return
    await sablier.createBulk(recipients)
    toast.success(`${recipients.length} streams created!`)
    onSuccess()
  }

  return (
    <div style={{ padding: "24px 20px", flex: 1 }}>

      {/* Info banner */}
      <div style={{
        background:   "var(--cyan-glow)", border: "1px solid var(--cyan-dim)",
        borderRadius: "var(--radius)", padding: "14px", marginBottom: "24px",
      }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--cyan)",
                    fontWeight: "600", marginBottom: "4px" }}>
          StreamSplitâ„¢ â€” Bulk Payroll
        </p>
        <p style={{ fontSize: "12px", color: "var(--text-dim)", lineHeight: 1.5 }}>
          CSV upload à¤•à¤°à¥‡à¤‚ â†’ à¤à¤• à¤¸à¤¾à¤¥ à¤•à¤ˆ streams create à¤•à¤°à¥‡à¤‚à¥¤<br />
          CSV format: address, amount, days (headers required)
        </p>
      </div>

      {/* CSV template download */}
      <button
        onClick={() => {
          const csv = "address,name,amount,days\n0xAbCd...,Alice,500,30\n0xEfGh...,Bob,250,30"
          const blob = new Blob([csv], { type: "text/csv" })
          const url  = URL.createObjectURL(blob)
          const a    = document.createElement("a")
          a.href = url; a.download = "arcoin-streamsplit-template.csv"; a.click()
          URL.revokeObjectURL(url)
        }}
        style={{
          width: "100%", background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "var(--radius)", padding: "12px", color: "var(--text-dim)",
          cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: "12px",
          marginBottom: "16px",
        }}
      >
        â†“ CSV Template Download à¤•à¤°à¥‡à¤‚
      </button>

      {/* Default duration */}
      <div style={{ marginBottom: "16px" }}>
        <label style={{ fontFamily: "var(--font-mono)", fontSize: "10px",
                        letterSpacing: "0.12em", color: "var(--text-dim)",
                        textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
          Default Duration (if not in CSV)
        </label>
        <input
          value={defaultDays} onChange={e => setDefaultDays(e.target.value)}
          type="number" min="1"
          style={{
            width: "100%", background: "var(--surface)",
            border: "1px solid var(--border)", borderRadius: "var(--radius)",
            padding: "12px 16px", color: "var(--text)",
            fontFamily: "var(--font-mono)", fontSize: "16px", outline: "none",
          }}
        />
      </div>

      {/* File upload */}
      <input
        ref={fileRef} type="file" accept=".csv"
        onChange={e => { if (e.target.files?.[0]) handleCSV(e.target.files[0]) }}
        style={{ display: "none" }}
      />
      <button
        onClick={() => fileRef.current?.click()}
        style={{
          width:         "100%",
          background:    "var(--surface2)",
          border:        "2px dashed var(--border)",
          borderRadius:  "var(--radius-lg)",
          padding:       "24px",
          color:         "var(--text-dim)",
          cursor:        "pointer",
          fontFamily:    "var(--font-mono)",
          fontSize:      "13px",
          marginBottom:  "20px",
          transition:    "all 0.2s",
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = "var(--cyan-dim)"}
        onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
      >
        {parsing ? "Parsing CSV..." : "ðŸ“‹ CSV File Select à¤•à¤°à¥‡à¤‚"}
      </button>

      {/* Preview table */}
      {recipients.length > 0 && (
        <div style={{
          background:   "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "var(--radius)", marginBottom: "20px", overflow: "hidden",
        }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)",
                        display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px",
                           letterSpacing: "0.1em", color: "var(--text-dim)", textTransform: "uppercase" }}>
              {recipients.length} Recipients
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--amber)", fontWeight: "600" }}>
              Total: {totalUSDC.toFixed(2)} USDC
            </span>
          </div>
          {recipients.slice(0, 5).map((r, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 16px", borderBottom: "1px solid var(--border)",
              fontFamily: "var(--font-mono)", fontSize: "11px",
            }}>
              <span style={{ color: "var(--text-dim)" }}>
                {r.name || `${r.address.slice(0,6)}...`}
              </span>
              <span style={{ color: "var(--cyan)" }}>{r.amountUSDC} USDC Â· {r.durationDays}d</span>
            </div>
          ))}
          {recipients.length > 5 && (
            <div style={{ padding: "10px 16px", fontFamily: "var(--font-mono)",
                          fontSize: "11px", color: "var(--text-muted)", textAlign: "center" }}>
              +{recipients.length - 5} more recipients
            </div>
          )}
        </div>
      )}

      <button
        onClick={handleBulkCreate}
        disabled={recipients.length === 0}
        style={{
          width:         "100%",
          background:    recipients.length > 0 ? "var(--cyan)" : "var(--border)",
          color:         recipients.length > 0 ? "#0A0E1A" : "var(--text-dim)",
          fontWeight:    "700", fontSize: "15px",
          border:        "none", borderRadius: "var(--radius)",
          padding:       "16px", cursor: recipients.length > 0 ? "pointer" : "not-allowed",
          fontFamily:    "var(--font-sans)",
        }}
      >
        {recipients.length > 0
          ? `Create ${recipients.length} Streams â†’`
          : "CSV Upload à¤•à¤°à¥‡à¤‚ à¤ªà¤¹à¤²à¥‡"}
      </button>
    </div>
  )
}

// â”€â”€ DEMO DATA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const now = Math.floor(Date.now() / 1000)
const DEMO_STREAMS: Stream[] = [
  {
    id:              1n,
    sender:          "0xAbCd000000000000000000000000000000000001" as `0x${string}`,
    recipient:       "0xAbCd000000000000000000000000000000000002" as `0x${string}`,
    totalAmountRaw:  12_000000n,
    streamedRaw:     8_200000n,
    startTime:       now - (3 * 86400),
    endTime:         now + (4 * 86400),
    cancelable:      true,
    status:          "active",
    tokenSymbol:     "USDC",
    contractAddress: "" as `0x${string}`,
  },
  {
    id:              2n,
    sender:          "0xAbCd000000000000000000000000000000000001" as `0x${string}`,
    recipient:       "0xAbCd000000000000000000000000000000000003" as `0x${string}`,
    totalAmountRaw:  10_000000n,
    streamedRaw:     3_400000n,
    startTime:       now - (86400),
    endTime:         now + (2 * 86400),
    cancelable:      true,
    status:          "active",
    tokenSymbol:     "USDC",
    contractAddress: "" as `0x${string}`,
  },
]
