'use client'

import type { SemaforoOutput } from '@/lib/semaforo'

interface SemaforoDisplayProps {
  resultado: SemaforoOutput
}

const COLOR_CONFIG = {
  verde: {
    bar: 'bg-semaforo-verde',
    bg: 'bg-semaforo-verde-bg border-semaforo-verde',
    text: 'text-semaforo-verde',
    label: 'APTO',
    emoji: '🟢',
  },
  amarillo: {
    bar: 'bg-semaforo-amarillo',
    bg: 'bg-semaforo-amarillo-bg border-semaforo-amarillo',
    text: 'text-semaforo-amarillo',
    label: 'ALERTA',
    emoji: '🟡',
  },
  rojo: {
    bar: 'bg-semaforo-rojo',
    bg: 'bg-semaforo-rojo-bg border-semaforo-rojo',
    text: 'text-semaforo-rojo',
    label: 'RIESGO',
    emoji: '🔴',
  },
}

const ACCION_LABEL: Record<string, string> = {
  usar_segun_rotacion_fifo: 'Usar según rotación FIFO',
  priorizar_uso_inmediato: 'Priorizar uso inmediato',
  retirar_consumo_humano_disposicion_controlada: 'Retirar — disposición controlada',
  retirar_consumo_humano_evaluar_valorizacion: 'Retirar — evaluar valorización',
}

const ESTRATEGIA_LABEL: Record<string, string> = {
  redistribucion_interna_o_donacion: 'Redistribución interna o donación',
  evaluar_compostaje_o_alimentacion_animal_certificada: 'Compostaje o alimentación animal certificada',
  separar_compostaje_o_reciclaje_empaque: 'Separar: compostaje / reciclaje empaque',
  disposicion_controlada_sin_valorizacion: 'Disposición controlada',
}

export function SemaforoDisplay({ resultado }: SemaforoDisplayProps) {
  const cfg = COLOR_CONFIG[resultado.color]

  return (
    <div className={`rounded-2xl border-2 overflow-hidden ${cfg.bg}`}>
      {/* Color bar */}
      <div className={`h-2 w-full ${cfg.bar}`} />

      <div className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl leading-none" aria-hidden>{cfg.emoji}</span>
            <span className={`text-xl font-black tracking-wide ${cfg.text}`}>{cfg.label}</span>
          </div>
          {resultado.dias_restantes !== null && (
            <span className={`text-sm font-bold ${cfg.text}`}>
              {diasLabel(resultado.dias_restantes)}
            </span>
          )}
        </div>

        {/* Razón */}
        <p className="text-sm text-gray-700 leading-snug font-medium">{resultado.razon}</p>

        {/* Acción recomendada */}
        <div className="space-y-0.5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Acción</p>
          <p className={`text-sm font-semibold ${cfg.text}`}>
            {ACCION_LABEL[resultado.accion_sugerida] ?? resultado.accion_sugerida}
          </p>
        </div>

        {/* Economía circular */}
        {resultado.estrategia_economia_circular && (
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Economía circular</p>
            <p className="text-sm text-gray-600">
              {ESTRATEGIA_LABEL[resultado.estrategia_economia_circular] ?? resultado.estrategia_economia_circular}
            </p>
          </div>
        )}

        {/* ODS chips */}
        {resultado.ods_relacionados.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {resultado.ods_relacionados.map((ods) => (
              <span
                key={ods}
                className="text-[10px] bg-white/70 text-gray-500 border border-gray-200 px-2 py-0.5 rounded-full"
              >
                {ods}
              </span>
            ))}
          </div>
        )}

        {/* Estimation notice */}
        {resultado.metodo_calculo === 'estimado_por_recepcion' && (
          <p className="text-[10px] text-gray-400 italic">* Vida útil estimada por fecha de recepción</p>
        )}
      </div>
    </div>
  )
}

function diasLabel(dias: number): string {
  if (dias === 0) return 'Vence hoy'
  if (dias < 0) return `Vencido hace ${Math.abs(dias)}d`
  return `${dias}d restantes`
}
