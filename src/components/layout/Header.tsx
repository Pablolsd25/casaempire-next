'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useCartStore } from '@/lib/store/cart'
import CartDrawer from './CartDrawer'

const navLinks = [
  { href: '/tienda',            label: 'Tienda' },
  { href: '/categoria/mujeres', label: "Women's Nutrition" },
  { href: '/categoria/hombres', label: "Men's Nutrition" },
  { href: '/ofertas',           label: 'Nuestras Ofertas' },
  { href: '/envios',            label: 'Envíos Seguros' },
  { href: '/blog',              label: 'Blog' },
  { href: '/contacto',          label: 'Contacto' },
]

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const { toggleCart, itemCount } = useCartStore()
  const count = itemCount()

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then((data: { isAdmin?: boolean }) => setIsAdmin(!!data.isAdmin))
      .catch(() => setIsAdmin(false))
  }, [])

  return (
    <>
      <header className="sticky top-0 z-40 bg-black border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link href="/" aria-label="Empire Nutrition - Inicio" className="flex items-center">
              <Image
                src="/logo.jpg"
                alt="Empire Nutrition"
                width={120}
                height={40}
                className="h-10 w-auto object-contain"
                priority
              />
            </Link>

            {/* Nav desktop */}
            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-zinc-400 hover:text-accent text-sm font-medium tracking-wide transition-colors font-display uppercase"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Acciones */}
            <div className="flex items-center gap-4">
              {/* Buscar */}
              <Link
                href="/buscar"
                className="text-zinc-400 hover:text-accent transition-colors"
                aria-label="Buscar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </Link>

              {/* Admin — solo si es admin real */}
              {isAdmin && (
                <Link
                  href="/admin"
                  className="text-accent hover:text-white text-xs font-display font-bold uppercase tracking-widest border border-accent/40 hover:border-accent px-2 py-0.5 rounded transition-all"
                >
                  Admin
                </Link>
              )}

              {/* Mis pedidos (sin login) */}
              <Link
                href="/mis-pedidos"
                className="text-zinc-400 hover:text-accent text-sm transition-colors hidden sm:inline"
              >
                Mi pedido
              </Link>

              {/* Carrito */}
              <button
                onClick={toggleCart}
                className="relative text-zinc-400 hover:text-accent transition-colors"
                aria-label="Carrito"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                {mounted && count > 0 && (
                  <span className="absolute -top-2 -right-2 bg-accent text-black text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {count}
                  </span>
                )}
              </button>

              {/* Hamburguesa móvil */}
              <button
                className="md:hidden text-zinc-400 hover:text-accent"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Menú"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {menuOpen
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12" />
                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 6h16M4 12h16M4 18h16" />
                  }
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Menú móvil */}
        {menuOpen && (
          <div className="md:hidden bg-zinc-950 border-t border-zinc-800 px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block text-zinc-300 hover:text-accent text-sm font-display uppercase tracking-wide py-2 border-b border-zinc-800 last:border-0 transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/mis-pedidos"
              className="block text-zinc-300 text-sm font-display uppercase tracking-wide py-2"
              onClick={() => setMenuOpen(false)}
            >
              Mi pedido
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className="block text-accent text-sm font-display uppercase tracking-wide py-2"
                onClick={() => setMenuOpen(false)}
              >
                Admin
              </Link>
            )}
          </div>
        )}
      </header>

      <CartDrawer />
    </>
  )
}
