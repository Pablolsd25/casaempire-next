import type { SupabaseClient, User } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const ADMIN_EMAILS_KEY = 'admin_emails'

export function normalizeAdminEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** Emails definidos en ADMIN_EMAILS (siempre tienen acceso; no se pueden quitar desde el panel) */
export function getEnvAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(normalizeAdminEmail)
    .filter(Boolean)
}

export async function getStoredAdminEmails(
  supabase: SupabaseClient
): Promise<string[]> {
  const { data } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', ADMIN_EMAILS_KEY)
    .maybeSingle()

  if (!data?.value) return []

  try {
    const parsed = JSON.parse(data.value) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((e): e is string => typeof e === 'string')
      .map(normalizeAdminEmail)
      .filter(Boolean)
  } catch {
    return []
  }
}

/** Lista efectiva: variables de entorno + administradores guardados en BD */
export async function getAdminEmails(
  supabase?: SupabaseClient
): Promise<string[]> {
  const client = supabase ?? createAdminClient()
  const stored = await getStoredAdminEmails(client)
  const env = getEnvAdminEmails()
  return [...new Set([...env, ...stored])]
}

export function isAdminEmail(email: string, adminEmails: string[]): boolean {
  const normalized = normalizeAdminEmail(email)
  return adminEmails.some((e) => e === normalized)
}

export function isProtectedEnvAdmin(email: string): boolean {
  return isAdminEmail(email, getEnvAdminEmails())
}

export async function saveStoredAdminEmails(
  supabase: SupabaseClient,
  emails: string[]
): Promise<void> {
  const unique = [...new Set(emails.map(normalizeAdminEmail).filter(Boolean))]
  const { error } = await supabase.from('site_settings').upsert({
    key: ADMIN_EMAILS_KEY,
    value: JSON.stringify(unique),
    updated_at: new Date().toISOString(),
  })
  if (error) throw new Error(error.message)
}

export async function getSessionUser(): Promise<User | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/** Para API routes: null si autorizado, NextResponse si no */
/** Usuario de sesión solo si es administrador */
export async function getAdminUser(): Promise<User | null> {
  const user = await getSessionUser()
  if (!user) return null
  const adminEmails = await getAdminEmails()
  if (!isAdminEmail(user.email ?? '', adminEmails)) return null
  return user
}

export async function checkAdminAccess(): Promise<NextResponse | null> {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const adminEmails = await getAdminEmails()
  if (!isAdminEmail(user.email ?? '', adminEmails)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  return null
}
