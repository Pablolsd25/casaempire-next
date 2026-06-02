import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  try {
    const { nombre, apellido, email, whatsapp, mensaje } = await req.json()

    if (!email || !mensaje) {
      return NextResponse.json({ error: 'Campos requeridos faltantes' }, { status: 400 })
    }

    // Persistir en DB SIEMPRE (antes del email para no perder si Resend falla)
    const supabase = createAdminClient()
    await supabase.from('contact_submissions').insert({
      nombre:   nombre  ?? null,
      apellido: apellido ?? null,
      email,
      whatsapp: whatsapp ?? null,
      mensaje,
    })

    // Si RESEND_API_KEY está configurado, enviar email de notificación
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey) {
      const { Resend } = await import('resend')
      const resend = new Resend(resendKey)
      await resend.emails.send({
        from:    'Empire Nutrition <contacto@casaempire.net>',
        to:      'contacto@casaempire.net',
        replyTo: email,
        subject: `Nuevo mensaje de contacto — ${nombre ?? ''} ${apellido ?? ''}`.trim(),
        html: `
          <div style="font-family:sans-serif;background:#000;color:#fff;padding:32px;max-width:560px">
            <h2 style="color:#E8177A;font-size:24px;margin-bottom:16px;">Nuevo mensaje de contacto</h2>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:8px 0;color:#aaa;width:140px">Nombre</td><td style="color:#fff">${nombre ?? '—'} ${apellido ?? ''}</td></tr>
              <tr><td style="padding:8px 0;color:#aaa">Email</td><td style="color:#fff">${email}</td></tr>
              <tr><td style="padding:8px 0;color:#aaa">WhatsApp</td><td style="color:#fff">${whatsapp ?? '—'}</td></tr>
            </table>
            <hr style="border:none;border-top:1px solid #333;margin:16px 0"/>
            <p style="color:#ccc;line-height:1.6;white-space:pre-wrap">${mensaje}</p>
          </div>
        `,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/contact]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
