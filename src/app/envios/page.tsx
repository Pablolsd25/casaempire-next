import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Envíos Seguros' }

const faqs = [
  {
    q: '¿Qué paqueterías manejamos?',
    a: (
      <ul className="space-y-1 text-zinc-400 text-sm leading-relaxed">
        <li className="flex items-center gap-2">
          <span className="text-accent">01.</span> UPS
        </li>
        <li className="flex items-center gap-2">
          <span className="text-accent">02.</span> Estafeta
        </li>
        <li className="flex items-center gap-2">
          <span className="text-accent">03.</span> FedEx
        </li>
      </ul>
    ),
  },
  {
    q: '¿Cuánto tiempo tarda en llegar mi pedido?',
    a: (
      <div className="space-y-3 text-sm">
        <div className="flex items-start gap-3">
          <span className="text-accent text-base mt-0.5">✔</span>
          <p className="text-zinc-400">
            <span className="text-white font-semibold">1 a 3 días hábiles</span> — ciudades principales
            (dependiendo del movimiento de paquetería).
          </p>
        </div>
        <div className="flex items-start gap-3">
          <span className="text-accent text-base mt-0.5">✔</span>
          <p className="text-zinc-400">
            <span className="text-white font-semibold">3 a 5 días hábiles</span> — zonas extendidas o de difícil acceso
            (dependiendo del movimiento de paquetería y acceso de la zona).
          </p>
        </div>
        <p className="text-zinc-500 text-xs mt-1">
          Tu código de rastreo indicará la fecha estimada de entrega.
        </p>
      </div>
    ),
  },
  {
    q: '¿Recibiré número de seguimiento de mi paquete?',
    a: (
      <p className="text-zinc-400 text-sm leading-relaxed">
        Sí. Después de realizado y acreditado tu pago, recibirás tu código de rastreo vía correo
        electrónico en un plazo de{' '}
        <span className="text-white font-semibold">24 a 48 horas hábiles</span>.
      </p>
    ),
  },
  {
    q: '¿Es seguro comprar por este medio?',
    a: (
      <p className="text-zinc-400 text-sm leading-relaxed">
        Sí. El{' '}
        <span className="text-accent font-semibold">100% de los envíos</span> que Empire Nutrition
        realiza llegan a su destino. Los pagos se procesan a través de{' '}
        <span className="text-white font-semibold">OpenPay</span> — plataforma 100% segura que
        protege por completo tu información bancaria y datos personales.
      </p>
    ),
  },
]

const requiredFields = [
  'Nombre completo de la persona que recibe',
  'Calle y número exterior (+ número interior si existe)',
  'Colonia',
  'Municipio y Estado',
  'Código Postal — 100% necesario. Sin él el envío no podrá ser procesado.',
  'Número de teléfono celular',
]

export default function EnviosPage() {
  return (
    <div>
      {/* Hero */}
      <div className="relative bg-gradient-to-b from-zinc-900 to-black border-b border-zinc-800 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(35,243,14,0.07),transparent_65%)] pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <nav className="flex items-center gap-2 text-xs text-zinc-500 mb-6 font-display uppercase tracking-wide">
            <Link href="/" className="hover:text-zinc-300 transition-colors">Inicio</Link>
            <span className="text-zinc-700">/</span>
            <span className="text-accent">Envíos Seguros</span>
          </nav>
          <h1 className="text-white font-display font-bold text-4xl sm:text-5xl uppercase tracking-tight leading-none">
            Envíos Seguros
          </h1>
          <div className="mt-3 h-[3px] w-14 bg-accent rounded-full" />
          <p className="text-zinc-400 mt-4 text-sm max-w-xl leading-relaxed">
            En Empire Nutrition realizamos cientos de envíos todos los días. Aquí encontrarás todo
            lo que necesitas saber sobre el proceso de envío de tu pedido.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-14">

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { value: '100%', label: 'Entregas garantizadas', icon: '✔' },
            { value: '1-5',  label: 'Días hábiles de entrega', icon: '⏱' },
            { value: '24-48h', label: 'Para recibir tu guía', icon: '📦' },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 text-center hover:border-accent/30 transition-colors"
            >
              <div className="text-accent font-display font-bold text-3xl">{s.value}</div>
              <div className="text-zinc-400 text-xs font-display uppercase tracking-wider mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <section>
          <h2 className="text-white font-display font-bold text-2xl uppercase tracking-tight mb-1">
            Preguntas frecuentes
          </h2>
          <div className="mt-2 h-[2px] w-10 bg-accent rounded-full mb-8" />

          <div className="space-y-4">
            {faqs.map((faq) => (
              <div
                key={faq.q}
                className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-colors"
              >
                <div className="px-6 py-4 border-b border-zinc-800/60">
                  <h3 className="text-white font-display font-semibold text-sm uppercase tracking-wide">
                    {faq.q}
                  </h3>
                </div>
                <div className="px-6 py-4">{faq.a}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Datos requeridos */}
        <section>
          <h2 className="text-white font-display font-bold text-2xl uppercase tracking-tight mb-1">
            Datos para tu envío
          </h2>
          <div className="mt-2 h-[2px] w-10 bg-accent rounded-full mb-4" />
          <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
            Al realizar tu compra, asegúrate de proporcionar los siguientes datos{' '}
            <span className="text-white font-semibold">completos y correctos</span> para garantizar
            la rapidez en la entrega de tu producto.
          </p>

          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6">
            <ul className="space-y-3">
              {requiredFields.map((field, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-accent font-display font-bold text-sm shrink-0 w-5 text-right">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-zinc-300 text-sm leading-snug">{field}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Avisos importantes */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Datos incompletos */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-yellow-400 text-xl">⚠️</span>
              <h3 className="text-white font-display font-semibold text-sm uppercase tracking-wide">Datos incompletos</h3>
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Empire Nutrition te contactará en un plazo de{' '}
              <span className="text-white">24 a 72 horas hábiles</span> vía correo o WhatsApp
              para solicitar la información faltante.
            </p>
            <p className="text-zinc-500 text-xs mt-3 leading-relaxed">
              Si en un plazo de 5 días hábiles no se reciben los datos, el envío se anula y no
              aplica reembolso.
            </p>
          </div>

          {/* Datos incorrectos */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-red-400 text-xl">🚫</span>
              <h3 className="text-white font-display font-semibold text-sm uppercase tracking-wide">Datos incorrectos</h3>
            </div>
            <ul className="space-y-2 text-zinc-400 text-sm leading-relaxed">
              <li>No es posible hacer cambios una vez procesado el envío.</li>
              <li>
                Si algún dato es erróneo (atribuible al cliente), la paquetería remitirá el envío a
                la <span className="text-white">oficina OCURRE más cercana</span> y deberás
                recogerlo con credencial de elector vigente.
              </li>
              <li>En este caso la compra se anula sin reembolso ni reenvío.</li>
            </ul>
          </div>
        </section>

        {/* Rastreo */}
        <section>
          <h2 className="text-white font-display font-bold text-2xl uppercase tracking-tight mb-1">
            Rastreo de tu paquete
          </h2>
          <div className="mt-2 h-[2px] w-10 bg-accent rounded-full mb-6" />

          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 space-y-4">
            <p className="text-zinc-400 text-sm leading-relaxed">
              Al realizar tu compra recibirás un correo que indicará:
            </p>
            <ul className="space-y-1 text-zinc-300 text-sm">
              {['Número de pedido', 'Confirmación de tus datos', 'Productos adquiridos'].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="text-accent text-xs">▸</span> {item}
                </li>
              ))}
            </ul>
            <p className="text-zinc-400 text-sm leading-relaxed pt-1">
              Cuando tu producto sea despachado, recibirás un segundo correo con el{' '}
              <span className="text-white font-semibold">número de guía</span> y el link de
              rastreo de la paquetería.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              {[
                { label: 'Rastrear en UPS',     href: 'https://www.ups.com/track?loc=es_MX&requester=ST/' },
                { label: 'Rastrear en Estafeta', href: 'https://www.estafeta.com/Herramientas/Rastreo' },
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-sm bg-zinc-900 border border-zinc-700
                    hover:border-accent/50 text-zinc-300 hover:text-accent text-xs font-display uppercase tracking-widest
                    transition-all duration-200"
                >
                  {link.label}
                  <span className="text-zinc-600 group-hover:text-accent">↗</span>
                </a>
              ))}
            </div>

            <p className="text-zinc-500 text-xs leading-relaxed border-t border-zinc-800 pt-4">
              En caso de retraso, contáctanos por WhatsApp al{' '}
              <a
                href="https://wa.me/525547017318"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                55-47-01-73-18
              </a>{' '}
              con tu número de pedido, nombre completo y número de seguimiento.
            </p>
          </div>
        </section>

        {/* CTA */}
        <div className="border border-zinc-800 rounded-xl p-8 text-center bg-zinc-950">
          <p className="text-zinc-400 text-sm mb-4">¿Listo para hacer tu pedido?</p>
          <Link
            href="/tienda"
            className="btn-accent inline-block px-10 py-3 rounded-sm text-sm"
          >
            Ir a la Tienda
          </Link>
        </div>

      </div>
    </div>
  )
}
