import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";

export default async function AdminDashboard() {
  const auth = await createClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return null;

  const supabase = createAdminClient();

  const [
    { count: totalProducts },
    { count: totalOrders },
    { data: recentOrders },
    { data: lowStock },
    { data: revenue },
  ] = await Promise.all([
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    supabase.from("orders").select("*", { count: "exact", head: true }),
    supabase
      .from("orders")
      .select(
        "id, status, total, customer_email, customer_name, wix_order_number, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("products")
      .select("id, name, stock, price")
      .eq("manage_stock", true)
      .lte("stock", 5)
      .eq("is_active", true)
      .order("stock", { ascending: true })
      .limit(5),
    supabase.from("orders").select("total").eq("status", "paid"),
  ]);

  const totalRevenue = (revenue ?? []).reduce((s, o) => s + Number(o.total), 0);

  const STATUS_COLORS: Record<string, string> = {
    pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
    paid: "bg-green-500/15 text-green-400 border-green-500/20",
    shipped: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    delivered: "bg-accent/15 text-accent border-accent/20",
    cancelled: "bg-red-500/15 text-red-400 border-red-500/20",
  };

  const STATUS_LABELS: Record<string, string> = {
    pending: "Pendiente",
    paid: "Pagado",
    shipped: "Enviado",
    delivered: "Entregado",
    cancelled: "Cancelado",
  };

  return (
    <div className="space-y-8">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-white font-display font-bold text-3xl uppercase tracking-wide">
            Dashboard
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            Panel de control Empire Nutrition
          </p>
        </div>
        <Link
          href="/admin/productos/nuevo"
          className="btn-accent px-4 py-2 rounded-lg text-sm font-display font-bold uppercase tracking-wider flex items-center gap-2"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nuevo producto
        </Link>
      </div>

      {/* ── Stat cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Productos */}
        <Link
          href="/admin/productos"
          className="group bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-all hover:shadow-[0_0_20px_rgba(35,243,14,0.06)]"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent flex-shrink-0">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="21 8 21 21 3 21 3 8" />
                <rect x="1" y="3" width="22" height="5" rx="1" />
                <line x1="10" y1="12" x2="14" y2="12" />
              </svg>
            </div>
            <svg
              width="14"
              height="14"
              className="text-zinc-700 group-hover:text-zinc-500 transition-colors"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
          <p className="text-accent font-display font-bold text-3xl leading-none">
            {totalProducts ?? 0}
          </p>
          <p className="text-white font-medium text-sm mt-1.5">Productos</p>
          <p className="text-zinc-600 text-xs mt-0.5">activos en catálogo</p>
        </Link>

        {/* Órdenes */}
        <Link
          href="/admin/ordenes"
          className="group bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.06)]"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
            </div>
            <svg
              width="14"
              height="14"
              className="text-zinc-700 group-hover:text-zinc-500 transition-colors"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
          <p className="text-blue-400 font-display font-bold text-3xl leading-none">
            {totalOrders ?? 0}
          </p>
          <p className="text-white font-medium text-sm mt-1.5">Órdenes</p>
          <p className="text-zinc-600 text-xs mt-0.5">historial completo</p>
        </Link>

        {/* Ingresos */}
        <Link
          href="/admin/ordenes?status=paid"
          className="group bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-all hover:shadow-[0_0_20px_rgba(34,197,94,0.06)]"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-9 h-9 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 flex-shrink-0">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
            </div>
            <svg
              width="14"
              height="14"
              className="text-zinc-700 group-hover:text-zinc-500 transition-colors"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
          <p className="text-green-400 font-display font-bold text-2xl leading-none">
            ${totalRevenue.toLocaleString("es-MX")}
          </p>
          <p className="text-white font-medium text-sm mt-1.5">Ingresos</p>
          <p className="text-zinc-600 text-xs mt-0.5">órdenes pagadas</p>
        </Link>

        {/* Stock bajo */}
        <Link
          href="/admin/productos"
          className="group bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-all hover:shadow-[0_0_20px_rgba(234,179,8,0.06)]"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-9 h-9 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400 flex-shrink-0">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <svg
              width="14"
              height="14"
              className="text-zinc-700 group-hover:text-zinc-500 transition-colors"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
          <p className="text-yellow-400 font-display font-bold text-3xl leading-none">
            {(lowStock ?? []).length}
          </p>
          <p className="text-white font-medium text-sm mt-1.5">Stock bajo</p>
          <p className="text-zinc-600 text-xs mt-0.5">≤ 5 unidades</p>
        </Link>
      </div>

      {/* ── Main content row ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Órdenes recientes */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
            <h2 className="text-white font-display font-semibold uppercase tracking-wide text-sm">
              Órdenes recientes
            </h2>
            <Link
              href="/admin/ordenes"
              className="text-accent text-xs hover:underline flex items-center gap-1"
            >
              Ver todas
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-zinc-800">
            {(recentOrders ?? []).map((order) => (
              <Link
                key={order.id}
                href={`/admin/ordenes/${order.id}`}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-zinc-800/40 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-accent font-mono text-xs">
                    {order.wix_order_number
                      ? `#${order.wix_order_number}`
                      : `#${order.id.slice(0, 8)}`}
                  </p>
                  <p className="text-zinc-300 text-sm truncate">
                    {order.customer_name ?? order.customer_email ?? "—"}
                  </p>
                  <p className="text-zinc-600 text-xs mt-0.5">
                    {new Date(order.created_at).toLocaleDateString("es-MX")}
                  </p>
                </div>
                <div className="ml-3 flex flex-col items-end gap-1.5">
                  <span className="text-white font-semibold text-sm">
                    ${Number(order.total).toLocaleString("es-MX")}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${STATUS_COLORS[order.status] ?? "bg-zinc-700 text-zinc-300 border-zinc-700"}`}
                  >
                    {STATUS_LABELS[order.status] ?? order.status}
                  </span>
                </div>
              </Link>
            ))}
            {(recentOrders ?? []).length === 0 && (
              <p className="px-5 py-10 text-center text-zinc-600 text-sm">
                No hay órdenes aún
              </p>
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-500 text-xs border-b border-zinc-800 bg-zinc-950/50">
                  <th className="text-left px-5 py-3 font-medium">ID</th>
                  <th className="text-left px-5 py-3 font-medium">Cliente</th>
                  <th className="text-right px-5 py-3 font-medium">Total</th>
                  <th className="text-center px-5 py-3 font-medium">Estado</th>
                  <th className="text-left px-5 py-3 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {(recentOrders ?? []).map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/ordenes/${order.id}`}
                        className="text-accent hover:underline font-mono text-xs"
                      >
                        {order.wix_order_number
                          ? `#${order.wix_order_number}`
                          : `#${order.id.slice(0, 8)}`}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-zinc-300 truncate max-w-[140px]">
                      {order.customer_name ?? order.customer_email ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-right text-white font-semibold">
                      ${Number(order.total).toLocaleString("es-MX")}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${STATUS_COLORS[order.status] ?? "bg-zinc-700 text-zinc-300 border-zinc-700"}`}
                      >
                        {STATUS_LABELS[order.status] ?? order.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-zinc-500 text-xs">
                      {new Date(order.created_at).toLocaleDateString("es-MX", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
                {(recentOrders ?? []).length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-10 text-center text-zinc-600"
                    >
                      No hay órdenes aún
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stock bajo */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
            <h2 className="text-white font-display font-semibold uppercase tracking-wide text-sm">
              Stock bajo
            </h2>
            <span className="text-[11px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-full px-2 py-0.5">
              Alerta
            </span>
          </div>
          <div className="divide-y divide-zinc-800">
            {(lowStock ?? []).map((p) => (
              <Link
                key={p.id}
                href={`/admin/productos/${p.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-zinc-800/30 transition-colors"
              >
                <span className="text-zinc-300 text-sm truncate flex-1 mr-3">
                  {p.name}
                </span>
                <span
                  className={`text-sm font-bold flex-shrink-0 ${p.stock === 0 ? "text-red-400" : "text-yellow-400"}`}
                >
                  {p.stock === 0 ? "AGOTADO" : `${p.stock} uds`}
                </span>
              </Link>
            ))}
            {(lowStock ?? []).length === 0 && (
              <p className="px-5 py-8 text-center text-zinc-600 text-sm">
                ✓ Todo en orden
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Quick actions ──────────────────────────────────── */}
      <div>
        <h2 className="text-zinc-500 text-xs uppercase tracking-widest font-medium mb-3">
          Accesos rápidos
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              href: "/admin/productos/nuevo",
              label: "Nuevo producto",
              icon: (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="21 8 21 21 3 21 3 8" />
                  <rect x="1" y="3" width="22" height="5" rx="1" />
                  <line x1="10" y1="12" x2="14" y2="12" />
                </svg>
              ),
            },
            {
              href: "/admin/cupones",
              label: "Cupones",
              icon: (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 9a2 2 0 012-2h14a2 2 0 012 2 2 2 0 000 4 2 2 0 01-2 2H5a2 2 0 01-2-2 2 2 0 000-4z" />
                  <line x1="9" y1="7" x2="9" y2="17" strokeDasharray="2 2" />
                </svg>
              ),
            },
            {
              href: "/admin/categorias",
              label: "Categorías",
              icon: (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
                  <line x1="7" y1="7" x2="7.01" y2="7" />
                </svg>
              ),
            },
            {
              href: "/admin/blog/nuevo",
              label: "Nuevo artículo",
              icon: (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              ),
            },
            {
              href: "/admin/configuracion",
              label: "Configuración",
              icon: (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                </svg>
              ),
            },
          ].map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center hover:border-zinc-700 hover:bg-zinc-800/50 transition-all group"
            >
              <span className="text-zinc-500 group-hover:text-accent transition-colors flex justify-center mb-2.5">
                {a.icon}
              </span>
              <span className="text-zinc-400 group-hover:text-white text-xs transition-colors">
                {a.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
