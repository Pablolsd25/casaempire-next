'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, Product, AppliedCoupon } from '@/types'
import { SHIPPING_COST } from '@/lib/constants'

interface CartStore {
  items: CartItem[]
  isOpen: boolean
  coupon: AppliedCoupon | null
  addItem: (product: Product, quantity?: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
  applyCoupon: (coupon: AppliedCoupon) => void
  removeCoupon: () => void
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

      addItem: (product, quantity = 1) => {
        const items = get().items
        const existing = items.find((i) => i.product.id === product.id)

        if (existing) {
          set({
            items: items.map((i) =>
              i.product.id === product.id
                ? { ...i, quantity: i.quantity + quantity }
                : i
            ),
          })
        } else {
          set({ items: [...items, { product, quantity }] })
        }
        set({ isOpen: true })
      },

      removeItem: (productId) => {
        set({ items: get().items.filter((i) => i.product.id !== productId) })
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId)
          return
        }
        set({
          items: get().items.map((i) =>
            i.product.id === productId ? { ...i, quantity } : i
          ),
        })
      },

      clearCart: () => set({ items: [], coupon: null }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set({ isOpen: !get().isOpen }),

      applyCoupon: (coupon) => set({ coupon }),
      removeCoupon: () => set({ coupon: null }),

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
        if (c.type === 'fixed')      return Math.min(c.value, sub)
        return 0 // free_shipping no descuenta del subtotal
      },

      shipping: () => {
        if (get().items.length === 0) return 0
        return get().coupon?.freeShipping ? 0 : SHIPPING_COST
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
