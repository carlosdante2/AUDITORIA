// Motor de Semáforo Sanitario — evaluación pura, SIN umbrales hardcodeados.
// Todos los valores llegan desde `reglas` + `regla_umbrales` (base de datos).
// Regla de oro del spec: si ves un número mágico aquí, está mal.

export type TipoRegla =
  | 'VENCIMIENTO' | 'POST_APERTURA' | 'TEMPERATURA' | 'LECTURA_VENCIDA'
  | 'TRAZABILIDAD' | 'CUARENTENA' | 'STOCK_MINIMO'

export type Ambito = 'GLOBAL' | 'CATEGORIA' | 'PRODUCTO'
export type Color = 'VERDE' | 'AMARILLO' | 'NARANJA' | 'ROJO' | 'GRIS'
export type Accion = 'SOLO_ALERTA' | 'BLOQUEA_SALIDA' | 'BLOQUEA_INGRESO' | 'FUERZA_CUARENTENA'
export type Operador = 'GT' | 'GTE' | 'LT' | 'LTE' | 'BETWEEN' | 'EQ' | 'IS_NULL' | 'IN'

// Tipos que Fase 1 evalúa (TEMPERATURA/LECTURA_VENCIDA → Fase 2)
export const TIPOS_FASE1: TipoRegla[] = ['VENCIMIENTO', 'TRAZABILIDAD', 'CUARENTENA', 'STOCK_MINIMO']

// Unidad válida por tipo (para validación de coherencia)
export const UNIDAD_POR_TIPO: Record<TipoRegla, string> = {
  VENCIMIENTO: 'dias', POST_APERTURA: 'horas', TEMPERATURA: 'celsius',
  LECTURA_VENCIDA: 'horas', TRAZABILIDAD: '-', CUARENTENA: '-', STOCK_MINIMO: '-',
}

export interface Umbral {
  color: Color
  operador: Operador
  valor_min: number | null
  valor_max: number | null
  valor_text: string | null
  unidad: string | null
  accion: Accion
  mensaje: string | null
  orden: number
}

export interface Regla {
  id: string
  tipo: TipoRegla
  ambito: Ambito
  ambito_id: string | null
  version: number
  umbrales: Umbral[]
}

export interface LoteEval {
  producto_id: string
  categoria_id: string | null
  codigo_lote: string | null
  proveedor_id: string | null
  fecha_vencimiento: string | null   // YYYY-MM-DD
  fecha_apertura: string | null      // ISO
  estado_cuarentena: string
  cantidad: number
}

export interface DetalleDimension {
  tipo: TipoRegla
  color: Color
  valor_evaluado: number | null
  valor_text: string | null
  regla_id: string | null
  regla_version: number | null
  umbral_snapshot: Umbral | null
  accion: Accion | null
  mensaje: string | null
  motivo?: string   // SIN_REGLA_CONFIGURADA | SIN_DATO | SIN_COBERTURA
}

export interface ResultadoLote {
  color_final: Color
  bloqueo_salida: boolean
  bloqueo_ingreso: boolean
  detalle: DetalleDimension[]
}

// ── Severidad: GRIS deliberadamente por encima de VERDE ──────────────
export const SEVERIDAD: Record<Color, number> = {
  VERDE: 0, GRIS: 1, AMARILLO: 2, NARANJA: 3, ROJO: 4,
}

function masSevero(a: Color, b: Color): Color {
  return SEVERIDAD[a] >= SEVERIDAD[b] ? a : b
}

function diffDays(fromISO: string, toISO: string): number {
  const [fy, fm, fd] = fromISO.split('-').map(Number)
  const [ty, tm, td] = toISO.split('-').map(Number)
  return Math.floor((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000)
}

// ── 2.1 Resolución por especificidad: PRODUCTO > CATEGORIA(cadena) > GLOBAL ──
export function resolverReglaAplicable(
  reglas: Regla[], tipo: TipoRegla, productoId: string, categoriaChain: string[]
): Regla | null {
  const delTipo = reglas.filter((r) => r.tipo === tipo)
  const prod = delTipo.find((r) => r.ambito === 'PRODUCTO' && r.ambito_id === productoId)
  if (prod) return prod
  for (const catId of categoriaChain) {
    const cat = delTipo.find((r) => r.ambito === 'CATEGORIA' && r.ambito_id === catId)
    if (cat) return cat
  }
  return delTipo.find((r) => r.ambito === 'GLOBAL') ?? null
}

// ── 2.2 Extracción del valor por tipo ──────────────────────────────
interface Valor { num: number | null; text: string | null; faltaDato: boolean; skip: boolean }

export function extraerValor(tipo: TipoRegla, lote: LoteEval, hoyISO: string, ahoraMs: number): Valor {
  switch (tipo) {
    case 'VENCIMIENTO': {
      if (!lote.fecha_vencimiento) return { num: null, text: null, faltaDato: true, skip: false }
      return { num: diffDays(hoyISO, lote.fecha_vencimiento), text: null, faltaDato: false, skip: false }
    }
    case 'POST_APERTURA': {
      if (!lote.fecha_apertura) return { num: null, text: null, faltaDato: false, skip: true }
      const horas = (ahoraMs - new Date(lote.fecha_apertura).getTime()) / 3600000
      return { num: horas, text: null, faltaDato: false, skip: false }
    }
    case 'TRAZABILIDAD': {
      let faltantes = 0
      if (!lote.codigo_lote) faltantes++
      if (!lote.proveedor_id) faltantes++
      if (!lote.fecha_vencimiento) faltantes++
      return { num: faltantes, text: null, faltaDato: false, skip: false }
    }
    case 'CUARENTENA':
      return { num: null, text: lote.estado_cuarentena, faltaDato: false, skip: false }
    case 'STOCK_MINIMO':
      return { num: lote.cantidad, text: null, faltaDato: false, skip: false }
    // Fase 2: requieren lectura de equipo — sin dato aquí
    case 'TEMPERATURA':
    case 'LECTURA_VENCIDA':
      return { num: null, text: null, faltaDato: true, skip: false }
  }
}

// ── 2.x Evaluación de un umbral contra un valor ────────────────────
export function evaluarUmbral(u: Umbral, num: number | null, text: string | null): boolean {
  switch (u.operador) {
    case 'GT':  return num !== null && u.valor_min !== null && num >  u.valor_min
    case 'GTE': return num !== null && u.valor_min !== null && num >= u.valor_min
    case 'LT':  return num !== null && u.valor_max !== null && num <  u.valor_max
    case 'LTE': return num !== null && u.valor_max !== null && num <= u.valor_max
    case 'BETWEEN':
      return num !== null && u.valor_min !== null && u.valor_max !== null &&
             num >= u.valor_min && num <= u.valor_max
    case 'EQ':
      if (u.valor_text !== null) return text === u.valor_text
      return num !== null && u.valor_min !== null && num === u.valor_min
    case 'IN':
      return u.valor_text !== null && text !== null &&
             u.valor_text.split(',').map((s) => s.trim()).includes(text)
    case 'IS_NULL':
      return num === null && (text === null || text === '')
    default:
      return false
  }
}

// Evalúa una dimensión (tipo) → color + umbral disparado
function evaluarDimension(tipo: TipoRegla, regla: Regla, v: Valor): DetalleDimension {
  const base = { tipo, valor_evaluado: v.num, valor_text: v.text, regla_id: regla.id, regla_version: regla.version }

  if (v.faltaDato) {
    return { ...base, color: 'GRIS', umbral_snapshot: null, accion: null, mensaje: null, motivo: 'SIN_DATO' }
  }

  // Umbrales que hacen match; si varios (solape de borde), gana el más severo
  const matches = regla.umbrales.filter((u) => evaluarUmbral(u, v.num, v.text))
  if (matches.length === 0) {
    return { ...base, color: 'GRIS', umbral_snapshot: null, accion: null, mensaje: null, motivo: 'SIN_COBERTURA' }
  }
  const ganador = matches.reduce((a, b) => (SEVERIDAD[b.color] > SEVERIDAD[a.color] ? b : a))
  return {
    ...base, color: ganador.color, umbral_snapshot: ganador,
    accion: ganador.accion, mensaje: ganador.mensaje ?? null,
  }
}

// ── 2.3 Evaluación completa del lote ───────────────────────────────
export function evaluarLote(args: {
  lote: LoteEval
  reglas: Regla[]
  tiposActivos: TipoRegla[]     // tipos con al menos una regla activa en el tenant
  categoriaChain: string[]      // ids de categoría, de específica a raíz
  hoyISO: string
  ahoraMs: number
}): ResultadoLote {
  const { lote, reglas, tiposActivos, categoriaChain, hoyISO, ahoraMs } = args
  const detalle: DetalleDimension[] = []

  for (const tipo of tiposActivos) {
    const regla = resolverReglaAplicable(reglas, tipo, lote.producto_id, categoriaChain)
    if (!regla) {
      detalle.push({
        tipo, color: 'GRIS', valor_evaluado: null, valor_text: null,
        regla_id: null, regla_version: null, umbral_snapshot: null,
        accion: null, mensaje: null, motivo: 'SIN_REGLA_CONFIGURADA',
      })
      continue
    }
    const v = extraerValor(tipo, lote, hoyISO, ahoraMs)
    if (v.skip) continue
    detalle.push(evaluarDimension(tipo, regla, v))
  }

  let color_final: Color = detalle.length === 0 ? 'GRIS' : 'VERDE'
  let bloqueo_salida = false
  let bloqueo_ingreso = false
  for (const d of detalle) {
    color_final = masSevero(color_final, d.color)
    if (d.accion === 'BLOQUEA_SALIDA') bloqueo_salida = true
    if (d.accion === 'BLOQUEA_INGRESO') bloqueo_ingreso = true
  }

  return { color_final, bloqueo_salida, bloqueo_ingreso, detalle }
}

// ════════════════════════════════════════════════════════════════════
// Validación al guardar una regla (§3 del spec)
// ════════════════════════════════════════════════════════════════════

export interface ValidacionRegla {
  errores: string[]        // bloquean el guardado
  advertencias: string[]   // requieren confirmación
}

// Convierte un umbral numérico a intervalo [lo, hi] para detectar solapamiento
function intervalo(u: Umbral): [number, number] | null {
  const INF = Number.POSITIVE_INFINITY
  switch (u.operador) {
    case 'GT':
    case 'GTE': return u.valor_min !== null ? [u.valor_min, INF] : null
    case 'LT':
    case 'LTE': return u.valor_max !== null ? [-INF, u.valor_max] : null
    case 'BETWEEN': return (u.valor_min !== null && u.valor_max !== null) ? [u.valor_min, u.valor_max] : null
    case 'EQ': return u.valor_min !== null ? [u.valor_min, u.valor_min] : null
    default: return null // EQ text / IN / IS_NULL no son numéricos
  }
}

export function validarUmbrales(tipo: TipoRegla, umbrales: Umbral[]): ValidacionRegla {
  const errores: string[] = []
  const advertencias: string[] = []

  if (umbrales.length === 0) {
    errores.push('La regla no tiene umbrales.')
    return { errores, advertencias }
  }

  // 4. Unidad inconsistente con el tipo
  const esperada = UNIDAD_POR_TIPO[tipo]
  for (const u of umbrales) {
    if (u.unidad && esperada !== '-' && u.unidad !== esperada) {
      errores.push(`Unidad "${u.unidad}" no corresponde al tipo ${tipo} (esperada: ${esperada}).`)
    }
  }

  // 1. Solapamiento de rangos numéricos (interiores que se cruzan; tocar bordes es válido)
  const ivs = umbrales.map((u) => ({ u, iv: intervalo(u) })).filter((x) => x.iv) as { u: Umbral; iv: [number, number] }[]
  for (let i = 0; i < ivs.length; i++) {
    for (let j = i + 1; j < ivs.length; j++) {
      const [a1, a2] = ivs[i].iv
      const [b1, b2] = ivs[j].iv
      const lo = Math.max(a1, b1)
      const hi = Math.min(a2, b2)
      if (lo < hi) { // solape de interior (no solo tocar un borde)
        errores.push(`Los umbrales ${ivs[i].u.color} y ${ivs[j].u.color} se solapan.`)
      }
    }
  }

  // 3. Falta ROJO
  if (!umbrales.some((u) => u.color === 'ROJO')) {
    advertencias.push('La regla no tiene ningún umbral ROJO; no bloqueará ni alertará riesgo crítico.')
  }

  // 2. Cobertura incompleta (solo chequeo simple sobre numéricos con ±inf)
  if (ivs.length > 0) {
    const cubreBajo = ivs.some(({ iv }) => iv[0] === Number.NEGATIVE_INFINITY)
    const cubreAlto = ivs.some(({ iv }) => iv[1] === Number.POSITIVE_INFINITY)
    if (!cubreBajo || !cubreAlto) {
      advertencias.push('Los umbrales no cubren todo el rango posible; los valores sin cubrir quedarán en GRIS.')
    }
  }

  // 5. Monotonía invertida en VENCIMIENTO (ROJO con más días que VERDE)
  if (tipo === 'VENCIMIENTO') {
    const rojo = umbrales.find((u) => u.color === 'ROJO')
    const verde = umbrales.find((u) => u.color === 'VERDE')
    const dias = (u?: Umbral) => (u ? (u.valor_min ?? u.valor_max) : null)
    const dr = dias(rojo), dv = dias(verde)
    if (dr !== null && dv !== null && dr > dv) {
      advertencias.push('El umbral ROJO tiene más días que el VERDE; revisa la orientación de la regla.')
    }
  }

  return { errores, advertencias }
}
