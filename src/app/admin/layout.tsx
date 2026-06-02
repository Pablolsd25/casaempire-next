import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminEmails, isAdminEmail } from '@/lib/admin-auth'
import AdminSidebar from './AdminSidebar'

export const metadata = { title: 'Panel Admin | Empire Nutrition' }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/admin')
  }

  const admin = createAdminClient()
  const adminEmails = await getAdminEmails(admin)
  if (!isAdminEmail(user.email ?? '', adminEmails)) {
    redirect('/?error=no_access')
  }

  // Contar mensajes sin leer para el badge del sidebar
  const { count: unreadMessages } = await admin
    .from('contact_submissions')
    .select('*', { count: 'exact', head: true })
    .eq('leido', false)

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      <AdminSidebar userEmail={user.email ?? ''} unreadMessages={unreadMessages ?? 0} />
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        <div className="p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
