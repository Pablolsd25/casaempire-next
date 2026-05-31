import { createAdminClient } from '@/lib/supabase/admin'
import ProductForm from '../ProductForm'

export const metadata = { title: 'Nuevo Producto | Admin' }

export default async function NuevoProductoPage() {
  const supabase = createAdminClient()
  const { data: categories } = await supabase.from('categories').select('id, name').order('name')

  return (
    <div>
      <ProductForm categories={categories ?? []} />
    </div>
  )
}
