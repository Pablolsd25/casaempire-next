import Link from 'next/link'
import Image from 'next/image'
import { formatFiscalAddress, LEGAL, LEGAL_LINKS } from '@/lib/site-legal'

export default function Footer() {
  return (
    <footer className="bg-black border-t border-zinc-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">

          {/* Marca + datos del comercio */}
          <div className="col-span-1 lg:col-span-2">
            <span className="text-white font-bold text-xl tracking-widest uppercase">
              {LEGAL.tradeName}
            </span>
            <p className="mt-2 text-zinc-500 text-xs">{LEGAL.legalName}</p>
            <p className="mt-3 text-zinc-400 text-sm leading-relaxed max-w-sm">
              Nutrición y suplementos de alta calidad para alcanzar tu máximo potencial.
            </p>
            <div className="mt-5 text-zinc-500 text-xs space-y-1.5 leading-relaxed">
              <p>
                <span className="text-zinc-600">Domicilio fiscal:</span>
                <br />
                {formatFiscalAddress()}
              </p>
              <p>
                <span className="text-zinc-600">Teléfono:</span>{' '}
                <a href={`tel:+${LEGAL.phoneE164}`} className="text-zinc-400 hover:text-white transition-colors">
                  {LEGAL.phone}
                </a>
              </p>
              <p>
                <span className="text-zinc-600">Email:</span>{' '}
                <a href={`mailto:${LEGAL.email}`} className="text-zinc-400 hover:text-white transition-colors">
                  {LEGAL.email}
                </a>
              </p>
            </div>
          </div>

          {/* Tienda */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Tienda</h3>
            <ul className="space-y-2">
              {[
                { href: '/tienda', label: 'Todos los productos' },
                { href: '/categoria/men-nutrition', label: "Men's Nutrition" },
                { href: '/categoria/women-s-nutrition', label: "Women's Nutrition" },
                { href: '/ofertas', label: 'Ofertas' },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-zinc-400 hover:text-white text-sm transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Ayuda */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Ayuda</h3>
            <ul className="space-y-2">
              {[
                { href: '/faq', label: 'Preguntas frecuentes' },
                { href: LEGAL_LINKS.envios, label: 'Envíos seguros' },
                { href: LEGAL_LINKS.garantia, label: 'Garantía y devoluciones' },
                { href: LEGAL_LINKS.contacto, label: 'Contacto' },
                { href: LEGAL_LINKS.terminos, label: 'Términos y condiciones' },
                { href: LEGAL_LINKS.privacidad, label: 'Política de privacidad' },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-zinc-400 hover:text-white text-sm transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Pagos */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Pagos</h3>
            <p className="text-zinc-500 text-xs leading-relaxed mb-4">{LEGAL.paymentProcessor}</p>
            <Image
              src="/envios/openpay.png"
              alt="OpenPay"
              width={120}
              height={36}
              className="h-9 w-auto object-contain opacity-90"
            />
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-zinc-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-zinc-500 text-xs">
            © {new Date().getFullYear()} {LEGAL.legalName}. Todos los derechos reservados.
          </p>
          <p className="text-zinc-600 text-xs text-center sm:text-right">
            Pagos con tarjeta procesados por OpenPay (BBVA)
          </p>
        </div>
      </div>
    </footer>
  )
}
