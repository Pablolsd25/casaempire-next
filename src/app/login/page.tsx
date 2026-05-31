'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const searchParams = useSearchParams()
  const redirectParam = searchParams.get('redirect') ?? '/cuenta'
  // Usamos el endpoint servidor para detectar si es admin y redirigir a /admin automáticamente
  const redirect = `/api/auth/post-login?redirect=${encodeURIComponent(redirectParam)}`

  const [mode, setMode]         = useState<'login' | 'register'>('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [name, setName]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      })
      if (error) { setError(error.message); setLoading(false); return }
    }

    // Full page reload — garantiza que el servidor lea las cookies
    // de sesión recién escritas (evita race condition en producción)
    window.location.href = redirect
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-white font-bold text-2xl tracking-widest uppercase">
            Casa Empire
          </Link>
          <p className="text-zinc-400 mt-2 text-sm">
            {mode === 'login' ? 'Inicia sesión en tu cuenta' : 'Crea tu cuenta'}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          {/* Tabs */}
          <div className="flex gap-1 bg-zinc-800 rounded-xl p-1 mb-6">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all
                  ${mode === m ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
              >
                {m === 'login' ? 'Iniciar sesión' : 'Registrarse'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-zinc-400 text-sm mb-1">Nombre completo</label>
                <input
                  type="text" value={name} onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-zinc-800 text-white rounded-lg px-4 py-2.5 border border-zinc-700
                    focus:outline-none focus:border-zinc-500 text-sm"
                />
              </div>
            )}
            <div>
              <label className="block text-zinc-400 text-sm mb-1">Correo electrónico</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-zinc-800 text-white rounded-lg px-4 py-2.5 border border-zinc-700
                  focus:outline-none focus:border-zinc-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-zinc-400 text-sm mb-1">Contraseña</label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                required minLength={6}
                className="w-full bg-zinc-800 text-white rounded-lg px-4 py-2.5 border border-zinc-700
                  focus:outline-none focus:border-zinc-500 text-sm"
              />
            </div>

            {error && (
              <div className="bg-red-950 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black font-bold py-3 rounded-xl
                hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Cargando...' : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[80vh] flex items-center justify-center"><p className="text-zinc-500">Cargando...</p></div>}>
      <LoginForm />
    </Suspense>
  )
}
