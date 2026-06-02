'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { readLastOrder } from '@/lib/checkout-session'

/** Si hay una compra reciente en esta sesión, lleva al detalle sin pedir correo */
export default function RecentOrderRedirect() {
  const router = useRouter()

  useEffect(() => {
    const last = readLastOrder()
    if (last?.id) {
      router.replace(`/orden/${last.id}?confirmed=1`)
    }
  }, [router])

  return null
}
