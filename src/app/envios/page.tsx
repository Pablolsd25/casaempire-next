import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Envíos Seguros' }

const proofImages = [
  { src: '/envios/proof-1.jpg', alt: 'Pedido Empire Nutrition entregado' },
  { src: '/envios/proof-2.jpg', alt: 'Paquete Empire Nutrition' },
  { src: '/envios/proof-3.jpg', alt: 'Envío asegurado Empire Nutrition' },
  { src: '/envios/proof-4.jpg', alt: 'Confirmación de entrega Empire Nutrition' },
]

const WHATSAPP_NUMBER = '525571527659'
const WHATSAPP_DISPLAY = '55 7152 7659'

const carriers = [
  {
    name: 'DHL',
    logo: '/envios/dhl.png',
    trackLabel: 'Rastrear en DHL',
    trackHref: 'https://www.dhl.com/mx-es/home/tracking/tracking-express.html',
  },
  {
    name: 'Estafeta',
    logo: '/envios/estafeta.png',
    trackLabel: 'Rastrear en Estafeta',
    trackHref: 'https://www.estafeta.com/Herramientas/Rastreo',
  },
  {
    name: 'FedEx',
    logo: '/envios/fedex.png',
    trackLabel: 'Rastrear en FedEx',
    trackHref: 'https://www.fedex.com/es-mx/tracking.html',
  },
] as const

const requiredFields = [
  { label: 'Nombre completo de quien recibe' },
  { label: 'Calle y número exterior (e interior si aplica)' },
  { label: 'Colonia' },
  { label: 'Municipio y Estado' },
  { label: 'Código Postal', note: '100% necesario — sin este dato el envío no puede procesarse.' },
  { label: 'Número de teléfono celular' },
]

const faqs = [
  {
    num: '01',
    q: '¿Cuánto tiempo tarda en llegar mi pedido?',
    a: (
      <div className="space-y-3 mt-1">
        <div className="flex items-start gap-3 bg-zinc-900/80 border border-zinc-800 rounded-lg px-4 py-3">
          <span className="text-accent font-display font-bold text-sm mt-0.5 shrink-0">1–3 días</span>
          <p className="text-zinc-400 text-sm leading-snug">
            Hábiles a <span className="text-white">ciudades principales</span>, según la paquetería asignada.
          </p>
        </div>
        <div className="flex items-start gap-3 bg-zinc-900/80 border border-zinc-800 rounded-lg px-4 py-3">
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
    num: '02',
    q: '¿Recibiré número de seguimiento?',
    a: (
      <p className="text-zinc-400 text-sm leading-relaxed mt-1">
        Sí. Una vez acreditado tu pago recibirás tu guía por correo en{' '}
        <span className="text-white font-semibold">24 a 48 horas hábiles</span>.
      </p>
    ),
  },
  {
    num: '03',
    q: '¿Es seguro comprar aquí?',
    a: (
      <p className="text-zinc-400 text-sm leading-relaxed mt-1">
        Sí. El <span className="text-accent font-bold">100% de los envíos</span> de Empire Nutrition llegan a destino.
        Pagos con <span className="text-white font-semibold">Openpay by BBVA</span>, plataforma certificada que protege
        tu información bancaria.
      </p>
    ),
  },
]

export default function EnviosPage() {
  const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hola, tengo una pregunta sobre mi envío')}`

  return (
    <div className="bg-black">
      {/* ── Hero ── */}
      <section className="relative border-b border-zinc-800 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(35,243,14,0.08),transparent_55%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,#000_100%)] pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <nav className="flex items-center gap-2 text-xs text-zinc-500 mb-8 font-display uppercase tracking-wide">
            <Link href="/" className="hover:text-zinc-300 transition-colors">Inicio</Link>
            <span className="text-zinc-700">/</span>
            <span className="text-accent">Envíos Seguros</span>
          </nav>

          <div className="flex flex-col-reverse lg:flex-row items-center gap-10 lg:gap-14">
            <div className="flex-1 text-center lg:text-left">
              <p className="text-accent text-xs font-display uppercase tracking-[0.35em] mb-3">
                República Mexicana
              </p>
              <h1 className="text-white font-display font-bold text-5xl sm:text-6xl lg:text-7xl uppercase tracking-tight leading-[0.95]">
                Envíos
                <br />
                <span className="text-accent">Seguros</span>
              </h1>
              <div className="mt-5 h-[3px] w-16 bg-accent rounded-full mx-auto lg:mx-0" />
              <p className="text-zinc-400 mt-6 text-sm sm:text-base max-w-lg leading-relaxed mx-auto lg:mx-0">
                Enviamos todos los días con las mejores paqueterías. Tu pedido llega protegido,
                rastreado y con pago bancario certificado.
              </p>

              <div className="mt-8 flex flex-wrap justify-center lg:justify-start gap-6">
                {[
                  { value: '100%', label: 'Entregas' },
                  { value: 'DHL', label: 'Paquetería principal' },
                  { value: '24h', label: 'Tu guía de rastreo' },
                ].map((s) => (
                  <div key={s.label} className="text-center lg:text-left">
                    <div className="text-accent font-display font-bold text-2xl sm:text-3xl leading-none">
                      {s.value}
                    </div>
                    <div className="text-zinc-600 text-[10px] sm:text-xs font-display uppercase tracking-widest mt-1.5">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="shrink-0 w-full max-w-[280px] lg:max-w-[300px]">
              <div className="relative rounded-2xl overflow-hidden border border-zinc-700/80 shadow-[0_0_50px_rgba(35,243,14,0.15)]">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-accent to-transparent z-10" />
                <video
                  src="/envios-video.mp4"
                  controls
                  playsInline
                  className="w-full aspect-[9/16] object-cover block bg-zinc-950"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Paqueterías ── */}
      <section className="relative py-14 lg:py-20 border-b border-zinc-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-accent text-xs font-display uppercase tracking-[0.3em] mb-2">
              Aliados logísticos
            </p>
            <h2 className="text-white font-display font-bold text-2xl sm:text-4xl uppercase tracking-tight">
              Paqueterías de confianza
            </h2>
            <p className="text-zinc-500 text-sm mt-3 max-w-xl mx-auto">
              Trabajamos con <span className="text-white">DHL</span>, Estafeta y FedEx para cubrir todo México.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
            {carriers.map((c) => (
              <a
                key={c.name}
                href={c.trackHref}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative bg-zinc-950 border border-zinc-800 rounded-2xl p-6 lg:p-8
                  hover:border-accent/40 hover:shadow-[0_0_40px_rgba(35,243,14,0.08)] transition-all duration-300"
              >
                <div className="relative h-16 sm:h-20 lg:h-24 mb-5">
                  <Image
                    src={c.logo}
                    alt={`Logo ${c.name}`}
                    fill
                    className="object-contain object-center group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 640px) 100vw, 280px"
                  />
                </div>
                <p className="text-white font-display font-semibold text-sm uppercase tracking-wider text-center">
                  {c.name}
                </p>
                <p className="text-zinc-600 text-[10px] font-display uppercase tracking-widest text-center mt-2
                  group-hover:text-accent transition-colors">
                  {c.trackLabel} ↗
                </p>
                {c.name === 'DHL' && (
                  <span className="absolute top-3 right-3 text-[9px] font-display uppercase tracking-wider
                    px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30">
                    Principal
                  </span>
                )}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pago Openpay + BBVA (grande) ── */}
      <section className="relative py-14 lg:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,180,200,0.06),transparent_70%)] pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-accent text-xs font-display uppercase tracking-[0.3em] mb-2">
              Pago protegido
            </p>
            <h2 className="text-white font-display font-bold text-2xl sm:text-4xl uppercase tracking-tight">
              Openpay by BBVA
            </h2>
            <p className="text-zinc-500 text-sm mt-3 max-w-2xl mx-auto leading-relaxed">
              Procesamos pagos con la plataforma de BBVA Bancomer. Tu tarjeta y datos personales
              viajan cifrados — nosotros nunca guardamos tu información bancaria.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-8 max-w-5xl mx-auto">
            <div className="relative bg-white rounded-2xl p-8 sm:p-10 lg:p-12 flex items-center justify-center
              min-h-[160px] sm:min-h-[200px] shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
              <div className="relative w-full h-20 sm:h-28 lg:h-32">
                <Image
                  src="/envios/openpay.png"
                  alt="Openpay by BBVA"
                  fill
                  className="object-contain"
                  sizes="(max-width: 1024px) 90vw, 480px"
                  priority
                />
              </div>
            </div>
            <div className="relative bg-white rounded-2xl p-8 sm:p-10 lg:p-12 flex items-center justify-center
              min-h-[160px] sm:min-h-[200px] shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
              <div className="relative w-full h-16 sm:h-24 lg:h-28">
                <Image
                  src="/envios/bancomer.png"
                  alt="BBVA Bancomer"
                  fill
                  className="object-contain"
                  sizes="(max-width: 1024px) 90vw, 480px"
                />
              </div>
            </div>
          </div>

          <ul className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-2 text-zinc-500 text-xs font-display uppercase tracking-widest">
            {['Tarjeta crédito', 'Tarjeta débito', 'Cifrado SSL', 'Certificación bancaria'].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-accent" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Galería evidencia ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-16">
        <div className="flex flex-col items-center mb-10 text-center">
          <p className="text-accent text-xs font-display uppercase tracking-[0.3em] mb-2">Evidencia real</p>
          <h2 className="text-white font-display font-bold text-2xl sm:text-3xl uppercase tracking-tight">
            Cientos de pedidos entregados
          </h2>
          <div className="mt-3 h-[2px] w-10 bg-accent rounded-full" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {proofImages.map((img, i) => (
            <div
              key={i}
              className="group relative aspect-square rounded-xl overflow-hidden border border-zinc-800
                hover:border-accent/40 transition-all duration-300 hover:shadow-[0_0_25px_rgba(35,243,14,0.12)]"
            >
              <Image
                src={img.src}
                alt={img.alt}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700"
                sizes="(max-width: 1024px) 50vw, 280px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            </div>
          ))}
        </div>

        <div className="mt-8 flex items-center justify-center gap-3 border border-accent/20 rounded-2xl py-5 px-6
          bg-accent/[0.04]">
          <span className="text-accent text-2xl">✔</span>
          <p className="text-zinc-200 text-sm sm:text-base font-display uppercase tracking-wide text-center">
            El 100% de nuestros envíos llegan a su destino
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 lg:pb-24 space-y-14 lg:space-y-20">
        {/* ── FAQ ── */}
        <section>
          <h2 className="text-white font-display font-bold text-2xl sm:text-3xl uppercase tracking-tight mb-2">
            Preguntas frecuentes
          </h2>
          <div className="h-[2px] w-10 bg-accent rounded-full mb-8" />
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div
                key={faq.num}
                className="bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-5 hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <span className="text-accent font-display font-bold text-sm shrink-0">{faq.num}</span>
                  <div>
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

        {/* ── Datos + contacto ── */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-white font-display font-bold text-2xl uppercase tracking-tight mb-2">
              Datos de envío
            </h2>
            <div className="h-[2px] w-10 bg-accent rounded-full mb-5" />
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-3">
              {requiredFields.map((field, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-accent font-display font-bold text-xs shrink-0 w-5 text-right">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <p className="text-zinc-300 text-sm">{field.label}</p>
                    {field.note && <p className="text-zinc-600 text-xs mt-0.5">{field.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 lg:p-8 flex flex-col justify-between">
            <div>
              <h2 className="text-white font-display font-bold text-2xl uppercase tracking-tight mb-2">
                ¿Dudas con tu envío?
              </h2>
              <div className="h-[2px] w-10 bg-accent rounded-full mb-5" />
              <p className="text-zinc-400 text-sm leading-relaxed">
                Escríbenos por WhatsApp con tu número de pedido, nombre completo y guía de rastreo.
              </p>
            </div>

            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 flex items-center gap-4 p-4 rounded-xl bg-[#25D366]/10 border border-[#25D366]/30
                hover:bg-[#25D366]/15 hover:border-[#25D366]/50 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-[#25D366]/20 flex items-center justify-center shrink-0">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="#25D366">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </div>
              <div>
                <p className="text-[#25D366] font-display font-bold text-xl sm:text-2xl tracking-wide">
                  {WHATSAPP_DISPLAY}
                </p>
                <p className="text-zinc-500 text-xs mt-0.5 group-hover:text-zinc-400 transition-colors">
                  Toca para abrir WhatsApp ↗
                </p>
              </div>
            </a>
          </div>
        </section>

        {/* ── Avisos ── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-zinc-950 border border-yellow-900/40 rounded-2xl p-6">
            <h3 className="text-yellow-400 font-display font-semibold text-sm uppercase tracking-wide mb-3">
              ⚠️ Datos incompletos
            </h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Te contactamos en <span className="text-white">24 a 72 horas hábiles</span>. Sin respuesta en 5 días
              hábiles, el envío se anula sin reembolso.
            </p>
          </div>
          <div className="bg-zinc-950 border border-red-900/40 rounded-2xl p-6">
            <h3 className="text-red-400 font-display font-semibold text-sm uppercase tracking-wide mb-3">
              🚫 Datos incorrectos
            </h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              No hay cambios tras procesar el envío. Paquete en oficina OCURRE si la paquetería no puede entregar.
            </p>
          </div>
        </section>

        {/* ── Rastreo ── */}
        <section className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 lg:p-8">
          <h2 className="text-white font-display font-bold text-xl uppercase tracking-tight mb-4">
            Rastrea tu paquete
          </h2>
          <div className="flex flex-wrap gap-3">
            {carriers.map((c) => (
              <a
                key={c.name}
                href={c.trackHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700
                  hover:border-accent/50 text-zinc-300 hover:text-accent text-xs font-display uppercase tracking-widest transition-all"
              >
                {c.trackLabel}
                <span>↗</span>
              </a>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <div className="relative border border-zinc-800 rounded-2xl p-10 lg:p-14 text-center overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(35,243,14,0.06),transparent_70%)] pointer-events-none" />
          <p className="text-accent text-xs font-display uppercase tracking-[0.3em] mb-3 relative">Empire Nutrition</p>
          <h3 className="text-white font-display font-bold text-2xl sm:text-3xl uppercase tracking-tight mb-6 relative">
            ¿Listo para hacer tu pedido?
          </h3>
          <Link
            href="/tienda"
            className="btn-accent inline-block px-12 py-3.5 rounded-sm text-sm tracking-wider relative"
          >
            Ir a la Tienda
          </Link>
        </div>
      </div>
    </div>
  )
}
