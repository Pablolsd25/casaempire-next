import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import CouponManager from './CouponManager'
import type { Coupon } from '@/types'

export const metadata = { title: 'Cupones | Admin' }

export default async function AdminCupones() {
  const auth = await createClient()
  await auth.auth.getUser()

  const supabase = createAdminClient()
  const { data: coupons } = await supabase
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-white font-display font-bold text-3xl uppercase tracking-wide">Cupones</h1>
        <p className="text-zinc-500 text-sm mt-1">Descuentos por código para tus clientes</p>
      </div>
      <CouponManager initial={(coupons ?? []) as Coupon[]} />
    </div>
  )
}
