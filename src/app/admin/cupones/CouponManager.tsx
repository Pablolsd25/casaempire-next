"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Pencil, Trash2 } from "lucide-react";
import type { Coupon, CouponType } from "@/types";

const TYPE_LABEL: Record<CouponType, string> = {
  percentage: "Porcentaje",
  fixed: "Monto fijo",
  free_shipping: "Envío gratis",
};

function emptyForm() {
  return {
    id: "",
    code: "",
    type: "percentage" as CouponType,
    value: "",
    min_purchase: "",
    max_uses: "",
    expires_at: "",
    is_active: true,
  };
}

function describeValue(c: Coupon): string {
  if (c.type === "percentage") return `${c.value}% de descuento`;
  if (c.type === "fixed")
    return `$${Number(c.value).toLocaleString("es-MX")} de descuento`;
  return "Envío gratis";
}

export default function CouponManager({ initial }: { initial: Coupon[] }) {
  const router = useRouter();
  const [coupons, setCoupons] = useState<Coupon[]>(initial);
  const [form, setForm] = useState(emptyForm());
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isEdit = !!form.id;

  const openNew = () => {
    setForm(emptyForm());
    setError("");
    setShowForm(true);
  };
  const openEdit = (c: Coupon) => {
    setForm({
      id: c.id,
      code: c.code,
      type: c.type,
      value: c.type === "free_shipping" ? "" : String(c.value),
      min_purchase: c.min_purchase ? String(c.min_purchase) : "",
      max_uses: c.max_uses != null ? String(c.max_uses) : "",
      expires_at: c.expires_at ? c.expires_at.slice(0, 10) : "",
      is_active: c.is_active,
    });
    setError("");
    setShowForm(true);
  };

  const refresh = async () => {
    const res = await fetch("/api/admin/coupons");
    if (res.ok) setCoupons(await res.json());
    router.refresh();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const body = {
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value: form.value,
      min_purchase: form.min_purchase,
      max_uses: form.max_uses,
      expires_at: form.expires_at || null,
      is_active: form.is_active,
    };

    const url = isEdit ? `/api/admin/coupons/${form.id}` : "/api/admin/coupons";
    const method = isEdit ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Error al guardar el cupón.");
      setLoading(false);
      return;
    }
    setShowForm(false);
    setLoading(false);
    await refresh();
  };

  const handleDelete = async (c: Coupon) => {
    if (!confirm(`¿Eliminar el cupón "${c.code}"?`)) return;
    await fetch(`/api/admin/coupons/${c.id}`, { method: "DELETE" });
    await refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={openNew}
          className="btn-accent px-5 py-2.5 rounded text-sm flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" /> Nuevo cupón
        </button>
      </div>

      {/* Lista */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <div className="hidden md:grid grid-cols-[1.2fr_1.4fr_1fr_0.8fr_1fr_auto] gap-3 px-4 py-3 bg-zinc-950 text-zinc-500 text-xs border-b border-zinc-800">
          <span>Código</span>
          <span>Descuento</span>
          <span>Compra mín.</span>
          <span>Usos</span>
          <span>Estado</span>
          <span className="text-right">Acciones</span>
        </div>
        <div className="divide-y divide-zinc-800">
          {coupons.map((c) => {
            const expired =
              c.expires_at && new Date(c.expires_at) <= new Date();
            const maxedOut = c.max_uses != null && c.used_count >= c.max_uses;
            const active = c.is_active && !expired && !maxedOut;
            return (
              <div
                key={c.id}
                className="md:grid md:grid-cols-[1.2fr_1.4fr_1fr_0.8fr_1fr_auto] gap-3 px-4 py-3 items-center flex flex-wrap"
              >
                <div>
                  <span className="font-mono font-bold text-accent text-sm">
                    {c.code}
                  </span>
                  {c.expires_at && (
                    <p
                      className={`text-xs mt-0.5 ${expired ? "text-red-400" : "text-zinc-600"}`}
                    >
                      {expired ? "Expiró" : "Vence"}{" "}
                      {new Date(c.expires_at).toLocaleDateString("es-MX")}
                    </p>
                  )}
                </div>
                <span className="text-zinc-300 text-sm">
                  {describeValue(c)}
                </span>
                <span className="text-zinc-400 text-sm">
                  {c.min_purchase
                    ? `$${Number(c.min_purchase).toLocaleString("es-MX")}`
                    : "—"}
                </span>
                <span className="text-zinc-400 text-sm">
                  {c.used_count}
                  {c.max_uses != null ? ` / ${c.max_uses}` : ""}
                </span>
                <span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${active ? "bg-green-500/20 text-green-400" : "bg-zinc-700 text-zinc-400"}`}
                  >
                    {active
                      ? "Activo"
                      : c.is_active
                        ? expired
                          ? "Expirado"
                          : "Agotado"
                        : "Inactivo"}
                  </span>
                </span>
                <div className="flex items-center justify-end gap-1 ml-auto">
                  <button
                    onClick={() => openEdit(c)}
                    title="Editar"
                    className="text-zinc-400 hover:text-accent p-1.5 rounded hover:bg-zinc-800 transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(c)}
                    title="Eliminar"
                    className="text-zinc-400 hover:text-red-400 p-1.5 rounded hover:bg-zinc-800 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
          {coupons.length === 0 && (
            <p className="px-5 py-12 text-center text-zinc-600 text-sm">
              Aún no hay cupones. Crea el primero.
            </p>
          )}
        </div>
      </div>

      {/* Modal crear/editar */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] p-4"
          onClick={() => setShowForm(false)}
        >
          <form
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-6 max-w-md w-full space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold text-lg">
                {isEdit ? "Editar cupón" : "Nuevo cupón"}
              </h3>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-full hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded p-2.5 text-sm">
                {error}
              </div>
            )}

            {/* Código */}
            <div>
              <label className="block text-zinc-400 text-xs uppercase tracking-wide mb-1">
                Código
              </label>
              <input
                value={form.code}
                onChange={(e) =>
                  setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))
                }
                required
                placeholder="VERANO20"
                className="w-full bg-zinc-950 border border-zinc-700 text-white rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-accent"
              />
            </div>

            {/* Tipo */}
            <div>
              <label className="block text-zinc-400 text-xs uppercase tracking-wide mb-1">
                Tipo de descuento
              </label>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm((p) => ({ ...p, type: e.target.value as CouponType }))
                }
                className="w-full bg-zinc-950 border border-zinc-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent"
              >
                <option value="percentage">Porcentaje (%)</option>
                <option value="fixed">Monto fijo ($)</option>
                <option value="free_shipping">Envío gratis</option>
              </select>
            </div>

            {/* Valor (no aplica a free_shipping) */}
            {form.type !== "free_shipping" && (
              <div>
                <label className="block text-zinc-400 text-xs uppercase tracking-wide mb-1">
                  {form.type === "percentage"
                    ? "Porcentaje de descuento"
                    : "Monto de descuento"}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">
                    {form.type === "percentage" ? "%" : "$"}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={form.type === "percentage" ? "100" : undefined}
                    value={form.value}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, value: e.target.value }))
                    }
                    required
                    className="w-full bg-zinc-950 border border-zinc-700 text-white rounded-lg pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {/* Compra mínima */}
              <div>
                <label className="block text-zinc-400 text-xs uppercase tracking-wide mb-1">
                  Compra mínima
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.min_purchase}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, min_purchase: e.target.value }))
                    }
                    placeholder="0"
                    className="w-full bg-zinc-950 border border-zinc-700 text-white rounded-lg pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
              {/* Límite de usos */}
              <div>
                <label className="block text-zinc-400 text-xs uppercase tracking-wide mb-1">
                  Límite de usos
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.max_uses}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, max_uses: e.target.value }))
                  }
                  placeholder="∞"
                  className="w-full bg-zinc-950 border border-zinc-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            {/* Expiración */}
            <div>
              <label className="block text-zinc-400 text-xs uppercase tracking-wide mb-1">
                Fecha de expiración (opcional)
              </label>
              <input
                type="date"
                value={form.expires_at}
                onChange={(e) =>
                  setForm((p) => ({ ...p, expires_at: e.target.value }))
                }
                className="w-full bg-zinc-950 border border-zinc-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent"
              />
            </div>

            {/* Activo */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) =>
                  setForm((p) => ({ ...p, is_active: e.target.checked }))
                }
                className="w-4 h-4 accent-accent"
              />
              <span className="text-zinc-300 text-sm">Cupón activo</span>
            </label>

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="btn-accent px-5 py-2.5 rounded text-sm disabled:opacity-50 flex-1"
              >
                {loading
                  ? "Guardando..."
                  : isEdit
                    ? "Guardar cambios"
                    : "Crear cupón"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 rounded text-sm border border-zinc-700 text-zinc-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
