import Link from 'next/link'
import type { Metadata } from 'next'
import { formatFiscalAddress, LEGAL, LEGAL_LINKS } from '@/lib/site-legal'

export const metadata: Metadata = {
  title: 'Términos y Condiciones',
  description: `Términos y condiciones de compra de ${LEGAL.tradeName}.`,
}

const sections = [
  {
    title: '1. Identidad del comercio',
    body: (
      <>
        <p>
          El sitio web <strong>{LEGAL.website}</strong> es operado por{' '}
          <strong>{LEGAL.legalName}</strong>, nombre comercial{' '}
          <strong>{LEGAL.tradeName}</strong> / <strong>{LEGAL.tradeNameAlt}</strong>, con giro de
          comercialización de suplementos y productos de nutrición deportiva en México.
        </p>
        <p className="mt-3">
          <strong>Domicilio fiscal:</strong> {formatFiscalAddress()}
          <br />
          <strong>Teléfono:</strong>{' '}
          <a href={`tel:+${LEGAL.phoneE164}`} className="text-accent hover:underline">
            {LEGAL.phone}
          </a>
          <br />
          <strong>Correo:</strong>{' '}
          <a href={`mailto:${LEGAL.email}`} className="text-accent hover:underline">
            {LEGAL.email}
          </a>
        </p>
      </>
    ),
  },
  {
    title: '2. Productos y precios',
    body: (
      <p>
        Los precios publicados en el sitio están expresados en pesos mexicanos (MXN), incluyen la
        descripción del producto y pueden actualizarse sin previo aviso. El monto total a cobrar se
        muestra en el carrito de compras y en el checkout antes de confirmar el pago.
      </p>
    ),
  },
  {
    title: '3. Pedidos y envíos',
    body: (
      <p>
        Al realizar un pedido, el cliente acepta proporcionar datos de envío completos y veraces.
        Los plazos de entrega, costos de envío y políticas de envío se describen en nuestra{' '}
        <Link href={LEGAL_LINKS.envios} className="text-accent hover:underline">
          página de envíos seguros
        </Link>
        .
      </p>
    ),
  },
  {
    title: '4. Pagos',
    body: (
      <p>
        {LEGAL.paymentProcessor} Aceptamos tarjetas de crédito y débito de las marcas Visa,
        Mastercard y American Express, sujetas a autorización del banco emisor. No almacenamos
        datos completos de tarjeta en nuestros servidores.
      </p>
    ),
  },
  {
    title: '5. Cancelaciones y devoluciones',
    body: (
      <p>
        Las políticas de garantía, devoluciones y reembolsos están detalladas en{' '}
        <Link href={LEGAL_LINKS.garantia} className="text-accent hover:underline">
          Garantía y devoluciones
        </Link>
        . Para dudas sobre un pedido, contáctanos en{' '}
        <Link href={LEGAL_LINKS.contacto} className="text-accent hover:underline">
          Contacto
        </Link>
        .
      </p>
    ),
  },
  {
    title: '6. Privacidad y seguridad',
    body: (
      <p>
        El tratamiento de datos personales se rige por nuestra{' '}
        <Link href={LEGAL_LINKS.privacidad} className="text-accent hover:underline">
          Política de privacidad
        </Link>
        . El sitio utiliza conexión cifrada (HTTPS) para proteger la información en tránsito.
      </p>
    ),
  },
  {
    title: '7. Limitación de responsabilidad',
    body: (
      <p>
        {LEGAL.legalName} no se hace responsable por fallas atribuibles a terceros (paqueterías,
        instituciones financieras o proveedores de pago), salvo lo exigido por la ley mexicana
        aplicable.
      </p>
    ),
  },
  {
    title: '8. Legislación aplicable',
    body: (
      <p>
        Estos términos se interpretan conforme a las leyes de los Estados Unidos Mexicanos. Cualquier
        controversia se someterá a los tribunales competentes en México.
      </p>
    ),
  },
]

export default function TerminosPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <h1 className="text-white font-display font-bold text-3xl sm:text-4xl uppercase tracking-tight mb-2">
        Términos y condiciones
      </h1>
      <p className="text-zinc-500 text-sm mb-10">
        {LEGAL.legalName} · Última actualización: {new Date().getFullYear()}
      </p>

      <div className="space-y-8">
        {sections.map((s) => (
          <section key={s.title}>
            <h2 className="text-white font-semibold text-lg mb-3">{s.title}</h2>
            <div className="text-zinc-400 text-sm leading-relaxed">{s.body}</div>
          </section>
        ))}
      </div>

      <div className="mt-12 pt-8 border-t border-zinc-800 flex flex-wrap gap-4 text-xs text-zinc-500">
        <Link href={LEGAL_LINKS.privacidad} className="hover:text-white transition-colors">
          Privacidad
        </Link>
        <Link href={LEGAL_LINKS.garantia} className="hover:text-white transition-colors">
          Garantía
        </Link>
        <Link href={LEGAL_LINKS.envios} className="hover:text-white transition-colors">
          Envíos
        </Link>
        <Link href={LEGAL_LINKS.contacto} className="hover:text-white transition-colors">
          Contacto
        </Link>
      </div>
    </div>
  )
}
