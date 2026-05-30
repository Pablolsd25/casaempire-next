import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AdminSidebar from './AdminSidebar'

export const metadata = { title: 'Panel Admin | Empire Nutrition' }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/admin')
  }

  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
  if (!adminEmails.includes(user.email ?? '')) {
    redirect('/?error=no_access')
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      <AdminSidebar userEmail={user.email ?? ''} />
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        <div className="p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
