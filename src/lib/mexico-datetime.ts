/** Zona horaria de Ciudad de México (UTC−6, sin horario de verano). */
export const MEXICO_TIMEZONE = 'America/Mexico_City'

export function formatMexicoDateTime(
  value: string | Date,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = typeof value === 'string' ? new Date(value) : value
  return date.toLocaleString('es-MX', {
    timeZone: MEXICO_TIMEZONE,
    day:      '2-digit',
    month:    'short',
    year:     'numeric',
    hour:     '2-digit',
    minute:   '2-digit',
    ...options,
  })
}

export function formatMexicoDate(
  value: string | Date,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = typeof value === 'string' ? new Date(value) : value
  return date.toLocaleDateString('es-MX', {
    timeZone: MEXICO_TIMEZONE,
    day:      '2-digit',
    month:    'short',
    year:     'numeric',
    ...options,
  })
}
