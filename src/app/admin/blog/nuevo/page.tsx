import BlogForm from '../BlogForm'

export const metadata = { title: 'Nuevo artículo | Admin' }

export default function NuevoBlogPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-white font-display font-bold text-3xl uppercase tracking-wide">
          Nuevo artículo
        </h1>
        <p className="text-zinc-500 text-sm mt-1">Crea un nuevo post para el blog</p>
      </div>
      <BlogForm />
    </div>
  )
}
