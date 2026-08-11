'use client'

import type { SemaforoOutput } from '@/lib/semaforo'

interface SemaforoChipProps {
  resultado: SemaforoOutput
  /** Compact mode: shows only the color badge. Default: false (full card). */
  compact?: boolean
}

const COLOR_CONFIG = {
  verde: {
    bg: 'bg-semaforo-verde-bg border-semaforo-verde',
    text: 'text-semaforo-verde',
    dot: 'bg-semaforo-verde',
    badge: 'bg-semaforo-verde-bg text-semaforo-verde border-semaforo-verde',
    label: 'APTO',
  },
  amarillo: {
    bg: 'bg-semaforo-amarillo-bg border-semaforo-amarillo',
    text: 'text-semaforo-amarillo',
    dot: 'bg-semaforo-amarillo',
    badge: 'bg-semaforo-amarillo-bg text-semaforo-amarillo border-semaforo-amarillo',
    label: 'ALERTA',
  },
  rojo: {
    bg: 'bg-semaforo-rojo-bg border-semaforo-rojo',
    text: 'text-semaforo-rojo',
    dot: 'bg-semaforo-rojo',
    badge: 'bg-semaforo-rojo-bg text-semaforo-rojo border-semaforo-rojo',
    label: 'RIESGO',
  },
}

export function SemaforoChip({ resultado, compact = false }: SemaforoChipProps) {
  const cfg = COLOR_CONFIG[resultado.color]

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.badge}`}>
        <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
        {cfg.label}
      </span>
    )
  }

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${cfg.bg}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-3.5 h-3.5 rounded-full ${cfg.dot}`} />
          <span className={`text-base font-bold ${cfg.text}`}>{cfg.label}</span>
        </div>
        {resultado.dias_restantes !== null && (
          <span className={`text-xs font-medium ${cfg.text}`}>
            {diasLabel(resultado.dias_restantes)}
          </span>
        )}
      </div>

      {/* Razón */}
      <p className="text-sm text-gray-700 leading-snug">{resultado.razon}</p>

      {/* Acción */}
      <div className="space-y-0.5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Acción</p>
        <p className={`text-sm font-medium ${cfg.text}`}>{ACCION_LABEL[resultado.accion_sugerida] ?? resultado.accion_sugerida}</p>
      </div>

      {/* Economía circular */}
      {resultado.estrategia_economia_circular && (
        <div className="space-y-0.5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Economía circular</p>
          <p className="text-sm text-gray-700">
            {ESTRATEGIA_LABEL[resultado.estrategia_economia_circular] ?? resultado.estrategia_economia_circular}
          </p>
        </div>
      )}

      {/* ODS chips */}
      {resultado.ods_relacionados.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {resultado.ods_relacionados.map((ods) => (
            <span key={ods} className="text-xs bg-white/60 text-gray-500 border border-gray-200 px-2 py-0.5 rounded-full">
              {ods}
            </span>
          ))}
        </div>
      )}

      {/* Estimation notice */}
      {resultado.metodo_calculo === 'estimado_por_recepcion' && (
        <p className="text-xs text-gray-400 italic">* Vida útil estimada por fecha de recepción</p>
      )}
    </div>
  )
}

function diasLabel(dias: number): string {
  if (dias === 0) return 'Vence hoy'
  if (dias < 0) return `Vencido hace ${Math.abs(dias)}d`
  return `${dias}d restantes`
}

const ACCION_LABEL: Record<string, string> = {
  usar_segun_rotacion_fifo: 'Usar según rotación FIFO',
  priorizar_uso_inmediato: 'Priorizar uso inmediato',
  retirar_consumo_humano_disposicion_controlada: 'Retirar — disposición controlada',
  retirar_consumo_humano_evaluar_valorizacion: 'Retirar — evaluar valorización',
}

const ESTRATEGIA_LABEL: Record<string, string> = {
  redistribucion_interna_o_donacion: 'Redistribución interna o donación',
  evaluar_compostaje_o_alimentacion_animal_certificada: 'Evaluar compostaje o alimentación animal certificada',
  separar_compostaje_o_reciclaje_empaque: 'Separar para compostaje / reciclaje de empaque',
  disposicion_controlada_sin_valorizacion: 'Disposición controlada sin valorización',
}
