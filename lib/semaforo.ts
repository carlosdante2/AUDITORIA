// Pure TypeScript — zero network calls. Source of truth: SEMAFORO_v2_accion_ODS.md
// Constitution V: food safety always wins — this function is the authoritative gate.

export type SemaforoCategoria = 'perecedero_critico' | 'perecedero_intermedio' | 'no_perecedero'
export type SemaforoColor = 'verde' | 'amarillo' | 'rojo'
export type MetodoCalculo = 'fecha_documentada' | 'estimado_por_recepcion' | 'no_aplica'

export interface SemaforoInput {
  subtipo_producto: string
  fecha_vencimiento: string | null   // YYYY-MM-DD
  fecha_hoy: string                   // YYYY-MM-DD
  requiere_fecha_segun_norma: 'si' | 'no'
  estado_empaque: 'intacto' | 'dano_leve' | 'roto_abierto_fuga'
  observacion_visual: 'normal' | 'dudoso' | 'no_conforme'
  fecha_recepcion_o_compra?: string | null
}

export interface SemaforoOutput {
  categoria_asignada: SemaforoCategoria
  dias_restantes: number | null
  metodo_calculo: MetodoCalculo
  color: SemaforoColor
  razon: string
  accion_sugerida: string
  estrategia_economia_circular: string | null
  ods_relacionados: string[]
}

// ── Category classification ───────────────────────────────────────────────────

const CATEGORIA: Record<string, SemaforoCategoria> = {
  // Perecedero crítico — umbral: ≥5 días → verde, 1-4 → amarillo
  carne_res: 'perecedero_critico',
  carne_cerdo: 'perecedero_critico',
  pollo: 'perecedero_critico',
  pescado: 'perecedero_critico',
  mariscos: 'perecedero_critico',
  lacteo: 'perecedero_critico',
  lacteo_fresco: 'perecedero_critico',
  preparado_cocina: 'perecedero_critico',
  fruta_verdura_cortada_o_pelada: 'perecedero_critico', // special: once cut, critical
  // Perecedero intermedio — umbral: ≥7 días → verde, 1-6 → amarillo
  huevo: 'perecedero_intermedio',
  frutas_verduras: 'perecedero_intermedio',
  hojas_verdes: 'perecedero_intermedio',
  hierbas_frescas: 'perecedero_intermedio',
  tomate: 'perecedero_intermedio',
  pepino: 'perecedero_intermedio',
  pimenton: 'perecedero_intermedio',
  calabacin: 'perecedero_intermedio',
  zanahoria: 'perecedero_intermedio',
  remolacha: 'perecedero_intermedio',
  papa: 'perecedero_intermedio',
  cebolla: 'perecedero_intermedio',
  ajo: 'perecedero_intermedio',
  banano: 'perecedero_intermedio',
  citricos: 'perecedero_intermedio',
  manzana: 'perecedero_intermedio',
  pera: 'perecedero_intermedio',
  mango: 'perecedero_intermedio',
  papaya: 'perecedero_intermedio',
  pina: 'perecedero_intermedio',
  berries: 'perecedero_intermedio',
  aguacate: 'perecedero_intermedio',
  bebida_refrigerada: 'perecedero_intermedio',
  jugos_refrigerados: 'perecedero_intermedio',
  panaderia: 'perecedero_intermedio',
  panaderia_vida_corta: 'perecedero_intermedio',
  // No perecedero — umbral: ≥30 días → verde, 1-29 → amarillo
  enlatado: 'no_perecedero',
  conserva: 'no_perecedero',
  granos_secos: 'no_perecedero',
  bebida: 'no_perecedero',
  bebida_estable: 'no_perecedero',
  aceite_grasa: 'no_perecedero',
  agua: 'no_perecedero',
  hielo_empaquetado: 'no_perecedero',
  galletas_cereales: 'no_perecedero',
  leche_en_polvo: 'no_perecedero',
  cafe_te: 'no_perecedero',
  azucar_sal: 'no_perecedero',
}

// Estimated shelf life in days — only for products that lack printed expiry dates.
// Used when requiere_fecha_segun_norma = 'no' AND fecha_vencimiento = null.
// Averages from SEMAFORO_v2_accion_ODS.md ranges.
const VIDA_UTIL: Record<string, number> = {
  hojas_verdes: 6,
  hierbas_frescas: 5,
  tomate: 8,
  pepino: 8,
  pimenton: 8,
  calabacin: 8,
  zanahoria: 17,
  remolacha: 17,
  papa: 25,
  cebolla: 25,
  ajo: 25,
  banano: 6,
  citricos: 17,
  manzana: 25,
  pera: 25,
  mango: 6,
  papaya: 6,
  pina: 6,
  berries: 4,
  aguacate: 5,
  fruta_verdura_cortada_o_pelada: 2,
  huevo: 24,
  frutas_verduras: 5, // conservative default for generic produce
}

// ── ODS sets ──────────────────────────────────────────────────────────────────

const ODS_VERDE = ['ODS 12: Producción y consumo responsables']
const ODS_AMARILLO = [
  'ODS 2: Hambre cero',
  'ODS 12: Producción y consumo responsables',
  'ODS 13: Acción por el clima',
]
const ODS_ROJO_SALUD = [
  'ODS 3: Salud y bienestar',
  'ODS 12: Producción y consumo responsables',
  'ODS 13: Acción por el clima',
]
const ODS_ROJO_DESPERDICIO = [
  'ODS 12: Producción y consumo responsables',
  'ODS 13: Acción por el clima',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function diffDays(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number)
  const [ty, tm, td] = to.split('-').map(Number)
  const fromMs = Date.UTC(fy, fm - 1, fd)
  const toMs = Date.UTC(ty, tm - 1, td)
  return Math.floor((toMs - fromMs) / (24 * 60 * 60 * 1000))
}

function makeResult(
  categoria_asignada: SemaforoCategoria,
  dias_restantes: number | null,
  metodo_calculo: MetodoCalculo,
  color: SemaforoColor,
  razon: string,
  accion_sugerida: string,
  estrategia_economia_circular: string | null,
  ods_relacionados: string[],
): SemaforoOutput {
  return {
    categoria_asignada,
    dias_restantes,
    metodo_calculo,
    color,
    razon: razon.slice(0, 150),
    accion_sugerida,
    estrategia_economia_circular,
    ods_relacionados,
  }
}

// ── Main function ─────────────────────────────────────────────────────────────

export function evaluarSemaforo(input: SemaforoInput): SemaforoOutput {
  const {
    subtipo_producto,
    fecha_vencimiento,
    fecha_hoy,
    requiere_fecha_segun_norma,
    estado_empaque,
    observacion_visual,
    fecha_recepcion_o_compra,
  } = input

  const categoria: SemaforoCategoria = CATEGORIA[subtipo_producto] ?? 'perecedero_intermedio'

  // ── Step 1: Determine dias_restantes and metodo_calculo ──────────────────

  let dias_restantes: number | null = null
  let metodo_calculo: MetodoCalculo = 'no_aplica'

  if (fecha_vencimiento != null) {
    dias_restantes = diffDays(fecha_hoy, fecha_vencimiento)
    metodo_calculo = 'fecha_documentada'
  } else if (requiere_fecha_segun_norma === 'no') {
    const vidaUtil = VIDA_UTIL[subtipo_producto]
    if (vidaUtil != null) {
      // If no reception date, assume product just arrived (diasTranscurridos = 0)
      const diasTranscurridos = fecha_recepcion_o_compra != null
        ? diffDays(fecha_recepcion_o_compra, fecha_hoy)
        : 0
      dias_restantes = vidaUtil - diasTranscurridos
      metodo_calculo = 'estimado_por_recepcion'
    }
    // Stable products with no vida_util: metodo stays 'no_aplica', dias_restantes stays null
  }
  // requiere = 'si' + no fecha: metodo = 'no_aplica', dias_restantes = null (trazabilidad failure)

  // ── Step 2: Priority rules for rojo (evaluated in strict order) ──────────

  // 2a. Broken packaging — always a direct contamination risk
  if (estado_empaque === 'roto_abierto_fuga') {
    return makeResult(
      categoria, dias_restantes, metodo_calculo, 'rojo',
      'Empaque roto o con fuga, riesgo de contaminación directa',
      'retirar_consumo_humano_disposicion_controlada',
      'disposicion_controlada_sin_valorizacion',
      ODS_ROJO_SALUD,
    )
  }

  // 2b. Visual non-compliance — overrides date rules
  if (observacion_visual === 'no_conforme') {
    return makeResult(
      categoria, dias_restantes, metodo_calculo, 'rojo',
      'Observación visual no conforme, producto alterado o contaminado',
      'retirar_consumo_humano_disposicion_controlada',
      'disposicion_controlada_sin_valorizacion',
      ODS_ROJO_SALUD,
    )
  }

  // 2c. Missing required date — traceability failure under INVIMA norms
  if (requiere_fecha_segun_norma === 'si' && fecha_vencimiento == null) {
    return makeResult(
      categoria, dias_restantes, metodo_calculo, 'rojo',
      'Sin fecha de vencimiento requerida por norma, trazabilidad incompleta',
      'retirar_consumo_humano_disposicion_controlada',
      'disposicion_controlada_sin_valorizacion',
      ODS_ROJO_SALUD,
    )
  }

  // 2d. Expired or estimated life exhausted
  if (dias_restantes !== null && dias_restantes <= 0) {
    const esNoPerecedero = categoria === 'no_perecedero'

    if (esNoPerecedero && estado_empaque === 'dano_leve') {
      // Expired dry/stable product with damaged-but-not-broken packaging:
      // separate for packaging recycling, content may still be valorized
      return makeResult(
        categoria, dias_restantes, metodo_calculo, 'rojo',
        buildExpiredRazon(dias_restantes, metodo_calculo) + ', empaque con daño leve',
        'retirar_consumo_humano_evaluar_valorizacion',
        'separar_compostaje_o_reciclaje_empaque',
        ODS_ROJO_DESPERDICIO,
      )
    }

    if (esNoPerecedero && estado_empaque === 'intacto') {
      // Expired stable product, packaging intact — circular valorization possible
      return makeResult(
        categoria, dias_restantes, metodo_calculo, 'rojo',
        buildExpiredRazon(dias_restantes, metodo_calculo) + ', empaque intacto',
        'retirar_consumo_humano_evaluar_valorizacion',
        'evaluar_compostaje_o_alimentacion_animal_certificada',
        ODS_ROJO_DESPERDICIO,
      )
    }

    // Perishable expired OR non-perishable with microbiological risk
    return makeResult(
      categoria, dias_restantes, metodo_calculo, 'rojo',
      buildExpiredRazon(dias_restantes, metodo_calculo),
      'retirar_consumo_humano_disposicion_controlada',
      'disposicion_controlada_sin_valorizacion',
      ODS_ROJO_SALUD,
    )
  }

  // ── Step 3: color_base from category thresholds ──────────────────────────

  let colorBase: SemaforoColor
  if (dias_restantes === null) {
    // Stable product, no date required, no vida_util estimate → verde
    colorBase = 'verde'
  } else {
    const verdeUmbral = categoria === 'perecedero_critico' ? 5
      : categoria === 'perecedero_intermedio' ? 7
      : 30 // no_perecedero
    colorBase = dias_restantes >= verdeUmbral ? 'verde' : 'amarillo'
  }

  // ── Step 4: Downgrade adjustments (verde → amarillo only) ────────────────

  let color: SemaforoColor = colorBase
  let ajuste = ''
  if (colorBase === 'verde') {
    if (estado_empaque === 'dano_leve') {
      color = 'amarillo'
      ajuste = ', empaque con daño leve'
    } else if (observacion_visual === 'dudoso') {
      color = 'amarillo'
      ajuste = ', observación visual dudosa'
    }
  }

  // ── Step 5: Build output ──────────────────────────────────────────────────

  if (color === 'verde') {
    const razon = dias_restantes !== null
      ? `Dentro de vida útil (${dias_restantes} días restantes), apto para consumo`
      : 'Producto estable sin fecha requerida, apto para consumo'
    return makeResult(
      categoria, dias_restantes, metodo_calculo, 'verde',
      razon,
      'usar_segun_rotacion_fifo',
      null,
      ODS_VERDE,
    )
  }

  // amarillo
  const razon = dias_restantes !== null
    ? `Vence en ${dias_restantes} día${dias_restantes === 1 ? '' : 's'}${ajuste}, consumir pronto`
    : `Producto próximo al límite${ajuste}, consumir pronto`

  return makeResult(
    categoria, dias_restantes, metodo_calculo, 'amarillo',
    razon,
    'priorizar_uso_inmediato',
    'redistribucion_interna_o_donacion',
    ODS_AMARILLO,
  )
}

function buildExpiredRazon(dias: number, metodo: MetodoCalculo): string {
  if (dias === 0) return 'Vence hoy, no apto para consumo'
  if (metodo === 'estimado_por_recepcion') return 'Vida útil estimada agotada según fecha de recepción'
  return `Vencido hace ${Math.abs(dias)} días`
}
