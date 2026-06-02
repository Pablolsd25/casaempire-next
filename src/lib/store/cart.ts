'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, Product, AppliedCoupon } from '@/types'
import { SHIPPING_COST } from '@/lib/constants'

function makeCartKey(productId: string, selectedOptions?: Record<string, string>): string {
  if (!selectedOptions || Object.keys(selectedOptions).length === 0) return productId
  const sorted = Object.entries(selectedOptions).sort(([a], [b]) => a.localeCompare(b))
  return `${productId}__${sorted.map(([k, v]) => `${k}:${v}`).join('|')}`
}

interface CartStore {
  items: CartItem[]
  isOpen: boolean
  coupon: AppliedCoupon | null
  shippingCost: number
  addItem: (product: Product, quantity?: number, selectedOptions?: Record<string, string>) => void
  removeItem: (cartKey: string) => void
  updateQuantity: (cartKey: string, quantity: number) => void
  clearCart: () => void
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
  applyCoupon: (coupon: AppliedCoupon) => void
  removeCoupon: () => void
  setShippingCost: (cost: number) => void
  discount: () => number
  shipping: () => number
  total: () => number
  subtotal: () => number
  itemCount: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      coupon: null,
      shippingCost: SHIPPING_COST,

      addItem: (product, quantity = 1, selectedOptions) => {
        const key = makeCartKey(product.id, selectedOptions)
        const items = get().items
        const existing = items.find((i) => i.cartKey === key)

        if (existing) {
          set({
            items: items.map((i) =>
              i.cartKey === key ? { ...i, quantity: i.quantity + quantity } : i
            ),
          })
        } else {
          set({ items: [...items, { product, quantity, cartKey: key, selectedOptions }] })
        }
        set({ isOpen: true })
      },

      removeItem: (cartKey) => {
        set({ items: get().items.filter((i) => i.cartKey !== cartKey) })
      },

      updateQuantity: (cartKey, quantity) => {
        if (quantity <= 0) {
          get().removeItem(cartKey)
          return
        }
        set({
          items: get().items.map((i) =>
            i.cartKey === cartKey ? { ...i, quantity } : i
          ),
        })
      },

      clearCart: () => set({ items: [], coupon: null }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set({ isOpen: !get().isOpen }),

      applyCoupon: (coupon) => set({ coupon }),
      removeCoupon: () => set({ coupon: null }),
      setShippingCost: (cost) => set({ shippingCost: cost }),

      subtotal: () =>
        get().items.reduce(
          (acc, i) => acc + i.product.price * i.quantity,
          0
        ),

      // Descuento recalculado sobre el subtotal actual (se re-valida en el checkout).
      discount: () => {
        const c = get().coupon
        if (!c) return 0
        const sub = get().subtotal()
        if (c.type === 'percentage') return Math.round(sub * (c.value / 100) * 100) / 100
        if (c.type === 'fixed') return Math.min(c.value, sub)
        return 0 // free_shipping no descuenta del subtotal
      },

      shipping: () => {
        const items = get().items
        if (items.length === 0) return 0
        if (get().coupon?.freeShipping) return 0

        const globalCost = get().shippingCost
        const costs = items.map(i => i.product.shipping_cost ?? globalCost)
        return Math.max(...costs)
      },

      total: () => {
        const t = get().subtotal() - get().discount() + get().shipping()
        return t < 0 ? 0 : t
      },

      itemCount: () =>
        get().items.reduce((acc, i) => acc + i.quantity, 0),
    }),
    { name: 'casaempire-cart' }
  )
)
