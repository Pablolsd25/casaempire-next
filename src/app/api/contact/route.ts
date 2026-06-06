import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { escapeHtml } from '@/lib/email/templates'
import { isEmailConfigured, sendEmail } from '@/lib/email/send'
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit'

const MAX_NAME = 100
const MAX_EMAIL = 254
const MAX_WHATSAPP = 30
const MAX_MESSAGE = 5000

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function trimField(value: unknown, max: number): string | null {
  if (value == null) return null
  const s = String(value).trim()
  if (!s) return null
  return s.slice(0, max)
}

export async function POST(req: NextRequest) {
  try {
    const rate = await checkRateLimit('contact', req)
    if (!rate.success) {
      return NextResponse.json(
        { error: 'Demasiados mensajes. Intenta más tarde.' },
        { status: 429, headers: rateLimitHeaders(rate) }
      )
    }

    const { nombre, apellido, email, whatsapp, mensaje } = await req.json()

    const emailTrimmed = trimField(email, MAX_EMAIL)
    const mensajeTrimmed = trimField(mensaje, MAX_MESSAGE)

    if (!emailTrimmed || !mensajeTrimmed) {
      return NextResponse.json({ error: 'Campos requeridos faltantes' }, { status: 400 })
    }

    if (!EMAIL_RE.test(emailTrimmed)) {
      return NextResponse.json({ error: 'Correo electrónico inválido.' }, { status: 400 })
    }

    const nombreSafe = trimField(nombre, MAX_NAME)
    const apellidoSafe = trimField(apellido, MAX_NAME)
    const whatsappSafe = trimField(whatsapp, MAX_WHATSAPP)

    const supabase = createAdminClient()
    await supabase.from('contact_submissions').insert({
      nombre:   nombreSafe,
      apellido: apellidoSafe,
      email:    emailTrimmed,
      whatsapp: whatsappSafe,
      mensaje:  mensajeTrimmed,
    })

    if (isEmailConfigured()) {
      try {
        const displayName = [nombreSafe, apellidoSafe].filter(Boolean).join(' ')
        await sendEmail({
          to:      'contacto@casaempire.net',
          replyTo: emailTrimmed,
          subject: `Nuevo mensaje de contacto — ${displayName || emailTrimmed}`,
          html: `
          <div style="font-family:sans-serif;background:#000;color:#fff;padding:32px;max-width:560px">
            <h2 style="color:#E8177A;font-size:24px;margin-bottom:16px;">Nuevo mensaje de contacto</h2>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:8px 0;color:#aaa;width:140px">Nombre</td><td style="color:#fff">${escapeHtml(displayName || '—')}</td></tr>
              <tr><td style="padding:8px 0;color:#aaa">Email</td><td style="color:#fff">${escapeHtml(emailTrimmed)}</td></tr>
              <tr><td style="padding:8px 0;color:#aaa">WhatsApp</td><td style="color:#fff">${escapeHtml(whatsappSafe ?? '—')}</td></tr>
            </table>
            <hr style="border:none;border-top:1px solid #333;margin:16px 0"/>
            <p style="color:#ccc;line-height:1.6;white-space:pre-wrap">${escapeHtml(mensajeTrimmed)}</p>
          </div>
        `,
        })
      } catch (emailErr) {
        console.warn('[api/contact] No se envió notificación por correo:', emailErr)
      }
    }

    return NextResponse.json({ ok: true }, { headers: rateLimitHeaders(rate) })
  } catch (err) {
    console.error('[api/contact]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
