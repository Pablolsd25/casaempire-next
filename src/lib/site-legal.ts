/** Datos legales del comercio — visibles en footer, contacto, términos y checkout */

export const LEGAL = {
  legalName: 'Comercializadora Casa Empire Nutrition SA de CV',
  tradeName: 'Empire Nutrition',
  tradeNameAlt: 'Casa Empire',
  fiscalAddress: {
    street: 'Calle 32 #143',
    colony: 'Col. Estado de México',
    city: 'Nezahualcóyotl',
    state: 'Edo. Méx.',
    zip: '57210',
    country: 'México',
  },
  phone: '55 7152 7659',
  phoneE164: '525571527659',
  email: 'contacto@casaempire.net',
  website: 'casaempire.net',
  paymentProcessor:
    'Los pagos con tarjeta se procesan de forma segura a través de OpenPay, operado por BBVA.',
} as const

export function formatFiscalAddress(): string {
  const { street, colony, city, state, zip, country } = LEGAL.fiscalAddress
  return `${street}, ${colony}, ${city}, ${state}, C.P. ${zip}, ${country}`
}

export const LEGAL_LINKS = {
  terminos: '/terminos',
  privacidad: '/privacidad',
  garantia: '/garantia',
  envios: '/envios',
  contacto: '/contacto',
} as const
