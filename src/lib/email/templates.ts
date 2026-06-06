import { isEmailConfigured, sendEmail } from '@/lib/email/send'
import { getPublicSiteOrigin } from '@/lib/site-origin'

/** Escapa HTML en valores interpolados en plantillas de correo. */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ─────────────────────────────────────────────────────────────────────────────
// Tipos compartidos
// ─────────────────────────────────────────────────────────────────────────────
interface OrderItem {
  name:     string
  quantity: number
  price:    number
}

interface ShippingAddr {
  street:      string
  numExterior?: string
  numInterior?: string
  colonia?:    string
  municipio?:  string
  referencias?: string
  city?:       string   // legacy
  state:       string
  zip:         string
  country:     string
}

interface OrderConfirmationArgs {
  to:               string
  orderId:          string
  items:            OrderItem[]
  subtotal:         number
  shipping:         number
  total:            number
  name:             string
  shippingAddress?: ShippingAddr
}

interface ShippingNotificationArgs {
  to:               string
  orderId:          string
  name:             string
  trackingNumber?:  string
  shippingAddress?: ShippingAddr
}

interface AdminSaleNotificationArgs {
  to:            string[]
  orderId:       string
  customerName:  string
  customerEmail: string
  items:         OrderItem[]
  total:         number
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de estilos comunes (reutilizables entre templates)
// ─────────────────────────────────────────────────────────────────────────────
function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#09090b;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        ${content}
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function emailHeader(title: string, subtitle?: string): string {
  return `<tr>
    <td style="background:#18181b;border:1px solid #27272a;border-radius:12px 12px 0 0;padding:32px 36px;text-align:center;">
      <p style="margin:0 0 4px;font-size:11px;letter-spacing:4px;color:#23F30E;text-transform:uppercase;font-weight:700;">Empire Nutrition</p>
      <h1 style="margin:0;font-size:26px;color:#ffffff;font-weight:900;letter-spacing:-0.5px;">${title}</h1>
      ${subtitle ? `<p style="margin:8px 0 0;font-size:13px;color:#71717a;">${subtitle}</p>` : ''}
    </td>
  </tr>`
}

function emailFooter(): string {
  return `<tr>
    <td style="background:#18181b;border:1px solid #27272a;border-top:none;border-radius:0 0 12px 12px;padding:24px 36px;text-align:center;">
      <p style="margin:0 0 12px;color:#52525b;font-size:12px;line-height:1.6;">
        ¿Tienes dudas sobre tu pedido? Contáctanos por WhatsApp:<br>
        <a href="https://wa.me/525571527659" style="color:#23F30E;text-decoration:none;font-weight:600;">+52 55 7152 7659</a>
      </p>
      <p style="margin:0;color:#3f3f46;font-size:11px;">© ${new Date().getFullYear()} Empire Nutrition — México</p>
    </td>
  </tr>`
}

function addressBlock(addr?: ShippingAddr): string {
  if (!addr) return ''

  // Línea 1: Calle + Núm. exterior (+ interior si existe)
  const line1Parts = [addr.street]
  if (addr.numExterior) line1Parts.push(`No. ${addr.numExterior}`)
  if (addr.numInterior) line1Parts.push(`Int. ${addr.numInterior}`)
  const line1 = line1Parts.join(' ')

  // Línea 2: Colonia
  const line2 = addr.colonia ? `Col. ${addr.colonia}` : ''

  // Línea 3: CP, Municipio/Alcaldía, Estado
  const cityPart = addr.municipio ?? addr.city ?? ''
  const line3Parts = [addr.zip, cityPart, addr.state].filter(Boolean)
  const line3 = line3Parts.join(', ')

  // Línea 4: Referencias (si existen)
  const line4 = addr.referencias ? `Ref: ${addr.referencias}` : ''

  const lines = [line1, line2, line3, addr.country, line4].filter(Boolean)

  return `<div style="background:#18181b;border:1px solid #27272a;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
    <p style="margin:0 0 6px;font-size:11px;color:#71717a;letter-spacing:3px;text-transform:uppercase;">Dirección de envío</p>
    <p style="margin:0;font-size:14px;color:#d4d4d8;line-height:1.8;">
      ${lines.join('<br>')}
    </p>
  </div>`
}

// ─────────────────────────────────────────────────────────────────────────────
// Template 1: Confirmación de orden
// ─────────────────────────────────────────────────────────────────────────────
function orderConfirmationHtml(args: OrderConfirmationArgs): string {
  const { orderId, items, subtotal, shipping, total, name, shippingAddress } = args
  const shortId = orderId.slice(0, 8).toUpperCase()

  const rows = items
    .map(
      (i) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #27272a;color:#a1a1aa;font-size:14px;">${i.name}</td>
        <td style="padding:10px 0;border-bottom:1px solid #27272a;color:#a1a1aa;font-size:14px;text-align:center;">×${i.quantity}</td>
        <td style="padding:10px 0;border-bottom:1px solid #27272a;color:#ffffff;font-size:14px;text-align:right;">$${(i.price * i.quantity).toFixed(2)}</td>
      </tr>`
    )
    .join('')

  const body = `
    <tr>
      <td style="background:#09090b;border-left:1px solid #27272a;border-right:1px solid #27272a;padding:32px 36px;">
        <p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 24px;">
          Hola <strong style="color:#ffffff;">${name}</strong>,<br>
          tu pedido ha sido recibido y está siendo procesado. Recibirás tu número de guía en 24–48 horas hábiles.
        </p>

        <!-- Order ID -->
        <div style="background:#18181b;border:1px solid #27272a;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
          <p style="margin:0;font-size:11px;color:#71717a;letter-spacing:3px;text-transform:uppercase;">Número de pedido</p>
          <p style="margin:6px 0 0;font-size:20px;color:#23F30E;font-weight:700;font-family:monospace;">#${shortId}</p>
        </div>

        <!-- Dirección de envío -->
        ${addressBlock(shippingAddress)}

        <!-- Items -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          <tr>
            <th style="text-align:left;font-size:11px;color:#71717a;letter-spacing:3px;text-transform:uppercase;padding-bottom:12px;">Producto</th>
            <th style="text-align:center;font-size:11px;color:#71717a;letter-spacing:3px;text-transform:uppercase;padding-bottom:12px;">Cant.</th>
            <th style="text-align:right;font-size:11px;color:#71717a;letter-spacing:3px;text-transform:uppercase;padding-bottom:12px;">Precio</th>
          </tr>
          ${rows}
        </table>

        <!-- Totals -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="color:#71717a;font-size:13px;padding:6px 0;">Subtotal</td>
            <td style="color:#a1a1aa;font-size:13px;padding:6px 0;text-align:right;">$${subtotal.toFixed(2)} MXN</td>
          </tr>
          <tr>
            <td style="color:#71717a;font-size:13px;padding:6px 0;">Envío</td>
            <td style="color:#a1a1aa;font-size:13px;padding:6px 0;text-align:right;">$${shipping.toFixed(2)} MXN</td>
          </tr>
          <tr><td colspan="2" style="border-top:1px solid #27272a;padding-top:12px;"></td></tr>
          <tr>
            <td style="color:#ffffff;font-size:16px;font-weight:700;padding:4px 0;">Total pagado</td>
            <td style="color:#23F30E;font-size:16px;font-weight:700;padding:4px 0;text-align:right;">$${total.toFixed(2)} MXN</td>
          </tr>
        </table>
      </td>
    </tr>`

  return emailWrapper(`${emailHeader('¡Pedido confirmado!')}${body}${emailFooter()}`)
}

// ─────────────────────────────────────────────────────────────────────────────
// Template 2: Notificación de envío
// ─────────────────────────────────────────────────────────────────────────────
function shippingNotificationHtml(args: ShippingNotificationArgs): string {
  const { orderId, name, trackingNumber, shippingAddress } = args
  const shortId = orderId.slice(0, 8).toUpperCase()

  const trackingBlock = trackingNumber
    ? `<div style="background:#0d1f2d;border:1px solid #1d4ed8;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0;font-size:11px;color:#60a5fa;letter-spacing:3px;text-transform:uppercase;">Número de guía</p>
        <p style="margin:6px 0 0;font-size:22px;color:#93c5fd;font-weight:700;font-family:monospace;">${trackingNumber}</p>
        <p style="margin:6px 0 0;font-size:12px;color:#3b82f6;">
          Usa este número para rastrear tu paquete con la paquetería.
        </p>
      </div>`
    : ''

  const body = `
    <tr>
      <td style="background:#09090b;border-left:1px solid #27272a;border-right:1px solid #27272a;padding:32px 36px;">
        <p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 24px;">
          Hola <strong style="color:#ffffff;">${name}</strong>,<br>
          ¡excelentes noticias! Tu pedido ya está en camino hacia ti.
        </p>

        <!-- Order ID -->
        <div style="background:#18181b;border:1px solid #27272a;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
          <p style="margin:0;font-size:11px;color:#71717a;letter-spacing:3px;text-transform:uppercase;">Número de pedido</p>
          <p style="margin:6px 0 0;font-size:20px;color:#23F30E;font-weight:700;font-family:monospace;">#${shortId}</p>
        </div>

        <!-- Icono de camión -->
        <div style="text-align:center;padding:20px 0;margin-bottom:20px;">
          <div style="display:inline-block;background:#18181b;border:1px solid #27272a;border-radius:12px;padding:20px 32px;">
            <p style="margin:0;font-size:36px;">🚚</p>
            <p style="margin:8px 0 0;color:#23F30E;font-weight:700;font-size:14px;letter-spacing:1px;text-transform:uppercase;">En camino</p>
          </div>
        </div>

        <!-- Número de guía (si existe) -->
        ${trackingBlock}

        <!-- Dirección de envío -->
        ${addressBlock(shippingAddress)}

        <p style="color:#71717a;font-size:13px;line-height:1.6;margin:0;">
          El tiempo estimado de entrega es de <strong style="color:#a1a1aa;">2–5 días hábiles</strong> dependiendo de tu ubicación.
          Si tienes alguna duda sobre tu envío, no dudes en contactarnos.
        </p>
      </td>
    </tr>`

  return emailWrapper(`
    ${emailHeader('¡Tu pedido está en camino!', 'Pronto lo tendrás en tus manos')}
    ${body}
    ${emailFooter()}
  `)
}

// ─────────────────────────────────────────────────────────────────────────────
// Funciones exportadas
// ─────────────────────────────────────────────────────────────────────────────

export async function sendOrderConfirmation(args: OrderConfirmationArgs): Promise<void> {
  if (!isEmailConfigured()) {
    console.info('[email] Correo no configurado — confirmación omitida para orden', args.orderId)
    return
  }
  await sendEmail({
    to:      args.to,
    subject: `Pedido #${args.orderId.slice(0, 8).toUpperCase()} confirmado — Empire Nutrition`,
    html:    orderConfirmationHtml(args),
    text:    `Hola ${args.name}, tu pedido #${args.orderId.slice(0, 8).toUpperCase()} fue confirmado. Total: $${args.total.toFixed(2)} MXN. Empire Nutrition`,
  })
}

export async function sendShippingNotification(args: ShippingNotificationArgs): Promise<void> {
  if (!isEmailConfigured()) {
    console.info('[email] Correo no configurado — aviso de envío omitido para orden', args.orderId)
    return
  }
  await sendEmail({
    to:      args.to,
    subject: `Tu pedido #${args.orderId.slice(0, 8).toUpperCase()} esta en camino — Empire Nutrition`,
    html:    shippingNotificationHtml(args),
    text:    `Hola ${args.name}, tu pedido #${args.orderId.slice(0, 8).toUpperCase()} ya fue enviado. Empire Nutrition`,
  })
}

function adminSaleNotificationHtml(args: AdminSaleNotificationArgs): string {
  const shortId = args.orderId.slice(0, 8).toUpperCase()
  const origin = getPublicSiteOrigin()
  const adminUrl = `${origin}/admin/ordenes/${args.orderId}`

  const rows = args.items
    .map(
      (i) =>
        `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #27272a;color:#a1a1aa;font-size:14px;">${i.name}</td>
          <td style="padding:8px 0;border-bottom:1px solid #27272a;color:#a1a1aa;font-size:14px;text-align:center;">×${i.quantity}</td>
          <td style="padding:8px 0;border-bottom:1px solid #27272a;color:#fff;font-size:14px;text-align:right;">$${(i.price * i.quantity).toFixed(2)}</td>
        </tr>`
    )
    .join('')

  const body = `
    <tr>
      <td style="background:#09090b;border-left:1px solid #27272a;border-right:1px solid #27272a;padding:32px 36px;">
        <p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 20px;">
          Nuevo pedido pagado en la tienda.
        </p>
        <div style="background:#18181b;border:1px solid #27272a;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
          <p style="margin:0;font-size:11px;color:#71717a;letter-spacing:3px;text-transform:uppercase;">Pedido</p>
          <p style="margin:6px 0 0;font-size:20px;color:#23F30E;font-weight:700;font-family:monospace;">#${shortId}</p>
          <p style="margin:12px 0 0;color:#d4d4d8;font-size:14px;">
            <strong style="color:#fff;">${args.customerName}</strong><br>
            <a href="mailto:${args.customerEmail}" style="color:#23F30E;text-decoration:none;">${args.customerEmail}</a>
          </p>
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
          ${rows}
        </table>
        <p style="margin:0 0 20px;color:#23F30E;font-size:18px;font-weight:700;">Total: $${args.total.toFixed(2)} MXN</p>
        <a href="${adminUrl}" style="display:inline-block;background:#23F30E;color:#000;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;">
          Ver en admin →
        </a>
      </td>
    </tr>`

  return emailWrapper(`${emailHeader('Nueva venta')}${body}${emailFooter()}`)
}

export async function sendAdminSaleNotification(args: AdminSaleNotificationArgs): Promise<void> {
  if (!args.to.length) return
  if (!isEmailConfigured()) {
    console.info('[email] Correo no configurado — aviso de venta omitido para orden', args.orderId)
    return
  }
  await sendEmail({
    to:      args.to,
    subject: `Nueva venta #${args.orderId.slice(0, 8).toUpperCase()} — $${args.total.toFixed(2)} MXN`,
    html:    adminSaleNotificationHtml(args),
    text:    `Nueva venta #${args.orderId.slice(0, 8).toUpperCase()} por $${args.total.toFixed(2)} MXN. Cliente: ${args.customerName} (${args.customerEmail})`,
  })
}
