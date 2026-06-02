"use client";

import Link from "next/link";
import Image from "next/image";
import { useCartStore } from "@/lib/store/cart";

export default function CartDrawer() {
  const {
    items,
    isOpen,
    closeCart,
    removeItem,
    updateQuantity,
    subtotal,
    total,
  } = useCartStore();
  const sub = subtotal();
  const tot = total();

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 transition-opacity"
          onClick={closeCart}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-zinc-900 z-50 flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h2 className="text-white font-semibold text-lg">Tu carrito</h2>
          <button
            onClick={closeCart}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <svg
                className="w-16 h-16 text-zinc-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
              <p className="text-zinc-400 text-sm">Tu carrito está vacío</p>
              <button
                onClick={closeCart}
                className="text-white underline text-sm"
              >
                Seguir comprando
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.product.id} className="flex gap-3">
                <div className="relative w-16 h-16 rounded-md overflow-hidden bg-zinc-800 flex-shrink-0">
                  {item.product.images[0] ? (
                    <Image
                      src={item.product.images[0]}
                      alt={item.product.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600">
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {item.product.name}
                  </p>
                  <p className="text-zinc-400 text-sm">
                    ${item.product.price.toFixed(2)} MXN
                  </p>
                  {item.selectedOptions &&
                    Object.keys(item.selectedOptions).length > 0 && (
                      <p className="text-zinc-500 text-xs mt-0.5">
                        {Object.entries(item.selectedOptions)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(" · ")}
                      </p>
                    )}
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={() =>
                        updateQuantity(item.cartKey, item.quantity - 1)
                      }
                      className="w-6 h-6 rounded border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 flex items-center justify-center text-sm"
                    >
                      −
                    </button>
                    <span className="text-white text-sm w-6 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        updateQuantity(item.cartKey, item.quantity + 1)
                      }
                      className="w-6 h-6 rounded border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 flex items-center justify-center text-sm"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex flex-col items-end justify-between">
                  <button
                    onClick={() => removeItem(item.cartKey)}
                    className="text-zinc-600 hover:text-red-500 transition-colors"
                    aria-label="Eliminar"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                  <span className="text-white text-sm font-medium">
                    ${(item.product.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-5 border-t border-zinc-800 space-y-3">
            <div className="flex justify-between text-sm text-zinc-400">
              <span>Subtotal</span>
              <span>${sub.toFixed(2)} MXN</span>
            </div>
            <div className="flex justify-between text-sm text-zinc-400">
              <span>Envío</span>
              <span>$99.00 MXN</span>
            </div>
            <div className="flex justify-between text-white font-semibold text-base border-t border-zinc-800 pt-3">
              <span>Total</span>
              <span>${tot.toFixed(2)} MXN</span>
            </div>
            <Link
              href="/checkout"
              onClick={closeCart}
              className="block w-full bg-white text-black text-center font-semibold py-3 rounded-lg hover:bg-zinc-200 transition-colors"
            >
              Finalizar compra
            </Link>
            <button
              onClick={closeCart}
              className="block w-full text-zinc-400 text-center text-sm hover:text-white transition-colors"
            >
              Seguir comprando
            </button>
          </div>
        )}
      </div>
    </>
  );
}
