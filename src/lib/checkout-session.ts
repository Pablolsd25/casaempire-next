/** Última orden reciente en sessionStorage (invitados sin login) */

export const LAST_ORDER_KEY = 'empire_last_order'

export type LastOrderSession = {
  id: string
  email: string
  at: number
}

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

export function saveLastOrder(id: string, email: string): void {
  if (typeof window === 'undefined') return
  try {
    const payload: LastOrderSession = {
      id,
      email: email.trim().toLowerCase(),
      at: Date.now(),
    }
    sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(payload))
  } catch {
    /* ignore quota / private mode */
  }
}

export function readLastOrder(): LastOrderSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(LAST_ORDER_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as LastOrderSession
    if (!data?.id || Date.now() - data.at > MAX_AGE_MS) return null
    return data
  } catch {
    return null
  }
}
