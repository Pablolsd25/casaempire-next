'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

/* ── SVG Icons ─────────────────────────────────────────────── */
function IconGrid() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}
function IconBox() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" rx="1" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </svg>
  )
}
function IconCart() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  )
}
function IconTag() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  )
}
function IconPen() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  )
}
function IconSettings() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  )
}
function IconZap() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}
function IconStore() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}
function IconTicket() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9a2 2 0 012-2h14a2 2 0 012 2 2 2 0 000 4 2 2 0 01-2 2H5a2 2 0 01-2-2 2 2 0 000-4z" />
      <line x1="9" y1="7" x2="9" y2="17" strokeDasharray="2 2" />
    </svg>
  )
}
function IconMedia() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

/* ── Nav sections ──────────────────────────────────────────── */
const NAV_SECTIONS = [
  {
    label: 'Principal',
    items: [
      { href: '/admin',            label: 'Dashboard',  Icon: IconGrid },
      { href: '/admin/productos',  label: 'Productos',  Icon: IconBox  },
      { href: '/admin/ordenes',    label: 'Órdenes',    Icon: IconCart },
      { href: '/admin/categorias', label: 'Categorías', Icon: IconTag  },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { href: '/admin/cupones', label: 'Cupones', Icon: IconTicket },
      { href: '/admin/media',   label: 'Galería', Icon: IconMedia  },
    ],
  },
  {
    label: 'Pagos',
    items: [
      { href: '/admin/webhooks', label: 'Webhooks', Icon: IconZap },
    ],
  },
  {
    label: 'Contenido',
    items: [
      { href: '/admin/blog',          label: 'Blog',          Icon: IconPen      },
      { href: '/admin/configuracion', label: 'Configuración', Icon: IconSettings },
    ],
  },
]

/* ── Hamburger / Close ─────────────────────────────────────── */
function HamburgerIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6"  x2="21" y2="6"  />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}
function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6"  x2="6"  y2="18" />
      <line x1="6"  y1="6"  x2="18" y2="18" />
    </svg>
  )
}

/* ── Sidebar component ─────────────────────────────────────── */
export default function AdminSidebar({ userEmail }: { userEmail: string }) {
  const path = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => { setOpen(false) }, [path])

  const isActive = (href: string) =>
    href === '/admin' ? path === '/admin' : path.startsWith(href)

  // Initials avatar from email
  const initials = userEmail.slice(0, 2).toUpperCase()

  const sidebarContent = (
    <div className="flex flex-col h-full">

      {/* ── Logo ────────────────────────────────── */}
      <div className="px-5 py-4 border-b border-zinc-800/80 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-accent flex items-center justify-center flex-shrink-0">
            <span className="text-black text-xs font-display font-black tracking-tight">E</span>
          </div>
          <div className="leading-none">
            <p className="text-white font-display font-bold text-sm uppercase tracking-wider">Empire</p>
            <p className="text-zinc-500 text-[10px] uppercase tracking-widest mt-0.5">Admin</p>
          </div>
        </Link>
        <button
          onClick={() => setOpen(false)}
          className="md:hidden text-zinc-500 hover:text-white p-1 -mr-1 transition-colors"
          aria-label="Cerrar menú"
        >
          <CloseIcon />
        </button>
      </div>

      {/* ── Nav ─────────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="text-zinc-600 text-[10px] uppercase tracking-widest font-medium px-3 mb-2 mt-3 first:mt-0">
              {section.label}
            </p>
            {section.items.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                  ${isActive(href)
                    ? 'bg-accent text-black shadow-[0_0_16px_rgba(35,243,14,0.25)]'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/70'
                  }`}
              >
                <span className={`flex-shrink-0 ${isActive(href) ? 'text-black' : 'text-zinc-500'} transition-colors`}>
                  <Icon />
                </span>
                <span>{label}</span>
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {/* ── Footer / User ───────────────────────── */}
      <div className="px-3 py-4 border-t border-zinc-800/80 space-y-3">
        {/* User info */}
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
            <span className="text-zinc-300 text-xs font-bold">{initials}</span>
          </div>
          <p className="text-zinc-400 text-xs truncate flex-1">{userEmail}</p>
        </div>
        {/* Back to store */}
        <Link
          href="/"
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-zinc-500
            hover:text-white hover:bg-zinc-800/70 transition-colors"
        >
          <IconStore />
          <span>Ver tienda</span>
        </Link>
      </div>
    </div>
  )

  return (
    <>
      {/* ── Mobile top bar ─────────────────────── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-zinc-900/95 backdrop-blur border-b border-zinc-800 flex items-center justify-between px-4">
        <button
          onClick={() => setOpen(true)}
          className="text-zinc-400 hover:text-white p-1 transition-colors"
          aria-label="Abrir menú"
        >
          <HamburgerIcon />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-accent flex items-center justify-center">
            <span className="text-black text-[10px] font-black">E</span>
          </div>
          <span className="text-white font-display font-bold tracking-wide uppercase text-sm">Empire Admin</span>
        </div>
        <Link href="/" className="text-zinc-500 hover:text-white text-xs transition-colors">
          Tienda →
        </Link>
      </div>

      {/* ── Mobile overlay ─────────────────────── */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/75 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Sidebar ────────────────────────────── */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-60 bg-zinc-900 border-r border-zinc-800/80
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
