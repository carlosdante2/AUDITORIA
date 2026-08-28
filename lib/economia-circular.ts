// Economía circular / valorización — capa de presentación derivada del motor.
// La ESTRATEGIA la define el admin en el umbral de la regla (dato, no cableado).
// Los ODS son una etiqueta fija que se DERIVA de la estrategia (catálogo estable
// de Objetivos de Desarrollo Sostenible), por eso vive aquí y no en la BD.

import type { EstrategiaCircular, ResultadoLote, Color } from './reglas-engine'

// Texto legible de cada ruta de valorización.
export const ESTRATEGIA_LABEL: Record<EstrategiaCircular, string> = {
  REDISTRIBUCION_INTERNA: 'Redistribución interna — priorizar uso',
  BANCO_ALIMENTOS: 'Trasladar a banco de alimentos',
  DONACION: 'Donación a institución',
  ALIMENTACION_ANIMAL: 'Alimentación animal certificada',
  COMPOSTAJE: 'Compostaje',
  RECICLAJE_EMPAQUE: 'Separar para reciclaje de empaque',
  DISPOSICION_CONTROLADA: 'Disposición controlada',
}

// ODS derivados de la estrategia (catálogo fijo, no configurable).
export const ESTRATEGIA_ODS: Record<EstrategiaCircular, string[]> = {
  REDISTRIBUCION_INTERNA: ['ODS 12: Producción y consumo responsables'],
  BANCO_ALIMENTOS: ['ODS 2: Hambre cero', 'ODS 12: Producción y consumo responsables'],
  DONACION: ['ODS 2: Hambre cero', 'ODS 12: Producción y consumo responsables'],
  ALIMENTACION_ANIMAL: ['ODS 12: Producción y consumo responsables', 'ODS 13: Acción por el clima'],
  COMPOSTAJE: ['ODS 12: Producción y consumo responsables', 'ODS 13: Acción por el clima'],
  RECICLAJE_EMPAQUE: ['ODS 12: Producción y consumo responsables'],
  DISPOSICION_CONTROLADA: ['ODS 3: Salud y bienestar'],
}

const SEVERIDAD: Record<Color, number> = { VERDE: 0, GRIS: 1, AMARILLO: 2, NARANJA: 3, ROJO: 4 }

// Estrategia recomendada para un lote: la del umbral ganador más severo que tenga una.
// Así el auditor ve "a dónde derivar" el producto por vencer/vencido.
export function estrategiaRecomendada(res: ResultadoLote): EstrategiaCircular | null {
  const conEstrategia = res.detalle.filter((d) => d.estrategia_circular != null)
  if (conEstrategia.length === 0) return null
  const ganador = conEstrategia.reduce((a, b) => (SEVERIDAD[b.color] > SEVERIDAD[a.color] ? b : a))
  return ganador.estrategia_circular
}

export function odsDeEstrategia(e: EstrategiaCircular | null): string[] {
  return e ? ESTRATEGIA_ODS[e] : []
}
