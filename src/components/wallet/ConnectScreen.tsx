"use client"
/**
 * ARCOIN â€” wallet/ConnectScreen.tsx
 * Landing screen for unauthenticated users.
 * Dual entry: Email MPC (Privy) + Injected wallet (wagmi).
 *
 * i18n: Dashboard Â· ConnectScreen Â· SendScreen only.
 * Layout and styling unchanged.
 */

import { usePrivy }   from "@privy-io/react-auth"
import { APP }        from "@/lib/constants"
import { useI18n }    from "@/lib/i18n"

export function ConnectScreen() {
  const { login }    = usePrivy()
  const { t, locale, setLocale } = useI18n()

  return (
    <div style={{
      maxWidth: "480px", margin: "0 auto",
      minHeight: "100dvh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "40px 24px", textAlign: "center",
      background: "var(--bg)",
    }}>

      {/* Language toggle â€” top right */}
      <div style={{ position: "absolute", top: "16px", right: "16px" }}>
        <button
          onClick={() => setLocale(locale === "en" ? "hi" : "en")}
          style={{
            background:    "var(--surface)",
            border:        "1px solid var(--border)",
            borderRadius:  "8px",
            color:         "var(--text-dim)",
            fontFamily:    "var(--font-mono)",
            fontSize:      "11px",
            padding:       "5px 10px",
            cursor:        "pointer",
          }}
        >
          {locale === "en" ? "à¤¹à¤¿à¤¨à¥à¤¦à¥€" : "EN"}
        </button>
      </div>

      {/* Logo */}
      <div style={{
        width: "80px", height: "80px",
        border: "2px solid var(--cyan)", borderRadius: "22px",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "38px", background: "var(--cyan-glow)",
        marginBottom: "28px",
        animation: "logo-glow 3s ease-in-out infinite",
      }}>â—ˆ</div>

      <h1 style={{
        fontFamily: "var(--font-mono)", fontSize: "28px", fontWeight: "700",
        color: "var(--cyan)", letterSpacing: "0.04em", textTransform: "uppercase",
        marginBottom: "6px",
      }}>
        {t("connect.title")}
      </h1>

      <p style={{
        fontSize: "14px", color: "var(--text-dim)", marginBottom: "40px",
        lineHeight: 1.7, maxWidth: "280px",
      }}>
        {t("connect.tagline")}<br />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-muted)" }}>
          {t("connect.tagline_sub")}
        </span>
      </p>

      {/* Email CTA */}
      <button
        onClick={login}
        style={{
          maxWidth: "320px", width: "100%",
          background: "var(--cyan)", color: "#0A0E1A",
          fontWeight: "700", fontSize: "15px",
          border: "none", borderRadius: "var(--radius)", padding: "14px",
          cursor: "pointer", transition: "all 0.15s", fontFamily: "var(--font-sans)",
          marginBottom: "10px",
        }}
      >
        {t("connect.email_btn")}
      </button>

      {/* Divider */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%", maxWidth: "320px", margin: "4px 0" }}>
        <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-muted)", letterSpacing: "0.1em" }}>OR</span>
        <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
      </div>

      {/* Wallet CTA */}
      <button
        onClick={login}
        style={{
          maxWidth: "320px", width: "100%",
          background: "transparent", color: "var(--text-dim)",
          fontSize: "13px", border: "1px solid var(--border)",
          borderRadius: "var(--radius)", padding: "12px",
          cursor: "pointer", transition: "all 0.15s",
          fontFamily: "var(--font-sans)", marginTop: "10px",
        }}
      >
        {t("connect.wallet_btn")}
      </button>

      <p style={{
        fontSize: "11px", color: "var(--text-muted)", marginTop: "24px",
        lineHeight: 1.7, maxWidth: "300px",
      }}>
        {t("connect.wallet_note")}<br />
        {t("connect.self_custody")}
      </p>

      {/* Arc status */}
      <div style={{
        width: "100%", maxWidth: "320px", marginTop: "32px",
        display: "flex", background: "var(--surface)",
        border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden",
      }}>
        {[
          { labelKey: "connect.status_network", value: t("connect.status_live"), color: "var(--green)" },
          { labelKey: "connect.status_chain",   value: "5042002",               color: "var(--text)"  },
          { labelKey: "connect.status_gas",     value: "USDC",                  color: "var(--cyan)"  },
        ].map((s, i, arr) => (
          <div key={s.labelKey} style={{
            flex: 1, padding: "12px 8px", textAlign: "center",
            borderRight: i < arr.length - 1 ? "1px solid var(--border)" : "none",
          }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: "700", color: s.color }}>
              {s.value}
            </p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "var(--text-dim)",
                        letterSpacing: "0.08em", textTransform: "uppercase", marginTop: "2px" }}>
              {t(s.labelKey)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
