'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Trash2, UserPlus } from 'lucide-react'

type AdminRow = {
  email: string
  isSelf: boolean
  userId: string | null
}

export default function AdminUsersManager() {
  const [admins, setAdmins] = useState<AdminRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [adding, setAdding] = useState(false)
  const [addSuccess, setAddSuccess] = useState(false)

  const [deletingEmail, setDeletingEmail] = useState<string | null>(null)

  const loadAdmins = useCallback(async () => {
    setError('')
    try {
      const res = await fetch('/api/admin/users')
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'No se pudo cargar la lista.')
      }
      const d = await res.json()
      setAdmins(d.admins ?? [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error de conexión.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAdmins()
  }, [loadAdmins])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setAddSuccess(false)
    setAdding(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Error al crear usuario.')

      setEmail('')
      setPassword('')
      setAddSuccess(true)
      setTimeout(() => setAddSuccess(false), 3000)
      await loadAdmins()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error de conexión.')
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (row: AdminRow) => {
    if (row.isSelf) return
    if (
      !confirm(
        `¿Eliminar a ${row.email}?\nPerderá acceso al panel y se borrará su cuenta de acceso.`
      )
    ) {
      return
    }

    setDeletingEmail(row.email)
    setError('')
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: row.email }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Error al eliminar.')

      await loadAdmins()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error de conexión.')
    } finally {
      setDeletingEmail(null)
    }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Agregar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-accent" />
          <h2 className="text-white font-semibold text-lg">Agregar administrador</h2>
        </div>
        <p className="text-zinc-500 text-sm">
          Crea una cuenta con acceso al panel. El usuario podrá iniciar sesión en{' '}
          <span className="text-zinc-400">/login</span> con el correo y contraseña que definas.
        </p>

        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-zinc-400 text-xs uppercase tracking-wide mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm
                focus:outline-none focus:border-accent"
              placeholder="admin@ejemplo.com"
            />
          </div>
          <div>
            <label className="block text-zinc-400 text-xs uppercase tracking-wide mb-1">
              Contraseña
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm
                focus:outline-none focus:border-accent"
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="submit"
              disabled={adding}
              className="btn-accent px-5 py-2 rounded-lg text-sm disabled:opacity-50"
            >
              {adding ? 'Creando...' : 'Agregar usuario'}
            </button>
            {addSuccess && <span className="text-green-400 text-sm">Usuario creado ✓</span>}
          </div>
        </form>
      </div>

      {/* Lista */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800">
          <h2 className="text-white font-semibold text-lg">Administradores activos</h2>
          <p className="text-zinc-500 text-sm mt-1">
            {admins.length} {admins.length === 1 ? 'usuario' : 'usuarios'} con acceso al panel
          </p>
        </div>

        {error && (
          <div className="mx-6 mt-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-zinc-500 gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando...
          </div>
        ) : admins.length === 0 ? (
          <p className="text-zinc-500 text-sm text-center py-12">No hay administradores configurados.</p>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {admins.map((row) => (
              <li
                key={row.email}
                className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-zinc-800/30"
              >
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">{row.email}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {row.isSelf && (
                      <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-accent/20 text-accent border border-accent/30">
                        Tú
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(row)}
                  disabled={row.isSelf || deletingEmail === row.email}
                  title={row.isSelf ? 'No puedes eliminarte' : 'Eliminar'}
                  className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10
                    disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  {deletingEmail === row.email ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-zinc-600 text-xs">
        Todos los administradores se gestionan aquí. No hace falta configurar variables de entorno en Vercel.
      </p>
    </div>
  )
}
