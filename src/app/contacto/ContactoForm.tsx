'use client'

import { useState } from 'react'
import Link from 'next/link'

/* ── Animated underline field ─────────────────────────── */
function Field({
  tag = 'input',
  ...props
}: React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> & {
  tag?: 'input' | 'textarea'
  rows?: number
}) {
  const base =
    'peer w-full bg-transparent text-white text-sm pb-3 pt-1 ' +
    'border-b border-zinc-700 focus:border-transparent focus:outline-none ' +
    'placeholder:text-zinc-600 placeholder:text-sm caret-[#E8177A] ' +
    'transition-colors duration-200'

  return (
    <div className="relative">
      {tag === 'textarea' ? (
        <textarea
          {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          className={`${base} resize-none`}
        />
      ) : (
        <input
          {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
          className={base}
        />
      )}
      {/* animated pink underline expands on focus */}
      <span className="absolute bottom-0 left-0 h-[2px] w-0 bg-[#E8177A] transition-all duration-500 peer-focus:w-full" />
    </div>
  )
}

/* ── Contact card (left column) ───────────────────────── */
function ContactCard({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode
  label: string
  value: string
  href?: string
}) {
  const content = (
    <div className="flex items-start gap-3 group">
      <div
        className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0 text-[#E8177A] transition-colors"
        style={{ border: '1px solid rgba(232,23,122,0.35)', background: 'rgba(232,23,122,0.07)' }}
      >
        {icon}
      </div>
      <div>
        <p className="text-zinc-500 text-xs uppercase tracking-widest mb-0.5">{label}</p>
        <p className="text-white text-sm group-hover:text-[#E8177A] transition-colors">{value}</p>
      </div>
    </div>
  )

  return href ? (
    <Link href={href} target={href.startsWith('http') ? '_blank' : undefined}>
      {content}
    </Link>
  ) : (
    <div>{content}</div>
  )
}

/* ── Main component ───────────────────────────────────── */
export default function ContactoForm() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('sending')
    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form))
    try {
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      setStatus('sent')
      form.reset()
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="relative overflow-hidden">

      {/* Background glow */}
      <div
        className="pointer-events-none absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, #E8177A 0%, transparent 70%)' }}
      />

      {/* ── Hero section ──────────────────────────────────── */}
      <section className="relative max-w-6xl mx-auto px-6 pt-16 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-20 items-start">

          {/* ── Left column ─────────────────────────────── */}
          <div className="lg:col-span-2 space-y-10">

            {/* Title box */}
            <div>
              <div
                className="inline-block p-8 mb-5 relative"
                style={{
                  border: '2px solid #E8177A',
                  boxShadow: '0 0 30px rgba(232,23,122,0.25), inset 0 0 30px rgba(232,23,122,0.04)',
                }}
              >
                {/* corner accent top-right */}
                <span
                  className="absolute -top-[2px] -right-[2px] w-5 h-5 block"
                  style={{ borderTop: '4px solid #E8177A', borderRight: '4px solid #E8177A' }}
                />
                {/* corner accent bottom-left */}
                <span
                  className="absolute -bottom-[2px] -left-[2px] w-5 h-5 block"
                  style={{ borderBottom: '4px solid #E8177A', borderLeft: '4px solid #E8177A' }}
                />
                <h1
                  className="font-display font-bold text-5xl lg:text-6xl uppercase leading-none"
                  style={{ color: '#E8177A' }}
                >
                  TE<br />CONTA<br />CTAMOS
                </h1>
              </div>
              <p className="text-zinc-400 text-sm leading-relaxed max-w-xs">
                Utilice el siguiente formulario para cualquier solicitud especial,
                consulta, pregunta o inquietud.
              </p>
            </div>

            {/* Contact cards */}
            <div className="space-y-5">
              <ContactCard
                icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.549 4.099 1.51 5.823L.06 23.127a.75.75 0 00.918.919l5.304-1.45A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.95 9.95 0 01-5.07-1.384l-.361-.214-3.148.859.826-3.147-.234-.373A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                  </svg>
                }
                label="WhatsApp"
                value="+52 55 7152 7659"
                href="https://wa.me/525571527659"
              />
              <ContactCard
                icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-10 7L2 7" />
                  </svg>
                }
                label="Email"
                value="contacto@casaempire.net"
                href="mailto:contacto@casaempire.net"
              />
              <ContactCard
                icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                }
                label="Tiempo de respuesta"
                value="Menos de 24 horas"
              />
            </div>

            {/* Pink divider line */}
            <div className="h-px w-24" style={{ background: 'linear-gradient(to right, #E8177A, transparent)' }} />
          </div>

          {/* ── Right column — form ──────────────────────── */}
          <div className="lg:col-span-3">
            {status === 'sent' ? (
              /* Success state */
              <div className="py-20 text-center">
                <div
                  className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center"
                  style={{ border: '2px solid #E8177A', boxShadow: '0 0 24px rgba(232,23,122,0.3)' }}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#E8177A" strokeWidth="2.5">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>
                <p className="text-3xl font-display font-bold uppercase tracking-wide" style={{ color: '#E8177A' }}>
                  ¡Listo!
                </p>
                <p className="text-zinc-400 mt-3 text-sm">
                  Tu mensaje fue enviado. Te contactamos en menos de 24 horas.
                </p>
                <button
                  onClick={() => setStatus('idle')}
                  className="mt-8 text-xs text-zinc-500 hover:text-white underline transition-colors"
                >
                  Enviar otro mensaje
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-10">

                {/* Row 1 — Nombre + Apellido */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <Field name="nombre" type="text" placeholder="Nombre" required />
                  <Field name="apellido" type="text" placeholder="Apellido" required />
                </div>

                {/* Row 2 — Email + WhatsApp */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <Field name="email" type="email" placeholder="Email *" required />
                  <Field name="whatsapp" type="text" placeholder="Whatsapp / Telegram" />
                </div>

                {/* Mensaje */}
                <Field tag="textarea" name="mensaje" rows={5} placeholder="Escribe tu mensaje..." required />

                {/* Error */}
                {status === 'error' && (
                  <p className="text-red-400 text-xs -mt-4">
                    Hubo un error. Intenta de nuevo o escríbenos directamente.
                  </p>
                )}

                {/* ENVIAR */}
                <div className="flex items-center gap-5">
                  <button
                    type="submit"
                    disabled={status === 'sending'}
                    className="group relative overflow-hidden px-12 py-3.5 rounded-full font-display font-bold
                      uppercase tracking-widest text-sm transition-all duration-300 disabled:opacity-50
                      hover:shadow-[0_0_25px_rgba(232,23,122,0.45)]"
                    style={{ border: '2px solid #E8177A', color: '#E8177A', background: 'transparent' }}
                  >
                    {/* fill sweep on hover */}
                    <span
                      className="absolute inset-0 -translate-x-full group-hover:translate-x-0 transition-transform duration-300 rounded-full"
                      style={{ background: '#E8177A' }}
                    />
                    <span className="relative group-hover:text-black transition-colors duration-300">
                      {status === 'sending' ? 'ENVIANDO...' : 'ENVIAR'}
                    </span>
                  </button>

                  <p className="text-zinc-600 text-xs">
                    También por{' '}
                    <Link
                      href="https://wa.me/525571527659"
                      target="_blank"
                      className="transition-colors hover:text-[#E8177A]"
                      style={{ color: 'rgba(232,23,122,0.7)' }}
                    >
                      WhatsApp →
                    </Link>
                  </p>
                </div>

              </form>
            )}
          </div>
        </div>
      </section>

      {/* ── Bottom: "Los Mejores suplementos" ─────────────── */}
      <section className="relative max-w-6xl mx-auto px-6 pb-20">
        {/* pink + green dual line */}
        <div className="flex mb-10 gap-0">
          <div className="h-1 flex-1" style={{ background: '#E8177A' }} />
          <div className="h-1 flex-1" style={{ background: '#23F30E' }} />
        </div>

        <h2 className="text-accent font-display font-bold text-4xl lg:text-6xl leading-tight mb-5 uppercase">
          Los Mejores<br />suplementos<br className="sm:hidden" />
          {' '}al alcance
        </h2>
        <p className="text-zinc-400 text-sm leading-relaxed max-w-lg">
          Para consultas sobre marcas y productos al por mayor,
          envíanos un correo electrónico a{' '}
          <a
            href="mailto:contacto@casaempire.net"
            className="underline transition-colors hover:text-white"
            style={{ color: '#E8177A' }}
          >
            contacto@casaempire.net
          </a>
        </p>
      </section>
    </div>
  )
}
