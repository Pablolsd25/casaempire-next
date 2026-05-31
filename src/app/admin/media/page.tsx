import { createClient } from '@/lib/supabase/server'
import MediaGallery from './MediaGallery'

export const metadata = { title: 'Galería | Admin' }

export default async function AdminMediaPage() {
  const auth = await createClient()
  await auth.auth.getUser()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-white font-display font-bold text-3xl uppercase tracking-wide">Galería</h1>
        <p className="text-zinc-500 text-sm mt-1">Todas tus imágenes y videos en un solo lugar</p>
      </div>
      <MediaGallery />
    </div>
  )
}
