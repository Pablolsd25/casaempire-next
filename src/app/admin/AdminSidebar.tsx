'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

const NAV = [
  { href: '/admin',               label: 'Dashboard',    icon: '▦' },
  { href: '/admin/productos',     label: 'Productos',    icon: '📦' },
  { href: '/admin/ordenes',       label: 'Órdenes',      icon: '🛒' },
  { href: '/admin/categorias',    label: 'Categorías',   icon: '🏷' },
  { href: '/admin/blog',          label: 'Blog',         icon: '📝' },
  { href: '/admin/configuracion', label: 'Configuración',icon: '⚙️' },
]

function HamburgerIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export default function AdminSidebar({ userEmail }: { userEmail: string }) {
  const path = usePathname()
  const [open, setOpen] = useState(false)

  // Close drawer on route change
  useEffect(() => { setOpen(false) }, [path])

  const isActive = (href: string) =>
    href === '/admin' ? path === '/admin' : path.startsWith(href)

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-accent font-display font-bold text-lg tracking-wide uppercase">Empire</span>
          <span className="text-zinc-400 text-xs mt-1">Admin</span>
        </Link>
        {/* Close button — mobile only */}
        <button
          onClick={() => setOpen(false)}
          className="md:hidden text-zinc-500 hover:text-white p-1 -mr-1"
          aria-label="Cerrar menú"
        >
          <CloseIcon />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors
              ${isActive(item.href)
                ? 'bg-accent text-black'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-800">
        <p className="text-zinc-500 text-xs truncate mb-3">{userEmail}</p>
        <Link
          href="/"
          className="block text-center text-xs text-zinc-400 hover:text-white border border-zinc-700 rounded py-1.5 transition-colors"
        >
          ← Ver tienda
        </Link>
      </div>
    </>
  )

  return (
    <>
      {/* ── Mobile top bar ─────────────────────────────────── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4">
        <button
          onClick={() => setOpen(true)}
          className="text-zinc-400 hover:text-white p-1"
          aria-label="Abrir menú"
        >
          <HamburgerIcon />
        </button>
        <span className="text-accent font-display font-bold tracking-wide uppercase text-sm">
          Empire Admin
        </span>
        <Link href="/" className="text-zinc-500 hover:text-white text-xs transition-colors">
          Tienda →
        </Link>
      </div>

      {/* ── Mobile overlay backdrop ─────────────────────────── */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Sidebar ────────────────────────────────────────── */}
      {/* Desktop: static. Mobile: fixed slide-in drawer. */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-64 bg-zinc-900 border-r border-zinc-800
          flex flex-col min-h-screen
          transition-transform duration-200 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
