import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAccess } from '@/lib/admin-auth'
import { isEmailConfigured, sendTestEmail } from '@/lib/email/send'
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit'

/** POST /api/admin/test-email — envía correo de prueba (SMTP o Brevo) */
export async function POST(req: NextRequest) {
  const denied = await checkAdminAccess()
  if (denied) return denied

  const rate = await checkRateLimit('testEmail', req)
  if (!rate.success) {
    return NextResponse.json(
      { error: 'Demasiados correos de prueba. Intenta más tarde.' },
      { status: 429, headers: rateLimitHeaders(rate) }
    )
  }

  if (!isEmailConfigured()) {
    return NextResponse.json(
      {
        error:
          'Correo no configurado. Crea API key en resend.com y define RESEND_API_KEY en .env.',
      },
      { status: 500 }
    )
  }

  let body: { email?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const email = body.email?.trim().toLowerCase()
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Correo inválido.' }, { status: 400 })
  }

  try {
    const result = await sendTestEmail(email)
    return NextResponse.json(
      {
        ok: true,
        messageId: result.messageId,
        fromEmail: result.fromEmail,
        provider: result.provider,
        senderVerified: result.senderVerified,
        hint: result.hint,
      },
      { headers: rateLimitHeaders(rate) }
    )
  } catch (err) {
    console.error('[test-email]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al enviar' },
      { status: 502 }
    )
  }
}
