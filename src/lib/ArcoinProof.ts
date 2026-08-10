/**
 * ARCOIN â€” ArcoinProof.ts
 * Generates tamper-evident, verifiable PDF receipts for every transaction.
 *
 * CONFIDENTIAL MODE COMPLIANT:
 *   - 100% client-side. jsPDF runs in browser.
 *   - No data sent to any server.
 *   - PDF contains on-chain verification QR code.
 *
 * ARCOIN PROOF STRUCTURE:
 *   Header:    Arcoin branding + "PAYMENT PROOF" title
 *   Body:      Transaction details (hash, amount, parties, timestamp)
 *   QR Code:   Links directly to Blockscout explorer
 *   Footer:    Verification instructions + disclaimer
 *   Signature: HMAC of txHash+timestamp (integrity marker)
 */

import { formatUSDC, formatUSDCProof } from "@/lib/usdc"
import { EXPLORER, APP }               from "@/lib/constants"
import type { ArcoinProof, ArcTransaction, Stream } from "@/types"

// â”€â”€ PROOF ID GENERATOR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function generateProofId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  return "AP-" + Array.from(bytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()
}

// â”€â”€ HMAC SIGNATURE (integrity, not security) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function signProof(txHash: string, timestamp: number): Promise<string> {
  const key     = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode("arcoin-proof-v1"),
    { name: "HMAC", hash: "SHA-256" },
    false, ["sign"]
  )
  const data = new TextEncoder().encode(`${txHash}:${timestamp}`)
  const sig  = await crypto.subtle.sign("HMAC", key, data)
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16)
    .toUpperCase()
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// MAIN: Generate PDF from a transaction
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function generateTransactionProof(
  tx: ArcTransaction,
  recipientName?: string,   // ArcID if known
): Promise<void> {
  // Dynamic import â€” jsPDF is large, load only when needed
  const { jsPDF }  = await import("jspdf")
  const QRCode     = await import("qrcode")

  const proofId    = generateProofId()
  const timestamp  = Date.now()
  const signature  = await signProof(tx.hash, Math.floor(timestamp / 1000))
  const explorerUrl = EXPLORER.txUrl(tx.hash)

  // Generate QR code as data URL
  const qrDataUrl = await QRCode.toDataURL(explorerUrl, {
    width:           180,
    margin:          1,
    color: { dark: "#0A0E1A", light: "#FFFFFF" },
  })

  // â”€â”€ PDF SETUP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const doc    = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const W      = doc.internal.pageSize.getWidth()
  const margin = 20
  let   y      = margin

  // â”€â”€ HEADER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Dark header bar
  doc.setFillColor(10, 14, 26)          // var(--bg) #0A0E1A
  doc.rect(0, 0, W, 40, "F")

  // Logo text
  doc.setTextColor(34, 211, 238)        // var(--cyan) #22D3EE
  doc.setFontSize(20)
  doc.setFont("helvetica", "bold")
  doc.text("ARCOIN", margin, 22)

  // Tagline
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(100, 116, 139)       // var(--text-dim)
  doc.text("Arc Network DeFi Operating System", margin, 30)

  // Proof type label (right-aligned)
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(34, 211, 238)
  doc.text("PAYMENT PROOF", W - margin, 22, { align: "right" })

  doc.setFontSize(7)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(100, 116, 139)
  doc.text(`Proof ID: ${proofId}`, W - margin, 30, { align: "right" })

  y = 50

  // â”€â”€ AMOUNT (HERO) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  doc.setFontSize(32)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(15, 22, 41)          // near-black on white
  const amountDisplay = formatUSDCProof(tx.amountRaw)
  doc.text(`${amountDisplay} USDC`, W / 2, y, { align: "center" })
  y += 6

  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(100, 116, 139)
  doc.text("Amount Transferred", W / 2, y, { align: "center" })
  y += 14

  // Divider
  doc.setDrawColor(30, 45, 69)          // var(--border)
  doc.line(margin, y, W - margin, y)
  y += 10

  // â”€â”€ TRANSACTION DETAILS TABLE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const labelColor  = [100, 116, 139] as [number, number, number]
  const valueColor  = [15, 22, 41]    as [number, number, number]
  const rowH        = 9
  const labelX      = margin
  const valueX      = W - margin

  const rows: { label: string; value: string; highlight?: boolean }[] = [
    {
      label: "Transaction Hash",
      value: tx.hash,
    },
    {
      label: "Block Number",
      value: tx.blockNumber.toString(),
    },
    {
      label: "Timestamp",
      value: new Date(tx.timestamp * 1000).toUTCString(),
    },
    {
      label: "From",
      value: tx.from,
    },
    {
      label: "To",
      value: recipientName ? `${recipientName} (${tx.to})` : tx.to,
    },
    {
      label: "Network",
      value: "Arc Testnet (Chain ID: 5042002)",
    },
    {
      label: "Token",
      value: "USDC (6 decimals)",
    },
    {
      label: "Status",
      value: tx.status.toUpperCase(),
      highlight: true,
    },
    {
      label: "Type",
      value: tx.type.replace(/_/g, " ").toUpperCase(),
    },
  ]

  rows.forEach((row, i) => {
    // Alternate row background
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252)
      doc.rect(margin - 4, y - 6, W - margin * 2 + 8, rowH, "F")
    }

    doc.setFontSize(7.5)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(...labelColor)
    doc.text(row.label, labelX, y)

    doc.setFont("helvetica", row.highlight ? "bold" : "normal")
    doc.setTextColor(
      row.highlight ? 16  : valueColor[0],
      row.highlight ? 185 : valueColor[1],
      row.highlight ? 129 : valueColor[2],
    )

    // Wrap long values (tx hash)
    const maxWidth = (W - margin * 2) * 0.6
    const lines    = doc.splitTextToSize(row.value, maxWidth)
    doc.text(lines, valueX, y, { align: "right" })

    y += rowH * (lines.length > 1 ? lines.length : 1)
  })

  y += 8

  // â”€â”€ QR CODE + VERIFICATION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  doc.setDrawColor(30, 45, 69)
  doc.line(margin, y, W - margin, y)
  y += 10

  doc.setFontSize(9)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(10, 14, 26)
  doc.text("On-Chain Verification", margin, y)
  y += 7

  // QR code image
  doc.addImage(qrDataUrl, "PNG", margin, y, 35, 35)

  // Instructions next to QR
  doc.setFontSize(7.5)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(100, 116, 139)
  const instrX = margin + 40
  const instrs = [
    "QR code scan à¤•à¤°à¥‡à¤‚ à¤¯à¤¾ à¤¨à¥€à¤šà¥‡ à¤•à¤¾ link à¤–à¥‹à¤²à¥‡à¤‚",
    "Blockscout à¤ªà¤° transaction verify à¤•à¤°à¥‡à¤‚",
    "Transaction hash + amount match à¤•à¤°à¥‡à¤‚",
    "à¤¯à¤¹ proof on-chain data à¤¸à¥‡ generated à¤¹à¥ˆ",
  ]
  instrs.forEach((line, i) => {
    doc.text(`${i + 1}. ${line}`, instrX, y + 7 + (i * 8))
  })

  y += 42

  // Explorer URL (clickable)
  doc.setFontSize(7)
  doc.setTextColor(34, 211, 238)
  doc.textWithLink(explorerUrl, margin, y, { url: explorerUrl })
  y += 10

  // â”€â”€ INTEGRITY SIGNATURE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  doc.setFillColor(240, 253, 250)       // very light green
  doc.setDrawColor(16, 185, 129)        // var(--green)
  doc.roundedRect(margin - 4, y, W - margin * 2 + 8, 14, 2, 2, "FD")

  doc.setFontSize(7)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(16, 185, 129)
  doc.text("ARCOIN INTEGRITY SIGNATURE", margin, y + 5)

  doc.setFont("courier", "normal")
  doc.setFontSize(7)
  doc.setTextColor(30, 45, 69)
  doc.text(`SIG: ${signature}  |  GENERATED: ${new Date(timestamp).toISOString()}  |  PROOF: ${proofId}`, margin, y + 11)
  y += 22

  // â”€â”€ FOOTER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const pageH = doc.internal.pageSize.getHeight()
  doc.setFillColor(10, 14, 26)
  doc.rect(0, pageH - 20, W, 20, "F")

  doc.setFontSize(6.5)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(100, 116, 139)
  doc.text(
    "à¤¯à¤¹ document Arcoin à¤¦à¥à¤µà¤¾à¤°à¤¾ client-side generate à¤¹à¥à¤† à¤¹à¥ˆà¥¤ On-chain data authoritative à¤¹à¥ˆà¥¤",
    W / 2, pageH - 12, { align: "center" }
  )
  doc.text(
    `${APP.name} Â· ${APP.url} Â· Arc Testnet Â· Non-custodial`,
    W / 2, pageH - 7, { align: "center" }
  )

  // â”€â”€ SAVE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const filename = `arcoin-proof-${proofId}-${tx.hash.slice(0, 8)}.pdf`
  doc.save(filename)
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// STREAM PROOF â€” for Sablier streams
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function generateStreamProof(stream: Stream): Promise<void> {
  const { jsPDF } = await import("jspdf")
  const QRCode    = await import("qrcode")

  const proofId   = generateProofId()
  const timestamp = Date.now()
  const signature = await signProof(stream.id.toString(), Math.floor(timestamp / 1000))
  const explorerUrl = EXPLORER.addressUrl(stream.contractAddress)

  const qrDataUrl = await QRCode.toDataURL(explorerUrl, { width: 180, margin: 1 })

  const doc    = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const W      = doc.internal.pageSize.getWidth()
  const margin = 20

  // Header
  doc.setFillColor(10, 14, 26)
  doc.rect(0, 0, W, 40, "F")
  doc.setFontSize(20); doc.setFont("helvetica", "bold")
  doc.setTextColor(34, 211, 238)
  doc.text("ARCOIN", margin, 22)
  doc.setFontSize(10)
  doc.text("STREAM PROOF", W - margin, 22, { align: "right" })
  doc.setFontSize(7); doc.setFont("helvetica", "normal")
  doc.setTextColor(100, 116, 139)
  doc.text(`Proof ID: ${proofId}`, W - margin, 30, { align: "right" })

  let y = 50

  // Stream ID hero
  doc.setFontSize(28); doc.setFont("helvetica", "bold")
  doc.setTextColor(15, 22, 41)
  doc.text(`Stream #${stream.id.toString()}`, W / 2, y, { align: "center" })
  y += 6
  doc.setFontSize(9); doc.setFont("helvetica", "normal")
  doc.setTextColor(100, 116, 139)
  doc.text("Sablier V2 LockupLinear Â· Arc Testnet", W / 2, y, { align: "center" })
  y += 14

  doc.setDrawColor(30, 45, 69); doc.line(margin, y, W - margin, y); y += 10

  // Stream details
  const rows = [
    { label: "Sender",          value: stream.sender              },
    { label: "Recipient",       value: stream.recipient           },
    { label: "Total Amount",    value: formatUSDC(stream.totalAmountRaw, { decimals: 6 }) },
    { label: "Streamed So Far", value: formatUSDC(stream.streamedRaw, { decimals: 6 }) },
    { label: "Start Time",      value: new Date(stream.startTime * 1000).toUTCString() },
    { label: "End Time",        value: new Date(stream.endTime * 1000).toUTCString()   },
    { label: "Status",          value: stream.status.toUpperCase(), highlight: true    },
    { label: "Cancelable",      value: stream.cancelable ? "Yes" : "No"               },
  ]

  rows.forEach((row, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252)
      doc.rect(margin - 4, y - 6, W - margin * 2 + 8, 9, "F")
    }
    doc.setFontSize(7.5); doc.setFont("helvetica", "normal")
    doc.setTextColor(100, 116, 139)
    doc.text(row.label, margin, y)
    doc.setFont("helvetica", row.highlight ? "bold" : "normal")
    doc.setTextColor(
      row.highlight ? 16  : 15,
      row.highlight ? 185 : 22,
      row.highlight ? 129 : 41,
    )
    const lines = doc.splitTextToSize(row.value, (W - margin * 2) * 0.55)
    doc.text(lines, W - margin, y, { align: "right" })
    y += 9 * (lines.length > 1 ? lines.length : 1)
  })

  y += 8
  doc.addImage(qrDataUrl, "PNG", margin, y, 35, 35)
  doc.setFontSize(7); doc.setFont("helvetica", "normal")
  doc.setTextColor(34, 211, 238)
  doc.textWithLink(explorerUrl, margin + 40, y + 10, { url: explorerUrl })

  // Signature
  y += 42
  doc.setFillColor(240, 253, 250); doc.setDrawColor(16, 185, 129)
  doc.roundedRect(margin - 4, y, W - margin * 2 + 8, 14, 2, 2, "FD")
  doc.setFontSize(7); doc.setFont("helvetica", "bold"); doc.setTextColor(16, 185, 129)
  doc.text("ARCOIN INTEGRITY SIGNATURE", margin, y + 5)
  doc.setFont("courier", "normal"); doc.setTextColor(30, 45, 69)
  doc.text(`SIG: ${signature}  |  ${new Date(timestamp).toISOString()}  |  PROOF: ${proofId}`, margin, y + 11)

  // Footer
  const pageH = doc.internal.pageSize.getHeight()
  doc.setFillColor(10, 14, 26); doc.rect(0, pageH - 20, W, 20, "F")
  doc.setFontSize(6.5); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 116, 139)
  doc.text(`${APP.name} Â· Stream Proof Â· ${APP.url}`, W / 2, pageH - 7, { align: "center" })

  const filename = `arcoin-stream-proof-${proofId}-#${stream.id}.pdf`
  doc.save(filename)
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// CSV EXPORT â€” full audit history
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function generateAuditCSV(transactions: ArcTransaction[]): void {
  const headers = [
    "Proof ID", "Hash", "Type", "From", "To",
    "Amount (USDC)", "Block", "Timestamp (UTC)", "Status", "Explorer"
  ]

  const rows = transactions.map(tx => [
    generateProofId(),
    tx.hash,
    tx.type,
    tx.from,
    tx.to,
    formatUSDCProof(tx.amountRaw),
    tx.blockNumber.toString(),
    new Date(tx.timestamp * 1000).toISOString(),
    tx.status,
    EXPLORER.txUrl(tx.hash),
  ])

  const csvContent = [
    headers.join(","),
    ...rows.map(r => r.map(v => `"${v}"`).join(",")),
  ].join("\n")

  const blob     = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url      = URL.createObjectURL(blob)
  const link     = document.createElement("a")
  const filename = `arcoin-audit-${new Date().toISOString().split("T")[0]}.csv`
  link.href      = url
  link.download  = filename
  link.click()
  URL.revokeObjectURL(url)
}
