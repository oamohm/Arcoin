/**
 * ARCOIN â€” /api/ai-help/route.ts
 * Server-side Claude API proxy. ANTHROPIC_API_KEY stays server-only.
 * Rate limited to prevent abuse.
 */

import { NextRequest, NextResponse } from "next/server"

// Simple in-memory rate limiter (per IP, 20 req/hour)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now    = Date.now()
  const entry  = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 3600_000 })
    return true
  }
  if (entry.count >= 20) return false

  entry.count++
  return true
}

export async function POST(req: NextRequest) {
  // Rate limit
  const ip = req.headers.get("x-forwarded-for") ?? "unknown"
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. 1 hour à¤¬à¤¾à¤¦ try à¤•à¤°à¥‡à¤‚à¥¤" },
      { status: 429 }
    )
  }

  try {
    const { messages, system } = await req.json()

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    // Cap conversation history (last 10 messages only)
    const recentMessages = messages.slice(-10)

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-haiku-4-5-20251001",   // Fast, cost-efficient for Q&A
        max_tokens: 512,
        system:     system ?? "",
        messages:   recentMessages,
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      console.error("Claude API error:", err)
      return NextResponse.json(
        { content: "AI temporarily unavailableà¥¤ Docs à¤¦à¥‡à¤–à¥‡à¤‚: docs.arc.io" },
        { status: 200 }   // Return 200 so UI doesn't break
      )
    }

    const data = await response.json()
    const content = data.content?.[0]?.text ?? "Response à¤¨à¤¹à¥€à¤‚ à¤®à¤¿à¤²à¥€à¥¤"

    return NextResponse.json({ content })

  } catch (err) {
    console.error("AI help route error:", err)
    return NextResponse.json(
      { content: "Something went wrongà¥¤ Please retryà¥¤" },
      { status: 200 }
    )
  }
}
