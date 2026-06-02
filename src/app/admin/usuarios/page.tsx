import AdminUsersManager from './AdminUsersManager'

export const metadata = { title: 'Usuarios | Admin' }

export default function AdminUsuariosPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-white font-display font-bold text-3xl uppercase tracking-wide">
          Usuarios
        </h1>
        <p className="text-zinc-500 text-sm mt-1">
          Administradores con acceso al panel. Agrega o elimina cuentas desde aquí.
        </p>
      </div>
      <AdminUsersManager />
    </div>
  )
}
