/** Escapa caracteres que alteran la sintaxis de filtros PostgREST en `.or()`. */
export function escapePostgrestFilter(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\./g, '\\.')
}

/** Construye filtro `.or()` seguro para búsqueda ilike en múltiples columnas. */
export function buildIlikeOrFilter(columns: string[], query: string): string {
  const safe = escapePostgrestFilter(query.trim())
  return columns.map((col) => `${col}.ilike.%${safe}%`).join(',')
}
