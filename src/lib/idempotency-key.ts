/** Variantes de idempotency_key (UUID con/sin guiones, como OpenPay guarda order_id). */
export function idempotencyKeyVariants(key: string): string[] {
  const raw = key.trim()
  const hex = raw.replace(/-/g, '').toLowerCase()
  const variants = new Set<string>([raw, hex])

  if (hex.length === 32) {
    variants.add(
      `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
    )
  }

  return [...variants]
}
