import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'

export default async function AdminDashboard() {
  // Auth check con cliente normal
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return null

  // Datos con service role (bypasa RLS)
  const supabase = createAdminClient()

  // Estadísticas en paralelo
  const [
    { count: totalProducts },
    { count: totalOrders },
    { data: recentOrders },
    { data: lowStock },
    { data: revenue },
  ] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('orders')
      .select('id, status, total, customer_email, created_at')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase.from('products')
      .select('id, name, stock, price')
      .lte('stock', 5)
      .eq('is_active', true)
      .order('stock', { ascending: true })
      .limit(5),
    supabase.from('orders')
      .select('total')
      .eq('status', 'paid'),
  ])

  const totalRevenue = (revenue ?? []).reduce((s, o) => s + Number(o.total), 0)

  const STATUS_COLORS: Record<string, string> = {
    pending:   'bg-yellow-500/20 text-yellow-400',
    paid:      'bg-green-500/20 text-green-400',
    shipped:   'bg-blue-500/20 text-blue-400',
    delivered: 'bg-accent/20 text-accent',
    cancelled: 'bg-red-500/20 text-red-400',
  }

  const STATUS_LABELS: Record<string, string> = {
    pending:   'Pendiente',
    paid:      'Pagado',
    shipped:   'Enviado',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-white font-display font-bold text-3xl uppercase tracking-wide">Dashboard</h1>
        <p className="text-zinc-400 text-sm mt-1">Panel de control Empire Nutrition</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Productos activos', value: totalProducts ?? 0,  sub: 'en catálogo',       color: 'text-accent',       href: '/admin/productos' },
          { label: 'Total órdenes',     value: totalOrders ?? 0,    sub: 'historial completo', color: 'text-blue-400',     href: '/admin/ordenes' },
          { label: 'Ingresos',          value: `$${totalRevenue.toLocaleString('es-MX')}`, sub: 'órdenes pagadas', color: 'text-green-400', href: '/admin/ordenes' },
          { label: 'Stock bajo',        value: (lowStock ?? []).length, sub: '≤ 5 unidades',   color: 'text-yellow-400',   href: '/admin/productos' },
        ].map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 hover:border-zinc-600 transition-colors"
          >
            <p className="text-zinc-500 text-xs uppercase tracking-wide">{stat.label}</p>
            <p className={`text-3xl font-display font-bold mt-2 ${stat.color}`}>{stat.value}</p>
            <p className="text-zinc-600 text-xs mt-1">{stat.sub}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Órdenes recientes */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-display font-semibold uppercase tracking-wide">Órdenes recientes</h2>
            <Link href="/admin/ordenes" className="text-accent text-xs hover:underline">Ver todas →</Link>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-zinc-800 -mx-5">
            {(recentOrders ?? []).map((order) => (
              <Link
                key={order.id}
                href={`/admin/ordenes/${order.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-zinc-800/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-accent font-mono text-xs">#{order.id.slice(0, 8)}</p>
                  <p className="text-zinc-300 text-sm truncate">{order.customer_email ?? '—'}</p>
                  <p className="text-zinc-500 text-xs">{new Date(order.created_at).toLocaleDateString('es-MX')}</p>
                </div>
                <div className="ml-3 flex flex-col items-end gap-1">
                  <span className="text-white font-medium text-sm">${Number(order.total).toLocaleString('es-MX')}</span>
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[order.status] ?? 'bg-zinc-700 text-zinc-300'}`}>
                    {STATUS_LABELS[order.status] ?? order.status}
                  </span>
                </div>
              </Link>
            ))}
            {(recentOrders ?? []).length === 0 && (
              <p className="px-5 py-8 text-center text-zinc-600 text-sm">No hay órdenes aún</p>
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-500 text-xs border-b border-zinc-800">
                  <th className="text-left pb-2">ID</th>
                  <th className="text-left pb-2">Cliente</th>
                  <th className="text-left pb-2">Total</th>
                  <th className="text-left pb-2">Estado</th>
                  <th className="text-left pb-2">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {(recentOrders ?? []).map((order) => (
                  <tr key={order.id} className="hover:bg-zinc-800/50 transition-colors">
                    <td className="py-2.5">
                      <Link href={`/admin/ordenes/${order.id}`} className="text-accent hover:underline font-mono text-xs">
                        #{order.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="py-2.5 text-zinc-300 truncate max-w-[140px]">
                      {order.customer_email ?? '—'}
                    </td>
                    <td className="py-2.5 text-white font-medium">
                      ${Number(order.total).toLocaleString('es-MX')}
                    </td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[order.status] ?? 'bg-zinc-700 text-zinc-300'}`}>
                        {STATUS_LABELS[order.status] ?? order.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-zinc-500 text-xs">
                      {new Date(order.created_at).toLocaleDateString('es-MX')}
                    </td>
                  </tr>
                ))}
                {(recentOrders ?? []).length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-zinc-600">No hay órdenes aún</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stock bajo */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-display font-semibold uppercase tracking-wide">Stock bajo</h2>
            <span className="text-yellow-400 text-xs">⚠ Alertas</span>
          </div>
          <div className="space-y-3">
            {(lowStock ?? []).map((p) => (
              <Link
                key={p.id}
                href={`/admin/productos/${p.id}`}
                className="flex items-center justify-between hover:bg-zinc-800 rounded px-2 py-1.5 transition-colors"
              >
                <span className="text-zinc-300 text-sm truncate flex-1">{p.name}</span>
                <span className={`ml-2 text-sm font-bold ${p.stock === 0 ? 'text-red-400' : 'text-yellow-400'}`}>
                  {p.stock === 0 ? 'AGOTADO' : `${p.stock} uds`}
                </span>
              </Link>
            ))}
            {(lowStock ?? []).length === 0 && (
              <p className="text-zinc-600 text-sm text-center py-4">Todo el stock en orden</p>
            )}
          </div>
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: '/admin/productos/nuevo',     label: 'Nuevo producto',  icon: '+' },
          { href: '/admin/categorias',           label: 'Categorías',      icon: '🏷' },
          { href: '/admin/blog/nuevo',           label: 'Nuevo artículo',  icon: '✏️' },
          { href: '/admin/configuracion',        label: 'Configuración',   icon: '⚙️' },
        ].map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center hover:border-accent transition-colors group"
          >
            <span className="text-2xl block mb-2">{a.icon}</span>
            <span className="text-zinc-400 group-hover:text-white text-xs transition-colors">{a.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
