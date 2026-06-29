/**
 * ARCOIN â€” i18n.ts
 * Lightweight i18n â€” no external library needed.
 *
 * Uses browser localStorage to persist language choice.
 * Falls back to English for any missing key.
 *
 * Scope: Dashboard Â· ConnectScreen Â· SendScreen only.
 * Other screens remain in English (by design).
 */

import en from "../../locales/en.json"
import hi from "../../locales/hi.json"

export type Locale = "en" | "hi"

export const LOCALES: Locale[] = ["en", "hi"]
export const DEFAULT_LOCALE: Locale = "en"

const MESSAGES: Record<Locale, Record<string, string>> = { en, hi }

// â”€â”€ Read locale from localStorage (client-side only) â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function getStoredLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE
  const stored = localStorage.getItem("arcoin_locale") as Locale | null
  return stored && LOCALES.includes(stored) ? stored : DEFAULT_LOCALE
}

export function setStoredLocale(locale: Locale): void {
  if (typeof window === "undefined") return
  localStorage.setItem("arcoin_locale", locale)
}

// â”€â”€ Core translation function â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function t(
  key:    string,
  locale: Locale = DEFAULT_LOCALE,
  values?: Record<string, string | number>
): string {
  const msg = MESSAGES[locale]?.[key] ?? MESSAGES.en[key] ?? key

  // Simple variable substitution: {name} â†’ value
  if (!values) return msg
  return Object.entries(values).reduce(
    (acc, [k, v]) => acc.replace(new RegExp(`\\{${k}\\}`, "g"), String(v)),
    msg
  )
}

// â”€â”€ React hook â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import { useState, useCallback, useEffect } from "react"

export function useI18n() {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)

  // Hydrate from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    setLocaleState(getStoredLocale())
  }, [])

  const setLocale = useCallback((l: Locale) => {
    setStoredLocale(l)
    setLocaleState(l)
  }, [])

  const translate = useCallback(
    (key: string, values?: Record<string, string | number>) =>
      t(key, locale, values),
    [locale]
  )

  return { locale, setLocale, t: translate }
}
