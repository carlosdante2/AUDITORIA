import { describe, it, expect } from 'vitest'
import {
  evaluarLote,
  resolverReglaAplicable,
  evaluarUmbral,
  validarUmbrales,
  type Regla,
  type Umbral,
  type LoteEval,
  type TipoRegla,
  type Color,
  type Operador,
  type Accion,
} from '../reglas-engine'
import { estrategiaRecomendada, odsDeEstrategia } from '../economia-circular'

// ================================================================
// Suite del MOTOR CONFIGURABLE (spec §5, Anexo Técnico).
// Regla de oro: ningún umbral vive en el código de producción.
// Aquí los umbrales SÍ son datos de prueba (fixtures), como los
// definiría un admin — que es exactamente lo que valida el motor.
// Los fixtures reproducen el seed del spec §5.7.
// ================================================================

// ── Helpers para construir umbrales/reglas de forma concisa ──────────
function umbral(
  color: Color,
  operador: Operador,
  opts: Partial<Umbral> = {},
): Umbral {
  return {
    color,
    operador,
    valor_min: opts.valor_min ?? null,
    valor_max: opts.valor_max ?? null,
    valor_text: opts.valor_text ?? null,
    unidad: opts.unidad ?? null,
    accion: opts.accion ?? 'SOLO_ALERTA',
    mensaje: opts.mensaje ?? null,
    orden: opts.orden ?? 0,
    estrategia_circular: opts.estrategia_circular ?? null,
  }
}

function regla(
  tipo: TipoRegla,
  ambito: Regla['ambito'],
  ambito_id: string | null,
  umbrales: Umbral[],
  id = `${tipo}-${ambito}`,
): Regla {
  return { id, tipo, ambito, ambito_id, version: 1, umbrales }
}

// Seed §5.7: VENCIMIENTO estándar (GLOBAL)
const reglaVencimiento = regla('VENCIMIENTO', 'GLOBAL', null, [
  umbral('VERDE', 'GT', { valor_min: 15, unidad: 'dias' }),
  umbral('AMARILLO', 'BETWEEN', { valor_min: 7, valor_max: 15, unidad: 'dias' }),
  umbral('NARANJA', 'BETWEEN', { valor_min: 1, valor_max: 6, unidad: 'dias' }),
  umbral('ROJO', 'LTE', { valor_max: 0, unidad: 'dias', accion: 'BLOQUEA_SALIDA' }),
])

// Seed §5.7: TEMPERATURA congelados (CATEGORIA)
const CAT_CONGELADOS = 'cat-congelados'
const reglaTemperatura = regla('TEMPERATURA', 'CATEGORIA', CAT_CONGELADOS, [
  umbral('VERDE', 'LTE', { valor_max: -18, unidad: 'celsius' }),
  umbral('AMARILLO', 'BETWEEN', { valor_min: -18, valor_max: -15, unidad: 'celsius' }),
  umbral('ROJO', 'GT', { valor_min: -15, unidad: 'celsius', accion: 'FUERZA_CUARENTENA' }),
])

// Seed §5.7: TRAZABILIDAD campos obligatorios (GLOBAL)
const reglaTrazabilidad = regla('TRAZABILIDAD', 'GLOBAL', null, [
  umbral('VERDE', 'EQ', { valor_min: 0, unidad: '-' }),
  umbral('ROJO', 'GTE', {
    valor_min: 1,
    unidad: '-',
    accion: 'BLOQUEA_INGRESO',
    mensaje: 'Lote sin código, proveedor o fecha de vencimiento',
  }),
])

// CUARENTENA (GLOBAL) — texto/enum
const reglaCuarentena = regla('CUARENTENA', 'GLOBAL', null, [
  umbral('VERDE', 'EQ', { valor_text: 'LIBRE' }),
  umbral('ROJO', 'IN', { valor_text: 'NO_CONFORME,EN_EVALUACION', accion: 'BLOQUEA_SALIDA' }),
])

// LECTURA_VENCIDA (GLOBAL) — horas sin lectura
const reglaLecturaVencida = regla('LECTURA_VENCIDA', 'GLOBAL', null, [
  umbral('VERDE', 'LTE', { valor_max: 4, unidad: 'horas' }),
  umbral('ROJO', 'GT', { valor_min: 4, unidad: 'horas' }),
])

const HOY = '2026-08-12'
const AHORA = Date.UTC(2026, 7, 12, 12, 0, 0)

// Lote sano de referencia (trazabilidad completa, en cámara de congelados)
function loteBase(overrides: Partial<LoteEval> = {}): LoteEval {
  return {
    producto_id: 'prod-1',
    categoria_id: CAT_CONGELADOS,
    codigo_lote: 'L-001',
    proveedor_id: 'prov-1',
    fecha_vencimiento: '2026-12-31',
    fecha_apertura: null,
    estado_cuarentena: 'LIBRE',
    cantidad: 100,
    temperatura_c: -20,
    ultima_lectura_ms: AHORA - 1 * 3600000,
    ...overrides,
  }
}

// ── §5.2.1 Resolución por especificidad ──────────────────────────────

describe('resolverReglaAplicable — especificidad §5.2.1', () => {
  const global = regla('VENCIMIENTO', 'GLOBAL', null, [], 'g')
  const cat = regla('VENCIMIENTO', 'CATEGORIA', 'cat-a', [], 'c')
  const prod = regla('VENCIMIENTO', 'PRODUCTO', 'prod-x', [], 'p')

  it('PRODUCTO gana sobre CATEGORIA y GLOBAL', () => {
    const r = resolverReglaAplicable([global, cat, prod], 'VENCIMIENTO', 'prod-x', ['cat-a'])
    expect(r?.id).toBe('p')
  })

  it('CATEGORIA gana sobre GLOBAL cuando no hay regla de producto', () => {
    const r = resolverReglaAplicable([global, cat], 'VENCIMIENTO', 'prod-x', ['cat-a'])
    expect(r?.id).toBe('c')
  })

  it('sube por la cadena de categorías (hijo → padre)', () => {
    const catPadre = regla('VENCIMIENTO', 'CATEGORIA', 'cat-padre', [], 'cp')
    const r = resolverReglaAplicable([global, catPadre], 'VENCIMIENTO', 'prod-x', ['cat-hijo', 'cat-padre'])
    expect(r?.id).toBe('cp')
  })

  it('cae a GLOBAL cuando no hay producto ni categoría', () => {
    const r = resolverReglaAplicable([global], 'VENCIMIENTO', 'prod-x', ['cat-a'])
    expect(r?.id).toBe('g')
  })

  it('devuelve null cuando no existe ninguna regla del tipo', () => {
    const r = resolverReglaAplicable([global, cat, prod], 'STOCK_MINIMO', 'prod-x', ['cat-a'])
    expect(r).toBeNull()
  })
})

// ── FR-020 / §5.2.1: sin regla → GRIS, nunca VERDE ───────────────────

describe('sin regla configurada → GRIS (FR-020)', () => {
  it('un tipo activo sin regla aplicable produce GRIS con motivo SIN_REGLA_CONFIGURADA', () => {
    const res = evaluarLote({
      lote: loteBase(),
      reglas: [], // ninguna regla
      tiposActivos: ['VENCIMIENTO'],
      categoriaChain: [CAT_CONGELADOS],
      hoyISO: HOY,
      ahoraMs: AHORA,
    })
    expect(res.color_final).toBe('GRIS')
    expect(res.detalle[0].motivo).toBe('SIN_REGLA_CONFIGURADA')
    expect(res.color_final).not.toBe('VERDE')
  })
})

// ── §5.2.2 Extracción del valor por tipo + coloreado ─────────────────

describe('VENCIMIENTO — seed §5.7', () => {
  const evaluar = (fecha_vencimiento: string | null) =>
    evaluarLote({
      lote: loteBase({ fecha_vencimiento }),
      reglas: [reglaVencimiento, reglaTrazabilidad, reglaTemperatura],
      tiposActivos: ['VENCIMIENTO'],
      categoriaChain: [CAT_CONGELADOS],
      hoyISO: HOY,
      ahoraMs: AHORA,
    })

  it('30 días restantes → VERDE', () => {
    expect(evaluar('2026-09-11').detalle[0].color).toBe('VERDE') // 30 días
  })
  it('8 días restantes → AMARILLO', () => {
    expect(evaluar('2026-08-20').detalle[0].color).toBe('AMARILLO')
  })
  it('3 días restantes → NARANJA', () => {
    expect(evaluar('2026-08-15').detalle[0].color).toBe('NARANJA')
  })
  it('vencido (0 o menos) → ROJO + bloqueo de salida', () => {
    const res = evaluar('2026-08-11') // -1 día
    expect(res.detalle[0].color).toBe('ROJO')
    expect(res.bloqueo_salida).toBe(true)
  })
  it('sin fecha de vencimiento → GRIS (SIN_DATO)', () => {
    const res = evaluar(null)
    expect(res.detalle[0].color).toBe('GRIS')
    expect(res.detalle[0].motivo).toBe('SIN_DATO')
  })
})

// ── §5.5 Obstáculo 2: producto exento de fecha (Res. 5109/2005) ──────
describe('VENCIMIENTO — producto exento de fecha (Res. 5109/2005)', () => {
  const evaluar = (o: Partial<LoteEval>) =>
    evaluarLote({
      lote: loteBase({ requiere_fecha_vencimiento: false, ...o }),
      reglas: [reglaVencimiento],
      tiposActivos: ['VENCIMIENTO'],
      categoriaChain: [CAT_CONGELADOS],
      hoyISO: HOY,
      ahoraMs: AHORA,
    })

  it('exento y sin fecha → se omite (skip), no GRIS; el lote puede quedar VERDE', () => {
    const res = evaluar({ fecha_vencimiento: null })
    expect(res.detalle).toHaveLength(0)   // dimensión omitida
    expect(res.color_final).toBe('GRIS')  // sin dimensiones → GRIS (no arrastrado por VENCIMIENTO)
  })

  it('exento pero CON fecha estimada → se evalúa igual', () => {
    const res = evaluar({ fecha_vencimiento: '2026-09-11' }) // 30 días
    expect(res.detalle[0].color).toBe('VERDE')
  })

  it('exento sin fecha, junto a otra dimensión sana → VERDE (no bloqueado por VENCIMIENTO)', () => {
    const res = evaluarLote({
      lote: loteBase({ requiere_fecha_vencimiento: false, fecha_vencimiento: null }),
      reglas: [reglaVencimiento, reglaTemperatura],
      tiposActivos: ['VENCIMIENTO', 'TEMPERATURA'],
      categoriaChain: [CAT_CONGELADOS],
      hoyISO: HOY,
      ahoraMs: AHORA,
    })
    expect(res.color_final).toBe('VERDE')
  })
})

// ── §5.5 Obstáculo 1: TRAZABILIDAD no penaliza fecha exenta ──────────
describe('TRAZABILIDAD — fecha exenta no cuenta como faltante (Res. 5109/2005)', () => {
  const evaluar = (o: Partial<LoteEval>) =>
    evaluarLote({
      lote: loteBase(o),
      reglas: [reglaTrazabilidad],
      tiposActivos: ['TRAZABILIDAD'],
      categoriaChain: [CAT_CONGELADOS],
      hoyISO: HOY,
      ahoraMs: AHORA,
    })

  it('exento sin fecha, con código y proveedor → 0 faltantes → VERDE', () => {
    const res = evaluar({ requiere_fecha_vencimiento: false, fecha_vencimiento: null })
    expect(res.detalle[0].valor_evaluado).toBe(0)
    expect(res.detalle[0].color).toBe('VERDE')
  })

  it('requiere fecha y no la trae → sigue contando el faltante → ROJO', () => {
    const res = evaluar({ requiere_fecha_vencimiento: true, fecha_vencimiento: null })
    expect(res.detalle[0].valor_evaluado).toBe(1)
    expect(res.detalle[0].color).toBe('ROJO')
  })
})

describe('TEMPERATURA — seed §5.7 (cadena de frío)', () => {
  const evaluar = (temperatura_c: number | null) =>
    evaluarLote({
      lote: loteBase({ temperatura_c }),
      reglas: [reglaTemperatura],
      tiposActivos: ['TEMPERATURA'],
      categoriaChain: [CAT_CONGELADOS],
      hoyISO: HOY,
      ahoraMs: AHORA,
    })

  it('-20 °C → VERDE', () => {
    expect(evaluar(-20).detalle[0].color).toBe('VERDE')
  })
  it('-16 °C → AMARILLO', () => {
    expect(evaluar(-16).detalle[0].color).toBe('AMARILLO')
  })
  it('-10 °C → ROJO + acción FUERZA_CUARENTENA (sin bloqueo salida/ingreso)', () => {
    const res = evaluar(-10)
    expect(res.detalle[0].color).toBe('ROJO')
    expect(res.detalle[0].accion).toBe('FUERZA_CUARENTENA')
    expect(res.bloqueo_salida).toBe(false)
    expect(res.bloqueo_ingreso).toBe(false)
  })
  it('sin lectura de temperatura → GRIS (offline §5.2.5)', () => {
    const res = evaluar(null)
    expect(res.detalle[0].color).toBe('GRIS')
    expect(res.detalle[0].motivo).toBe('SIN_DATO')
  })
})

describe('LECTURA_VENCIDA — horas sin lectura', () => {
  const evaluar = (ultima_lectura_ms: number | null) =>
    evaluarLote({
      lote: loteBase({ ultima_lectura_ms }),
      reglas: [reglaLecturaVencida],
      tiposActivos: ['LECTURA_VENCIDA'],
      categoriaChain: [CAT_CONGELADOS],
      hoyISO: HOY,
      ahoraMs: AHORA,
    })

  it('1 hora sin lectura → VERDE', () => {
    expect(evaluar(AHORA - 1 * 3600000).detalle[0].color).toBe('VERDE')
  })
  it('6 horas sin lectura → ROJO', () => {
    expect(evaluar(AHORA - 6 * 3600000).detalle[0].color).toBe('ROJO')
  })
  it('sin ninguna lectura → GRIS (offline §5.2.5)', () => {
    expect(evaluar(null).detalle[0].color).toBe('GRIS')
  })
})

describe('TRAZABILIDAD — seed §5.7', () => {
  const evaluar = (o: Partial<LoteEval>) =>
    evaluarLote({
      lote: loteBase(o),
      reglas: [reglaTrazabilidad],
      tiposActivos: ['TRAZABILIDAD'],
      categoriaChain: [CAT_CONGELADOS],
      hoyISO: HOY,
      ahoraMs: AHORA,
    })

  it('todos los campos presentes → VERDE', () => {
    expect(evaluar({}).detalle[0].color).toBe('VERDE')
  })
  it('falta código de lote → ROJO + bloqueo de ingreso', () => {
    const res = evaluar({ codigo_lote: null })
    expect(res.detalle[0].color).toBe('ROJO')
    expect(res.bloqueo_ingreso).toBe(true)
  })
  it('faltan varios campos → ROJO (GTE 1)', () => {
    const res = evaluar({ codigo_lote: null, proveedor_id: null, fecha_vencimiento: null })
    expect(res.detalle[0].color).toBe('ROJO')
    expect(res.detalle[0].valor_evaluado).toBe(3)
  })
})

describe('CUARENTENA — enum por texto', () => {
  const evaluar = (estado_cuarentena: string) =>
    evaluarLote({
      lote: loteBase({ estado_cuarentena }),
      reglas: [reglaCuarentena],
      tiposActivos: ['CUARENTENA'],
      categoriaChain: [CAT_CONGELADOS],
      hoyISO: HOY,
      ahoraMs: AHORA,
    })

  it('LIBRE → VERDE', () => {
    expect(evaluar('LIBRE').detalle[0].color).toBe('VERDE')
  })
  it('NO_CONFORME → ROJO + bloqueo salida (operador IN)', () => {
    const res = evaluar('NO_CONFORME')
    expect(res.detalle[0].color).toBe('ROJO')
    expect(res.bloqueo_salida).toBe(true)
  })
})

// ── §5.2.3 Agregación por severidad ──────────────────────────────────

describe('agregación — §5.2.3', () => {
  it('color_final es el más severo entre dimensiones', () => {
    // VENCIMIENTO verde (lejos) + TEMPERATURA roja (-10) → ROJO gana
    const res = evaluarLote({
      lote: loteBase({ fecha_vencimiento: '2026-12-31', temperatura_c: -10 }),
      reglas: [reglaVencimiento, reglaTemperatura],
      tiposActivos: ['VENCIMIENTO', 'TEMPERATURA'],
      categoriaChain: [CAT_CONGELADOS],
      hoyISO: HOY,
      ahoraMs: AHORA,
    })
    expect(res.color_final).toBe('ROJO')
  })

  it('GRIS pesa más que VERDE en el color final (FR-020)', () => {
    // VENCIMIENTO verde + TEMPERATURA sin dato (GRIS) → GRIS gana a VERDE
    const res = evaluarLote({
      lote: loteBase({ fecha_vencimiento: '2026-12-31', temperatura_c: null }),
      reglas: [reglaVencimiento, reglaTemperatura],
      tiposActivos: ['VENCIMIENTO', 'TEMPERATURA'],
      categoriaChain: [CAT_CONGELADOS],
      hoyISO: HOY,
      ahoraMs: AHORA,
    })
    expect(res.color_final).toBe('GRIS')
  })

  it('bloqueos se agregan por OR de todos los umbrales disparados (FR-021)', () => {
    // VENCIMIENTO vencido (BLOQUEA_SALIDA) + TRAZABILIDAD incompleta (BLOQUEA_INGRESO)
    const res = evaluarLote({
      lote: loteBase({ fecha_vencimiento: '2026-08-11', codigo_lote: null }),
      reglas: [reglaVencimiento, reglaTrazabilidad],
      tiposActivos: ['VENCIMIENTO', 'TRAZABILIDAD'],
      categoriaChain: [CAT_CONGELADOS],
      hoyISO: HOY,
      ahoraMs: AHORA,
    })
    expect(res.bloqueo_salida).toBe(true)
    expect(res.bloqueo_ingreso).toBe(true)
  })

  it('sin dimensiones evaluadas → GRIS', () => {
    const res = evaluarLote({
      lote: loteBase(),
      reglas: [],
      tiposActivos: [],
      categoriaChain: [],
      hoyISO: HOY,
      ahoraMs: AHORA,
    })
    expect(res.color_final).toBe('GRIS')
    expect(res.detalle).toHaveLength(0)
  })

  it('POST_APERTURA sin fecha_apertura se omite (skip), no aparece en el detalle', () => {
    const reglaApertura = regla('POST_APERTURA', 'GLOBAL', null, [
      umbral('VERDE', 'LTE', { valor_max: 24, unidad: 'horas' }),
      umbral('ROJO', 'GT', { valor_min: 24, unidad: 'horas' }),
    ])
    const res = evaluarLote({
      lote: loteBase({ fecha_apertura: null }),
      reglas: [reglaApertura],
      tiposActivos: ['POST_APERTURA'],
      categoriaChain: [CAT_CONGELADOS],
      hoyISO: HOY,
      ahoraMs: AHORA,
    })
    expect(res.detalle).toHaveLength(0)
    expect(res.color_final).toBe('GRIS') // sin dimensiones → GRIS
  })
})

// ── Economía circular / valorización (decisión 2026-08-12) ───────────

describe('estrategia_circular — valorización', () => {
  // VENCIMIENTO con estrategias por umbral: AMARILLO redistribuir, ROJO banco de alimentos
  const reglaVencConEstrategia = regla('VENCIMIENTO', 'GLOBAL', null, [
    umbral('VERDE', 'GT', { valor_min: 15, unidad: 'dias' }),
    umbral('AMARILLO', 'BETWEEN', { valor_min: 7, valor_max: 15, unidad: 'dias', estrategia_circular: 'REDISTRIBUCION_INTERNA' }),
    umbral('NARANJA', 'BETWEEN', { valor_min: 1, valor_max: 6, unidad: 'dias', estrategia_circular: 'BANCO_ALIMENTOS' }),
    umbral('ROJO', 'LTE', { valor_max: 0, unidad: 'dias', accion: 'BLOQUEA_SALIDA', estrategia_circular: 'COMPOSTAJE' }),
  ])

  const evaluar = (fecha_vencimiento: string) =>
    evaluarLote({
      lote: loteBase({ fecha_vencimiento }),
      reglas: [reglaVencConEstrategia],
      tiposActivos: ['VENCIMIENTO'],
      categoriaChain: [CAT_CONGELADOS],
      hoyISO: HOY,
      ahoraMs: AHORA,
    })

  it('propaga la estrategia del umbral ganador al detalle', () => {
    const res = evaluar('2026-08-20') // 8 días → AMARILLO
    expect(res.detalle[0].estrategia_circular).toBe('REDISTRIBUCION_INTERNA')
  })

  it('estrategiaRecomendada devuelve la del umbral por vencer (banco de alimentos)', () => {
    const res = evaluar('2026-08-15') // 3 días → NARANJA
    expect(estrategiaRecomendada(res)).toBe('BANCO_ALIMENTOS')
  })

  it('deriva los ODS de la estrategia (banco de alimentos → ODS 2 y 12)', () => {
    const ods = odsDeEstrategia('BANCO_ALIMENTOS')
    expect(ods).toContain('ODS 2: Hambre cero')
    expect(ods).toContain('ODS 12: Producción y consumo responsables')
  })

  it('un umbral sin estrategia deja estrategia_circular en null', () => {
    const res = evaluar('2026-09-11') // 30 días → VERDE (sin estrategia)
    expect(res.detalle[0].estrategia_circular).toBeNull()
    expect(estrategiaRecomendada(res)).toBeNull()
  })

  it('elige la estrategia de la dimensión más severa cuando hay varias', () => {
    // TEMPERATURA roja con compostaje + VENCIMIENTO amarillo con redistribución → gana la roja
    const reglaTempEstr = regla('TEMPERATURA', 'CATEGORIA', CAT_CONGELADOS, [
      umbral('VERDE', 'LTE', { valor_max: -18, unidad: 'celsius' }),
      umbral('ROJO', 'GT', { valor_min: -15, unidad: 'celsius', estrategia_circular: 'DISPOSICION_CONTROLADA' }),
    ])
    const res = evaluarLote({
      lote: loteBase({ fecha_vencimiento: '2026-08-20', temperatura_c: -10 }),
      reglas: [reglaVencConEstrategia, reglaTempEstr],
      tiposActivos: ['VENCIMIENTO', 'TEMPERATURA'],
      categoriaChain: [CAT_CONGELADOS],
      hoyISO: HOY,
      ahoraMs: AHORA,
    })
    expect(res.color_final).toBe('ROJO')
    expect(estrategiaRecomendada(res)).toBe('DISPOSICION_CONTROLADA')
  })
})

// ── Operadores individuales ──────────────────────────────────────────

describe('evaluarUmbral — operadores', () => {
  it('GT / GTE / LT / LTE', () => {
    expect(evaluarUmbral(umbral('VERDE', 'GT', { valor_min: 5 }), 6, null)).toBe(true)
    expect(evaluarUmbral(umbral('VERDE', 'GT', { valor_min: 5 }), 5, null)).toBe(false)
    expect(evaluarUmbral(umbral('VERDE', 'GTE', { valor_min: 5 }), 5, null)).toBe(true)
    expect(evaluarUmbral(umbral('VERDE', 'LT', { valor_max: 5 }), 4, null)).toBe(true)
    expect(evaluarUmbral(umbral('VERDE', 'LTE', { valor_max: 5 }), 5, null)).toBe(true)
  })
  it('BETWEEN es inclusivo en ambos bordes', () => {
    const u = umbral('VERDE', 'BETWEEN', { valor_min: 1, valor_max: 6 })
    expect(evaluarUmbral(u, 1, null)).toBe(true)
    expect(evaluarUmbral(u, 6, null)).toBe(true)
    expect(evaluarUmbral(u, 7, null)).toBe(false)
  })
  it('EQ sobre texto e IN sobre lista', () => {
    expect(evaluarUmbral(umbral('VERDE', 'EQ', { valor_text: 'LIBRE' }), null, 'LIBRE')).toBe(true)
    expect(evaluarUmbral(umbral('VERDE', 'IN', { valor_text: 'A,B,C' }), null, 'B')).toBe(true)
    expect(evaluarUmbral(umbral('VERDE', 'IN', { valor_text: 'A,B,C' }), null, 'Z')).toBe(false)
  })
  it('IS_NULL', () => {
    expect(evaluarUmbral(umbral('VERDE', 'IS_NULL'), null, null)).toBe(true)
    expect(evaluarUmbral(umbral('VERDE', 'IS_NULL'), 3, null)).toBe(false)
  })
})

// ── §5.3 Validaciones al guardar una regla (FR-023) ──────────────────

describe('validarUmbrales — §5.3 / FR-023', () => {
  it('el seed VENCIMIENTO válido no produce errores', () => {
    const v = validarUmbrales('VENCIMIENTO', reglaVencimiento.umbrales)
    expect(v.errores).toHaveLength(0)
  })

  it('detecta solapamiento de rangos (error, bloquea)', () => {
    const v = validarUmbrales('VENCIMIENTO', [
      umbral('VERDE', 'BETWEEN', { valor_min: 5, valor_max: 15, unidad: 'dias' }),
      umbral('AMARILLO', 'BETWEEN', { valor_min: 10, valor_max: 20, unidad: 'dias' }),
      umbral('ROJO', 'LTE', { valor_max: 0, unidad: 'dias' }),
    ])
    expect(v.errores.some((e) => e.includes('solapan'))).toBe(true)
  })

  it('unidad incoherente con el tipo → error', () => {
    const v = validarUmbrales('VENCIMIENTO', [
      umbral('VERDE', 'GT', { valor_min: 15, unidad: 'celsius' }), // debería ser dias
      umbral('ROJO', 'LTE', { valor_max: 0, unidad: 'dias' }),
    ])
    expect(v.errores.some((e) => e.includes('Unidad'))).toBe(true)
  })

  it('falta ROJO → advertencia (no error)', () => {
    const v = validarUmbrales('VENCIMIENTO', [
      umbral('VERDE', 'GT', { valor_min: 15, unidad: 'dias' }),
      umbral('AMARILLO', 'LTE', { valor_max: 15, unidad: 'dias' }),
    ])
    expect(v.errores).toHaveLength(0)
    expect(v.advertencias.some((a) => a.includes('ROJO'))).toBe(true)
  })

  it('cobertura incompleta → advertencia', () => {
    const v = validarUmbrales('VENCIMIENTO', [
      umbral('AMARILLO', 'BETWEEN', { valor_min: 7, valor_max: 15, unidad: 'dias' }),
      umbral('ROJO', 'BETWEEN', { valor_min: 1, valor_max: 6, unidad: 'dias' }),
    ])
    expect(v.advertencias.some((a) => a.includes('cubren'))).toBe(true)
  })

  it('monotonía invertida en VENCIMIENTO → advertencia', () => {
    const v = validarUmbrales('VENCIMIENTO', [
      umbral('VERDE', 'LTE', { valor_max: 2, unidad: 'dias' }),
      umbral('ROJO', 'GT', { valor_min: 20, unidad: 'dias' }),
    ])
    expect(v.advertencias.some((a) => a.includes('más días'))).toBe(true)
  })

  it('lista de umbrales vacía → error', () => {
    const v = validarUmbrales('VENCIMIENTO', [])
    expect(v.errores.length).toBeGreaterThan(0)
  })
})
