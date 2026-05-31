import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import CategoryForm from '../CategoryForm'

export const metadata = { title: 'Editar categoría | Admin' }

export default async function EditarCategoriaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await createClient()
  const supabase = createAdminClient()

  const { data: category } = await supabase.from('categories').select('*').eq('id', id).maybeSingle()
  if (!category) notFound()

  const { data: products } = await supabase
    .from('products')
    .select('id, name, slug, price, images, category_id, is_active')
    .eq('category_id', id)
    .order('name')

  const { data: categories } = await supabase.from('categories').select('id, name').order('name')

  return (
    <CategoryForm
      category={category}
      initialProducts={products ?? []}
      categories={categories ?? []}
    />
  )
}
