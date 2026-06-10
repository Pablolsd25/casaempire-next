import { jsPDF } from 'jspdf'
import { LEGAL } from '@/lib/site-legal'
import { formatMexicanPhone } from '@/lib/checkout-validation'
import { formatMexicoDateTime } from '@/lib/mexico-datetime'
import { formatOrderNumber } from '@/lib/order-number'

export type ReceiptOrderItem = {
  name: string
  quantity: number
  unit_price: number
}

export type ReceiptOrder = {
  id: string
  wix_order_number: number | null
  created_at: string
  status: string
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  subtotal: number
  shipping_cost: number
  discount: number
  total: number
  coupon_code: string | null
  openpay_transaction_id: string | null
  tracking_number: string | null
  shipping_address: Record<string, string> | null
  items: ReceiptOrderItem[]
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

function money(n: number): string {
  return `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function orderLabel(order: ReceiptOrder): string {
  return `Pedido ${formatOrderNumber(order)}`
}

function formatAddress(addr: Record<string, string> | null): string[] {
  if (!addr) return []
  const lines: string[] = []
  const street = [
    addr.street,
    addr.numExterior ? `No. ${addr.numExterior}` : '',
    addr.numInterior ? `Int. ${addr.numInterior}` : '',
  ]
    .filter(Boolean)
    .join(' ')
  if (street) lines.push(street)
  if (addr.colonia) lines.push(`Col. ${addr.colonia}`)
  const city = [
    addr.municipio ?? addr.city,
    addr.state,
    addr.zip ?? addr.zip_code,
    addr.country ?? 'México',
  ]
    .filter(Boolean)
    .join(', ')
  if (city) lines.push(city)
  if (addr.referencias) lines.push(`Ref: ${addr.referencias}`)
  return lines
}

function addLine(
  doc: jsPDF,
  y: number,
  left: string,
  right: string,
  x = 14,
  width = 184
): number {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(40, 40, 40)
  doc.text(left, x, y)
  doc.text(right, x + width, y, { align: 'right' })
  return y + 6
}

export function buildOrderReceiptPdf(order: ReceiptOrder): ArrayBuffer {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' })
  let y = 18

  // Encabezado
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(20, 20, 20)
  doc.text(LEGAL.tradeName, 14, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(90, 90, 90)
  y += 6
  doc.text(LEGAL.legalName, 14, y)
  y += 5
  doc.text(`Tel: ${LEGAL.phone} · ${LEGAL.email}`, 14, y)

  y += 12
  doc.setDrawColor(200, 200, 200)
  doc.line(14, y, 200, y)
  y += 10

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(20, 20, 20)
  doc.text('RECIBO DE COMPRA', 14, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.text('Este documento no es una factura fiscal (CFDI).', 14, y + 5)

  y += 14
  doc.setFontSize(10)
  doc.setTextColor(50, 50, 50)
  doc.text(orderLabel(order), 14, y)
  y += 6
  doc.text(
    `Fecha: ${formatMexicoDateTime(order.created_at)}`,
    14,
    y
  )
  y += 6
  doc.text(
    `Estatus: ${STATUS_LABELS[order.status] ?? order.status}`,
    14,
    y
  )

  y += 10
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Cliente', 14, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  if (order.customer_name) {
    doc.text(order.customer_name, 14, y)
    y += 5
  }
  if (order.customer_email) {
    doc.text(order.customer_email, 14, y)
    y += 5
  }
  if (order.customer_phone) {
    doc.text(formatMexicanPhone(order.customer_phone), 14, y)
    y += 5
  }

  const addrLines = formatAddress(order.shipping_address)
  if (addrLines.length > 0) {
    y += 3
    doc.setFont('helvetica', 'bold')
    doc.text('Envío a', 14, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    for (const line of addrLines) {
      doc.text(line, 14, y)
      y += 5
    }
  }

  y += 6
  doc.line(14, y, 200, y)
  y += 8

  // Tabla productos
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Producto', 14, y)
  doc.text('Cant.', 130, y)
  doc.text('Importe', 200, y, { align: 'right' })
  y += 4
  doc.line(14, y, 200, y)
  y += 7

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  for (const item of order.items) {
    const lineTotal = item.unit_price * item.quantity
    const nameLines = doc.splitTextToSize(item.name, 108)
    doc.text(nameLines, 14, y)
    const blockH = Math.max(nameLines.length * 4.5, 5)
    doc.text(String(item.quantity), 130, y)
    doc.text(money(lineTotal), 200, y, { align: 'right' })
    y += blockH + 2
    if (y > 240) {
      doc.addPage()
      y = 18
    }
  }

  y += 4
  doc.line(14, y, 200, y)
  y += 8

  y = addLine(doc, y, 'Subtotal', money(Number(order.subtotal)))
  y = addLine(doc, y, 'Envío', money(Number(order.shipping_cost ?? 0)))
  if (Number(order.discount) > 0) {
    const label = order.coupon_code
      ? `Descuento (${order.coupon_code})`
      : 'Descuento'
    y = addLine(doc, y, label, `−${money(Number(order.discount))}`)
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  y = addLine(doc, y, 'TOTAL MXN', money(Number(order.total)))

  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(80, 80, 80)
  if (order.openpay_transaction_id) {
    doc.text('Referencia de pago:', 14, y)
    y += 5
    doc.setFontSize(8)
    doc.text(order.openpay_transaction_id, 14, y)
    y += 8
  }
  if (order.tracking_number) {
    doc.setFontSize(9)
    doc.text(`Guía de envío: ${order.tracking_number}`, 14, y)
    y += 8
  }

  y = Math.max(y + 4, 250)
  doc.setFontSize(8)
  doc.setTextColor(130, 130, 130)
  doc.text(LEGAL.paymentProcessor, 14, y, { maxWidth: 184 })
  y += 8
  doc.text(
    `Generado el ${formatMexicoDateTime(new Date())} · ${LEGAL.website}`,
    14,
    y
  )

  return doc.output('arraybuffer')
}
