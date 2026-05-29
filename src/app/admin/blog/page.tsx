import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import Image from 'next/image'
import BlogToggle from './BlogToggle'

export const metadata = { title: 'Blog | Admin' }

export default async function AdminBlogPage() {
  await createClient() // auth check via layout
  const supabase = createAdminClient()
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('id, title, slug, is_published, published_at, cover_image, created_at')
    .order('created_at', { ascending: false })

  const published = (posts ?? []).filter((p) => p.is_published).length
  const drafts    = (posts ?? []).length - published

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-white font-display font-bold text-3xl uppercase tracking-wide">Blog</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-zinc-500 text-sm">{(posts ?? []).length} artículos</span>
            {published > 0 && (
              <span className="text-xs bg-green-500/15 text-green-400 border border-green-500/20 rounded-full px-2 py-0.5">
                {published} publicados
              </span>
            )}
            {drafts > 0 && (
              <span className="text-xs bg-zinc-700/50 text-zinc-400 border border-zinc-700 rounded-full px-2 py-0.5">
                {drafts} borradores
              </span>
            )}
          </div>
        </div>
        <Link
          href="/admin/blog/nuevo"
          className="btn-accent px-5 py-2.5 rounded-lg text-sm font-display font-bold uppercase tracking-wider flex items-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nuevo artículo
        </Link>
      </div>

      {/* ── Post list ──────────────────────────────────────── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-800">

        {(posts ?? []).map((post) => (
          <div
            key={post.id}
            className="flex items-center gap-4 px-5 py-4 hover:bg-zinc-800/30 transition-colors group"
          >
            {/* Cover thumbnail */}
            <div className="flex-shrink-0 w-[72px] h-[48px] rounded-lg overflow-hidden bg-zinc-800 relative border border-zinc-700/50">
              {post.cover_image ? (
                <Image
                  src={post.cover_image}
                  alt={post.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2 2 0 00-2-2h-2" />
                  </svg>
                </div>
              )}
            </div>

            {/* Title & slug */}
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate group-hover:text-zinc-100 transition-colors">
                {post.title}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-zinc-600 text-xs font-mono truncate max-w-[220px]">/{post.slug}</p>
                {post.published_at && (
                  <span className="text-zinc-600 text-xs hidden sm:inline">
                    {new Date(post.published_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Publish toggle */}
              <BlogToggle postId={post.id} isPublished={post.is_published} />

              {/* Edit */}
              <Link
                href={`/admin/blog/${post.id}`}
                className="text-xs text-accent border border-accent/30 px-3 py-1.5 rounded-lg
                  hover:bg-accent/10 transition-colors font-medium"
              >
                Editar
              </Link>

              {/* View live — only if published */}
              {post.is_published && (
                <Link
                  href={`/blog/${post.slug}`}
                  target="_blank"
                  className="text-xs text-zinc-500 hover:text-white border border-zinc-700 px-3 py-1.5 rounded-lg
                    hover:border-zinc-500 transition-colors hidden sm:inline-flex items-center gap-1"
                >
                  Ver
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                    <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </Link>
              )}
            </div>
          </div>
        ))}

        {(posts ?? []).length === 0 && (
          <div className="px-5 py-16 text-center">
            <svg className="w-10 h-10 text-zinc-700 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-zinc-500 text-sm">No hay artículos aún</p>
            <Link href="/admin/blog/nuevo" className="btn-accent mt-4 inline-block px-4 py-2 rounded-lg text-sm">
              Crear primer artículo
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
