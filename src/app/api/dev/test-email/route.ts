import { NextRequest, NextResponse } from 'next/server'
import { getEmailDiagnostics } from '@/lib/email/diagnostics'
import { isEmailConfigured, sendTestEmail } from '@/lib/email/send'

function devOnly() {
  return process.env.NODE_ENV !== 'development'
}

/** GET — estado del correo (solo desarrollo) */
export async function GET() {
  if (devOnly()) {
    return NextResponse.json({ error: 'No disponible' }, { status: 404 })
  }
  return NextResponse.json(getEmailDiagnostics())
}

/** POST — envía correo de prueba (solo desarrollo) */
export async function POST(req: NextRequest) {
  if (devOnly()) {
    return NextResponse.json({ error: 'No disponible' }, { status: 404 })
  }

  if (!isEmailConfigured()) {
    return NextResponse.json(
      {
        error:
          'Correo no configurado. Revisa SMTP_USER y SMTP_PASS en .env.local',
        diagnostics: getEmailDiagnostics(),
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
    return NextResponse.json({
      ok: true,
      messageId: result.messageId,
      fromEmail: result.fromEmail,
      provider: result.provider,
      hint: result.hint,
      diagnostics: getEmailDiagnostics(),
    })
  } catch (err) {
    console.error('[dev/test-email]', err)
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Error al enviar',
        diagnostics: getEmailDiagnostics(),
      },
      { status: 502 }
    )
  }
}
