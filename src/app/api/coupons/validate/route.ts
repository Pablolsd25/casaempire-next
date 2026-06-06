import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateCoupon } from '@/lib/coupons'
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit'

// POST /api/coupons/validate — valida un código contra el subtotal del carrito
export async function POST(req: NextRequest) {
  try {
    const rate = await checkRateLimit('coupons', req)
    if (!rate.success) {
      return NextResponse.json(
        { valid: false, message: 'Demasiados intentos. Intenta más tarde.', discount: 0, freeShipping: false },
        { status: 429, headers: rateLimitHeaders(rate) }
      )
    }

    const { code, subtotal } = await req.json()
    const supabase = createAdminClient()
    const result = await validateCoupon(supabase, code, Number(subtotal) || 0)

    return NextResponse.json(
      {
        valid:        result.valid,
        message:      result.message,
        discount:     result.discount,
        freeShipping: result.freeShipping,
        coupon: result.coupon
          ? {
              code:  result.coupon.code,
              type:  result.coupon.type,
              value: result.coupon.value,
            }
          : undefined,
      },
      { headers: rateLimitHeaders(rate) }
    )
  } catch {
    return NextResponse.json(
      { valid: false, message: 'Error al validar el cupón.', discount: 0, freeShipping: false },
      { status: 400 },
    )
  }
}
