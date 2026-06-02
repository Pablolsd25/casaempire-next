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
          Solo personal del panel admin. Agrega o elimina cuentas aquí — sin variables de entorno.
        </p>
      </div>
      <AdminUsersManager />
    </div>
  )
}
