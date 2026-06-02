import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkAdminAccess } from '@/lib/admin-auth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await checkAdminAccess()
  if (denied) return denied

  const { id } = await params
  const { is_approved } = await req.json() as { is_approved: boolean }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('reviews')
    .update({ is_approved })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
