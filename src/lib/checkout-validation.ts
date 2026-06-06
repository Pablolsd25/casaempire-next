import type { createAdminClient } from '@/lib/supabase/admin'

type Supabase = ReturnType<typeof createAdminClient>

export const MAX_ITEM_QUANTITY = 99

export type CheckoutItemInput = {
  productId: string
  name?: string
  quantity: number
  price?: number
}

export type ValidatedCheckoutItem = {
  productId: string
  name: string
  quantity: number
  price: number
}

type ProductRow = {
  id: string
  name: string
  price: number
  is_active: boolean
  stock: number
  manage_stock: boolean
}

export type ValidateCheckoutItemsResult =
  | { ok: true; items: ValidatedCheckoutItem[]; subtotal: number }
  | { ok: false; error: string }

export function validateItemQuantities(items: CheckoutItemInput[]): string | null {
  if (!items.length) return 'El carrito está vacío.'

  for (const item of items) {
    if (!item.productId || typeof item.productId !== 'string') {
      return 'Producto inválido en el carrito.'
    }
    const qty = Number(item.quantity)
    if (!Number.isFinite(qty) || !Number.isInteger(qty) || qty < 1) {
      return 'La cantidad debe ser un número entero mayor a 0.'
    }
    if (qty > MAX_ITEM_QUANTITY) {
      return `La cantidad máxima por producto es ${MAX_ITEM_QUANTITY}.`
    }
  }

  return null
}

export async function validateCheckoutItems(
  supabase: Supabase,
  items: CheckoutItemInput[]
): Promise<ValidateCheckoutItemsResult> {
  const qtyError = validateItemQuantities(items)
  if (qtyError) return { ok: false, error: qtyError }

  const productIds = [...new Set(items.map((i) => i.productId))]
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, price, is_active, stock, manage_stock')
    .in('id', productIds)

  if (error) return { ok: false, error: 'No se pudieron verificar los productos.' }

  const productMap = new Map((products ?? []).map((p: ProductRow) => [p.id, p]))

  const validated: ValidatedCheckoutItem[] = []

  for (const item of items) {
    const product = productMap.get(item.productId)
    if (!product) {
      return { ok: false, error: 'Uno o más productos ya no están disponibles.' }
    }
    if (!product.is_active) {
      return { ok: false, error: `"${product.name}" ya no está disponible.` }
    }
    if (product.manage_stock && product.stock < item.quantity) {
      return {
        ok: false,
        error:
          product.stock <= 0
            ? `"${product.name}" está agotado.`
            : `"${product.name}" solo tiene ${product.stock} unidad(es) disponible(s).`,
      }
    }

    validated.push({
      productId: product.id,
      name:      product.name,
      quantity:  item.quantity,
      price:     Number(product.price),
    })
  }

  const subtotal = validated.reduce((acc, i) => acc + i.price * i.quantity, 0)
  if (subtotal <= 0) {
    return { ok: false, error: 'El total del pedido no es válido.' }
  }

  return { ok: true, items: validated, subtotal }
}

/** Rechaza si el monto del cliente difiere del total servidor (anti-tampering). */
export function validateClientAmount(
  clientAmount: number,
  serverTotal: number,
  tolerance = 0.02
): string | null {
  const client = Number(clientAmount)
  const server = Number(serverTotal)
  if (!Number.isFinite(client) || client <= 0) {
    return 'Monto de pago inválido.'
  }
  if (Math.abs(client - server) > tolerance) {
    return 'El total del pedido cambió. Recarga la página e intenta de nuevo.'
  }
  return null
}
