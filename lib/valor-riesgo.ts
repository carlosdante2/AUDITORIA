// Valor en riesgo del semáforo — cuánto dinero se pierde si un lote
// amarillo/naranja llega a dañarse/vencer. Pura presentación derivada de
// datos (cantidad del lote × costo de referencia del producto, migración 020),
// nunca un valor cableado. Colombia: COP, sin decimales (uso habitual).

export function valorEnRiesgo(cantidad: number, costoUnitarioReferencia: number | null): number | null {
  if (costoUnitarioReferencia == null || !Number.isFinite(costoUnitarioReferencia)) return null
  return cantidad * costoUnitarioReferencia
}

export function fmtCOP(valor: number): string {
  return valor.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

// Mensaje según el color — amarillo/naranja son preventivos ("podrías
// perder"), no aplica a otros colores (verde/gris no hay riesgo; rojo ya
// tiene su propio mensaje de bloqueo/cuarentena, sin este framing de dinero).
export function mensajeValorRiesgo(color: string, valor: number): string | null {
  if (color === 'AMARILLO') return `${fmtCOP(valor)} en riesgo si se pierde.`
  if (color === 'NARANJA') return `${fmtCOP(valor)} en riesgo — actúa hoy.`
  return null
}
