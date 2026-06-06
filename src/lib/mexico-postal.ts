export type PostalSettlement = {
  nombre: string
  tipo: string
  ciudad: string
}

export type PostalCodeResult = {
  cp: string
  estado: string
  municipio: string
  asentamientos: PostalSettlement[]
}
