import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Envíos Seguros' }

const WIX      = 'https://static.wixstatic.com/media'
const WIX_VID  = 'https://video.wixstatic.com/video'
const SHIP_VID = `${WIX_VID}/d60565_b6e85d7a0c144d25ab693bde2ea6ad15`

const proofImages = [
  { src: `${WIX}/5cd3e7_66524d5e7d004d2397225ebb700d3474~mv2.jpeg`, alt: 'Pedido Empire Nutrition entregado' },
  { src: `${WIX}/5cd3e7_b13505cc72964d4893ed97fa2211ca30~mv2.jpeg`, alt: 'Paquete Empire Nutrition' },
  { src: `${WIX}/5cd3e7_52c63226cc7c46aba01a91f09cc4ef7b~mv2.jpeg`, alt: 'Envío asegurado Empire Nutrition' },
  { src: `${WIX}/5cd3e7_1bd8f4706e7d49a795175ad29d93874a~mv2.jpeg`, alt: 'Confirmación de entrega Empire Nutrition' },
]

const faqs = [
  {
    num: '01',
    q: '¿Qué paqueterías manejamos?',
    a: (
      <div className="grid grid-cols-3 gap-3 mt-1">
        {['UPS', 'Estafeta', 'FedEx'].map((carrier) => (
          <div key={carrier} className="bg-zinc-900 border border-zinc-800 rounded-lg py-3 text-center">
            <span className="text-white font-display font-semibold text-sm uppercase tracking-wide">{carrier}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    num: '02',
    q: '¿Cuánto tiempo tarda en llegar mi pedido?',
    a: (
      <div className="space-y-3 mt-1">
        <div className="flex items-start gap-3 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3">
          <span className="text-accent font-display font-bold text-sm mt-0.5 shrink-0">1–3 días</span>
          <p className="text-zinc-400 text-sm leading-snug">
            Hábiles a <span className="text-white">ciudades principales</span>, dependiendo del movimiento de paquetería.
          </p>
        </div>
        <div className="flex items-start gap-3 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3">
          <span className="text-accent font-display font-bold text-sm mt-0.5 shrink-0">3–5 días</span>
          <p className="text-zinc-400 text-sm leading-snug">
            Hábiles a <span className="text-white">zonas extendidas o de difícil acceso</span>.
          </p>
        </div>
        <p className="text-zinc-600 text-xs px-1">Tu código de rastreo indicará la fecha estimada de entrega.</p>
      </div>
    ),
  },
  {
    num: '03',
    q: '¿Recibiré número de seguimiento?',
    a: (
      <p className="text-zinc-400 text-sm leading-relaxed mt-1">
        Sí. Una vez acreditado tu pago recibirás tu código de rastreo por correo electrónico en un plazo de{' '}
        <span className="text-white font-semibold">24 a 48 horas hábiles</span>.
      </p>
    ),
  },
  {
    num: '04',
    q: '¿Es seguro comprar aquí?',
    a: (
      <p className="text-zinc-400 text-sm leading-relaxed mt-1">
        Sí. El{' '}
        <span className="text-accent font-bold">100% de los envíos</span> que Empire Nutrition realiza llegan a su destino.
        Los pagos se procesan con <span className="text-white font-semibold">OpenPay</span>, plataforma certificada
        que protege al 100% tu información bancaria y datos personales.
      </p>
    ),
  },
]

const requiredFields = [
  { label: 'Nombre completo de quien recibe' },
  { label: 'Calle y número exterior (e interior si aplica)' },
  { label: 'Colonia' },
  { label: 'Municipio y Estado' },
  { label: 'Código Postal', note: '100% necesario — sin este dato el envío no puede procesarse.' },
  { label: 'Número de teléfono celular' },
]

export default function EnviosPage() {
  return (
    <div>
      {/* ── Hero ── */}
      <div className="relative bg-gradient-to-b from-zinc-900 to-black border-b border-zinc-800 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(35,243,14,0.07),transparent_65%)] pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <nav className="flex items-center gap-2 text-xs text-zinc-500 mb-6 font-display uppercase tracking-wide">
            <Link href="/" className="hover:text-zinc-300 transition-colors">Inicio</Link>
            <span className="text-zinc-700">/</span>
            <span className="text-accent">Envíos Seguros</span>
          </nav>
          <h1 className="text-white font-display font-bold text-5xl sm:text-6xl uppercase tracking-tight leading-none">
            Envíos<br /><span className="text-accent">Seguros</span>
          </h1>
          <div className="mt-4 h-[3px] w-14 bg-accent rounded-full" />
          <p className="text-zinc-400 mt-5 text-sm max-w-xl leading-relaxed">
            En Empire Nutrition realizamos cientos de envíos cada día. Tus productos
            llegan protegidos y a tiempo a cualquier punto de la República Mexicana.
          </p>
        </div>
      </div>

      {/* ── Proof gallery ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-14">
        <div className="flex flex-col items-center mb-8 text-center">
          <p className="text-accent text-xs font-display uppercase tracking-[0.3em] mb-2">Evidencia real</p>
          <h2 className="text-white font-display font-bold text-2xl sm:text-3xl uppercase tracking-tight">
            Cientos de pedidos entregados
          </h2>
          <div className="mt-3 h-[2px] w-10 bg-accent rounded-full" />
        </div>

        {/* 2×2 image grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {proofImages.map((img, i) => (
            <div
              key={i}
              className="group relative aspect-square rounded-xl overflow-hidden border border-zinc-800 hover:border-accent/40 transition-all duration-300 hover:shadow-[0_0_25px_rgba(35,243,14,0.10)]"
            >
              <Image
                src={img.src}
                alt={img.alt}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700"
                sizes="(max-width: 768px) 50vw, 400px"
              />
              {/* subtle overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              {/* accent dot */}
              <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-accent opacity-0 group-hover:opacity-80 transition-opacity" />
            </div>
          ))}
        </div>

        {/* Trust badge */}
        <div className="mt-6 flex items-center justify-center gap-3 border border-zinc-800 rounded-xl py-4 px-6 bg-zinc-950">
          <span className="text-accent text-xl">✔</span>
          <p className="text-zinc-300 text-sm font-display uppercase tracking-wide">
            El 100% de nuestros envíos llegan a su destino
          </p>
        </div>
      </section>

      {/* ── Brand video ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <div className="relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950
          shadow-[0_0_40px_rgba(35,243,14,0.06)]">
          {/* accent top line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-accent to-transparent z-10" />

          <video
            src={`${SHIP_VID}/720p/mp4/file.mp4`}
            poster={`https://static.wixstatic.com/media/d60565_b6e85d7a0c144d25ab693bde2ea6ad15f000.jpg/v1/fill/w_1280,h_720,al_c,q_80,enc_avif,quality_auto/poster.jpg`}
            autoPlay
            muted
            loop
            playsInline
            className="w-full aspect-video object-cover"
          />

          {/* bottom caption */}
          <div className="absolute bottom-0 left-0 right-0 px-6 py-4
            bg-gradient-to-t from-black/80 via-black/30 to-transparent">
            <p className="text-accent text-xs font-display uppercase tracking-[0.25em]">
              Empire Nutrition · Envíos a toda la República
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-14">

        {/* ── Stats ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { value: '100%', label: 'Entregas garantizadas' },
            { value: '1–5',  label: 'Días hábiles de entrega' },
            { value: '24–48h', label: 'Para recibir tu guía' },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 text-center hover:border-accent/30 transition-colors"
            >
              <div className="text-accent font-display font-bold text-3xl leading-none">{s.value}</div>
              <div className="text-zinc-500 text-xs font-display uppercase tracking-wider mt-2">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── FAQ ── */}
        <section>
          <h2 className="text-white font-display font-bold text-2xl uppercase tracking-tight mb-1">
            Preguntas frecuentes
          </h2>
          <div className="mt-2 h-[2px] w-10 bg-accent rounded-full mb-8" />

          <div className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.num} className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-colors">
                <div className="px-6 py-4 flex items-start gap-4">
                  <span className="text-accent font-display font-bold text-sm shrink-0 mt-0.5">{faq.num}</span>
                  <div className="flex-1">
                    <h3 className="text-white font-display font-semibold text-sm uppercase tracking-wide">
                      {faq.q}
                    </h3>
                    <div className="mt-3">{faq.a}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Datos requeridos + Payment ── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Required data */}
          <div>
            <h2 className="text-white font-display font-bold text-2xl uppercase tracking-tight mb-1">
              Datos de envío
            </h2>
            <div className="mt-2 h-[2px] w-10 bg-accent rounded-full mb-4" />
            <p className="text-zinc-500 text-sm mb-5 leading-relaxed">
              Asegúrate de proporcionar estos datos{' '}
              <span className="text-white">completos y correctos</span>.
            </p>
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 space-y-3">
              {requiredFields.map((field, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-accent font-display font-bold text-xs shrink-0 mt-0.5 w-5 text-right">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <p className="text-zinc-300 text-sm">{field.label}</p>
                    {field.note && (
                      <p className="text-zinc-600 text-xs mt-0.5">{field.note}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment + confirmation */}
          <div className="space-y-4">
            <div>
              <h2 className="text-white font-display font-bold text-2xl uppercase tracking-tight mb-1">
                Pago seguro
              </h2>
              <div className="mt-2 h-[2px] w-10 bg-accent rounded-full mb-4" />
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-3 pb-3 border-b border-zinc-800">
                <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-display font-semibold text-sm uppercase tracking-wide">OpenPay</p>
                  <p className="text-zinc-500 text-xs">Tarjeta de crédito y débito</p>
                </div>
              </div>
              <p className="text-zinc-400 text-sm leading-relaxed">
                OpenPay es un método 100% seguro. Tu información bancaria y datos personales
                están completamente protegidos.
              </p>
            </div>

            {/* Confirmation email */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5">
              <h3 className="text-white font-display font-semibold text-sm uppercase tracking-wide mb-3">
                Confirmación por correo
              </h3>
              <ul className="space-y-2">
                {[
                  'Número de pedido',
                  'Confirmación de tus datos',
                  'Productos adquiridos',
                  'Número de guía (al despachar)',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-zinc-400 text-sm">
                    <span className="text-accent text-xs">▸</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── Avisos importantes ── */}
        <section>
          <h2 className="text-white font-display font-bold text-2xl uppercase tracking-tight mb-1">
            Avisos importantes
          </h2>
          <div className="mt-2 h-[2px] w-10 bg-accent rounded-full mb-6" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-zinc-950 border border-yellow-900/40 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">⚠️</span>
                <h3 className="text-yellow-400 font-display font-semibold text-sm uppercase tracking-wide">
                  Datos incompletos
                </h3>
              </div>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Te contactaremos en{' '}
                <span className="text-white">24 a 72 horas hábiles</span> vía correo o WhatsApp.
              </p>
              <p className="text-zinc-600 text-xs mt-3 leading-relaxed">
                Si en 5 días hábiles no respondes, el envío se anula y no aplica reembolso.
              </p>
            </div>

            <div className="bg-zinc-950 border border-red-900/40 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🚫</span>
                <h3 className="text-red-400 font-display font-semibold text-sm uppercase tracking-wide">
                  Datos incorrectos
                </h3>
              </div>
              <ul className="space-y-2 text-zinc-400 text-sm leading-relaxed">
                <li>No es posible hacer cambios una vez procesado el envío.</li>
                <li>
                  Si la paquetería no puede entregar por datos erróneos, el paquete va a{' '}
                  <span className="text-white">oficina OCURRE</span> — requieres credencial de elector.
                </li>
                <li className="text-zinc-600 text-xs">Compra anulada sin reembolso ni reenvío.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── Rastreo ── */}
        <section>
          <h2 className="text-white font-display font-bold text-2xl uppercase tracking-tight mb-1">
            Rastreo de tu paquete
          </h2>
          <div className="mt-2 h-[2px] w-10 bg-accent rounded-full mb-6" />

          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 space-y-5">
            <p className="text-zinc-400 text-sm leading-relaxed">
              Las guías pueden rastrearse directamente en los portales de cada paquetería:
            </p>

            <div className="flex flex-wrap gap-3">
              {[
                { label: 'Rastrear en UPS',      href: 'https://www.ups.com/track?loc=es_MX&requester=ST/' },
                { label: 'Rastrear en Estafeta',  href: 'https://www.estafeta.com/Herramientas/Rastreo' },
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm bg-zinc-900 border border-zinc-700
                    hover:border-accent/60 text-zinc-300 hover:text-accent text-xs font-display uppercase tracking-widest
                    transition-all duration-200"
                >
                  {link.label}
                  <span className="text-zinc-600 text-base leading-none">↗</span>
                </a>
              ))}
            </div>

            <div className="border-t border-zinc-800 pt-5 flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-[#25D366]/10 border border-[#25D366]/30 flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </div>
              <div>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  ¿Retraso en tu entrega? Escríbenos al{' '}
                  <a
                    href="https://wa.me/525547017318?text=Hola%2C%20tengo%20una%20pregunta%20sobre%20mi%20envío"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#25D366] hover:underline font-semibold"
                  >
                    55-47-01-73-18
                  </a>{' '}
                  con tu número de pedido, nombre completo y número de guía.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <div className="border border-zinc-800 rounded-xl p-10 text-center bg-zinc-950 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(35,243,14,0.04),transparent_70%)] pointer-events-none" />
          <p className="text-accent text-xs font-display uppercase tracking-[0.3em] mb-3">Empire Nutrition</p>
          <h3 className="text-white font-display font-bold text-2xl uppercase tracking-tight mb-5">
            ¿Listo para hacer tu pedido?
          </h3>
          <Link href="/tienda" className="btn-accent inline-block px-12 py-3.5 rounded-sm text-sm tracking-wider">
            Ir a la Tienda
          </Link>
        </div>

      </div>
    </div>
  )
}
