'use client'

import { useEffect, useState } from 'react'

type Diagnostics = {
  configured: boolean
  provider: string
  fromName: string
  fromEmail: string
  smtp: {
    configured: boolean
    host: string
    port: string
    user: string | null
    hasPass: boolean
  }
  emailProviderEnv: string | null
}

type SendResult = {
  ok?: boolean
  error?: string
  messageId?: string | null
  fromEmail?: string
  provider?: string
  hint?: string
  diagnostics?: Diagnostics
}

export default function DevEmailTestPage() {
  const [email, setEmail] = useState('')
  const [diag, setDiag] = useState<Diagnostics | null>(null)
  const [result, setResult] = useState<SendResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch('/api/dev/test-email')
      .then(async (res) => {
        if (res.status === 404) {
          setNotFound(true)
          return
        }
        setDiag(await res.json())
      })
      .catch(() => setNotFound(true))
  }, [])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/dev/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = (await res.json()) as SendResult
      setResult(data)
      if (data.diagnostics) setDiag(data.diagnostics)
    } catch {
      setResult({ error: 'Error de conexión con el servidor local.' })
    } finally {
      setLoading(false)
    }
  }

  if (notFound) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center text-zinc-400">
        Esta página solo está disponible en desarrollo (`npm run dev`).
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-16">
      <h1 className="text-white font-bold text-2xl mb-2">Prueba de correo (local)</h1>
      <p className="text-zinc-500 text-sm mb-8">
        Solo desarrollo — usa las variables SMTP de tu <code className="text-zinc-400">.env.local</code>.
      </p>

      {diag && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-6 text-sm space-y-1">
          <p className="text-zinc-400">
            Proveedor:{' '}
            <span className={diag.configured ? 'text-green-400' : 'text-red-400'}>
              {diag.provider}
            </span>
          </p>
          <p className="text-zinc-400">
            Remitente: <span className="text-white">{diag.fromName} &lt;{diag.fromEmail}&gt;</span>
          </p>
          <p className="text-zinc-400">
            SMTP_USER: <span className="text-white">{diag.smtp.user ?? '—'}</span>
          </p>
          <p className="text-zinc-400">
            SMTP_PASS:{' '}
            <span className={diag.smtp.hasPass ? 'text-green-400' : 'text-red-400'}>
              {diag.smtp.hasPass ? 'definido ✓' : 'falta ✗'}
            </span>
          </p>
          <p className="text-zinc-500 text-xs">
            {diag.smtp.host}:{diag.smtp.port}
            {diag.emailProviderEnv ? ` · EMAIL_PROVIDER=${diag.emailProviderEnv}` : ''}
          </p>
        </div>
      )}

      <form onSubmit={handleSend} className="space-y-4">
        <div>
          <label className="block text-zinc-400 text-xs uppercase tracking-wide mb-1">
            Enviar prueba a
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu-correo@ejemplo.com"
            required
            className="w-full bg-zinc-950 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm
              focus:outline-none focus:border-[#E8177A]"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !diag?.configured}
          className="w-full bg-[#E8177A] text-black font-bold py-2.5 rounded-lg text-sm
            disabled:opacity-50 hover:opacity-90 transition-opacity"
        >
          {loading ? 'Enviando…' : 'Enviar correo de prueba'}
        </button>
      </form>

      {result && (
        <div
          className={`mt-6 p-4 rounded-lg text-sm border ${
            result.ok
              ? 'bg-green-950 border-green-800 text-green-300'
              : 'bg-red-950 border-red-800 text-red-300'
          }`}
        >
          {result.ok ? (
            <>
              <p className="font-semibold mb-1">Enviado ✓</p>
              <p>Proveedor: {result.provider}</p>
              <p>Desde: {result.fromEmail}</p>
              {result.messageId && <p className="text-xs opacity-80">ID: {result.messageId}</p>}
              {result.hint && <p className="mt-2 text-xs">{result.hint}</p>}
            </>
          ) : (
            <>
              <p className="font-semibold mb-1">Error</p>
              <p>{result.error}</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
