import { NextRequest, NextResponse } from 'next/server'
import type { PostalCodeResult } from '@/lib/mexico-postal'

/** GET /api/postal-code?cp=55748 — colonias por código postal (SEPOMEX vía Postali) */
export async function GET(req: NextRequest) {
  const cp = req.nextUrl.searchParams.get('cp')?.replace(/\D/g, '').slice(0, 5)
  if (!cp || cp.length !== 5) {
    return NextResponse.json({ error: 'Código postal inválido (5 dígitos).' }, { status: 400 })
  }

  try {
    const res = await fetch(`https://postali.app/api/v1/mx/cp/${cp}`, {
      headers: { accept: 'application/json' },
      next: { revalidate: 86400 },
    })

    if (res.status === 404) {
      return NextResponse.json({ error: 'Código postal no encontrado.' }, { status: 404 })
    }

    if (!res.ok) {
      return NextResponse.json({ error: 'No se pudo consultar el código postal.' }, { status: 502 })
    }

    const data = (await res.json()) as {
      cp?: string
      estado?: string
      municipio?: string
      asentamientos?: Array<{ nombre?: string; tipo?: string; ciudad?: string }>
    }

    const asentamientos = (data.asentamientos ?? [])
      .map((a) => ({
        nombre: a.nombre?.trim() ?? '',
        tipo: a.tipo?.trim() ?? '',
        ciudad: a.ciudad?.trim() ?? '',
      }))
      .filter((a) => a.nombre)

    if (asentamientos.length === 0) {
      return NextResponse.json({ error: 'Sin colonias para este código postal.' }, { status: 404 })
    }

    const result: PostalCodeResult = {
      cp: data.cp ?? cp,
      estado: data.estado ?? '',
      municipio: data.municipio ?? '',
      asentamientos,
    }

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Error al consultar código postal.' }, { status: 502 })
  }
}
