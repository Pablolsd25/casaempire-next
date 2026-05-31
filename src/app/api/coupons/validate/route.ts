import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateCoupon } from '@/lib/coupons'

// POST /api/coupons/validate — valida un código contra el subtotal del carrito
export async function POST(req: NextRequest) {
  try {
    const { code, subtotal } = await req.json()
    const supabase = createAdminClient()
    const result = await validateCoupon(supabase, code, Number(subtotal) || 0)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json(
      { valid: false, message: 'Error al validar el cupón.', discount: 0, freeShipping: false },
      { status: 400 },
    )
  }
}
