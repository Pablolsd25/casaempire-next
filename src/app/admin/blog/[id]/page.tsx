import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import type { BlogPost } from '@/types'
import BlogForm from '../BlogForm'

interface Props { params: Promise<{ id: string }> }

export const metadata = { title: 'Editar artículo | Admin' }

export default async function EditarBlogPage({ params }: Props) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: post } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', id)
    .single()

  if (!post) notFound()

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-white font-display font-bold text-3xl uppercase tracking-wide">
          Editar artículo
        </h1>
        <p className="text-zinc-500 text-sm mt-1 font-mono">/{post.slug}</p>
      </div>
      <BlogForm post={post as BlogPost} />
    </div>
  )
}
