'use client'

// Chip de color del semáforo por reglas (5 colores, minúsculas en persistencia).
type SemaforoColorKey = 'verde' | 'amarillo' | 'naranja' | 'rojo' | 'gris'

interface SemaforoChipProps {
  color: string
  /** Compact mode: shows only the color badge. Default: false (full badge with label). */
  compact?: boolean
}

const COLOR_CONFIG: Record<SemaforoColorKey, { badge: string; dot: string; label: string }> = {
  verde:    { badge: 'bg-green-50 text-green-700 border-green-300',   dot: 'bg-green-500',  label: 'APTO' },
  amarillo: { badge: 'bg-yellow-50 text-yellow-700 border-yellow-300', dot: 'bg-yellow-400', label: 'ALERTA' },
  naranja:  { badge: 'bg-orange-50 text-orange-700 border-orange-300', dot: 'bg-orange-500', label: 'URGENTE' },
  rojo:     { badge: 'bg-red-50 text-red-700 border-red-300',         dot: 'bg-red-500',    label: 'RIESGO' },
  gris:     { badge: 'bg-gray-50 text-gray-600 border-gray-300',       dot: 'bg-gray-400',   label: 'S/D' },
}

function cfgFor(color: string) {
  return COLOR_CONFIG[(color?.toLowerCase() as SemaforoColorKey)] ?? COLOR_CONFIG.gris
}

export function SemaforoChip({ color, compact = false }: SemaforoChipProps) {
  const cfg = cfgFor(color)

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${cfg.badge} ${compact ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'}`}>
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}
