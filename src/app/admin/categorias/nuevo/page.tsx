import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import CategoryForm from '../CategoryForm'

export const metadata = { title: 'Nueva categoría | Admin' }

export default async function NuevaCategoriaPage() {
  await createClient()
  const supabase = createAdminClient()
  const { data: categories } = await supabase.from('categories').select('id, name').order('name')

  return <CategoryForm categories={categories ?? []} />
}
