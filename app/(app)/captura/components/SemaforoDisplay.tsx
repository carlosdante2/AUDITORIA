'use client'

import type { ResultadoLote, Color } from '@/lib/reglas-engine'
import { estrategiaRecomendada, odsDeEstrategia, ESTRATEGIA_LABEL } from '@/lib/economia-circular'

interface SemaforoDisplayProps {
  resultado: ResultadoLote
  /** true cuando el color es provisional (evaluado offline, se confirma al sincronizar). */
  provisional?: boolean
}

const COLOR_CONFIG: Record<Color, { bar: string; bg: string; text: string; label: string; emoji: string }> = {
  VERDE:    { bar: 'bg-green-500',  bg: 'bg-green-50 border-green-300',   text: 'text-green-700',  label: 'APTO',           emoji: '🟢' },
  AMARILLO: { bar: 'bg-yellow-400', bg: 'bg-yellow-50 border-yellow-300', text: 'text-yellow-700', label: 'ALERTA',         emoji: '🟡' },
  NARANJA:  { bar: 'bg-orange-500', bg: 'bg-orange-50 border-orange-300', text: 'text-orange-700', label: 'URGENTE',        emoji: '🟠' },
  ROJO:     { bar: 'bg-red-500',    bg: 'bg-red-50 border-red-300',       text: 'text-red-700',    label: 'RIESGO',         emoji: '🔴' },
  GRIS:     { bar: 'bg-gray-400',   bg: 'bg-gray-50 border-gray-300',     text: 'text-gray-600',   label: 'INDETERMINADO',  emoji: '⚪' },
}

const MOTIVO_LABEL: Record<string, string> = {
  SIN_REGLA_CONFIGURADA: 'Sin regla configurada para este caso',
  SIN_DATO: 'Falta el dato para evaluar',
  SIN_COBERTURA: 'El valor no está cubierto por la regla',
}

export function SemaforoDisplay({ resultado, provisional = false }: SemaforoDisplayProps) {
  const cfg = COLOR_CONFIG[resultado.color_final]
  const estrategia = estrategiaRecomendada(resultado)
  const ods = odsDeEstrategia(estrategia)

  // Dimensión que determinó el color (la más severa con mensaje/motivo).
  const dominante = [...resultado.detalle].sort(
    (a, b) => severidad(b.color) - severidad(a.color),
  )[0]
  const razon = dominante?.mensaje || (dominante?.motivo ? MOTIVO_LABEL[dominante.motivo] ?? dominante.motivo : null)

  return (
    <div className={`rounded-2xl border-2 overflow-hidden ${cfg.bg}`}>
      <div className={`h-2 w-full ${cfg.bar}`} />

      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl leading-none" aria-hidden>{cfg.emoji}</span>
            <span className={`text-xl font-black tracking-wide ${cfg.text}`}>{cfg.label}</span>
          </div>
          {provisional && (
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
              Provisional · se confirma al sincronizar
            </span>
          )}
        </div>

        {/* Razón / motivo dominante */}
        {razon && <p className="text-sm text-gray-700 leading-snug font-medium">{razon}</p>}

        {/* Bloqueos */}
        {(resultado.bloqueo_salida || resultado.bloqueo_ingreso) && (
          <div className="flex flex-wrap gap-1.5">
            {resultado.bloqueo_salida && (
              <span className="text-xs font-bold bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">
                Bloquea salida
              </span>
            )}
            {resultado.bloqueo_ingreso && (
              <span className="text-xs font-bold bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">
                Bloquea ingreso
              </span>
            )}
          </div>
        )}

        {/* Economía circular / valorización */}
        {estrategia && (
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Valorización</p>
            <p className="text-sm text-gray-700">{ESTRATEGIA_LABEL[estrategia]}</p>
          </div>
        )}

        {/* ODS derivados de la estrategia */}
        {ods.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {ods.map((o) => (
              <span key={o} className="text-[10px] bg-white/70 text-gray-500 border border-gray-200 px-2 py-0.5 rounded-full">
                {o}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function severidad(c: Color): number {
  return { VERDE: 0, GRIS: 1, AMARILLO: 2, NARANJA: 3, ROJO: 4 }[c]
}
