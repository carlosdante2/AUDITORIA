import { describe, it, expect } from 'vitest'
import { evaluarSemaforo, type SemaforoInput } from '../semaforo'

// ================================================================
// Fixtures derived directly from SEMAFORO_v2_accion_ODS.md examples
// and spec.md acceptance scenarios.
// ================================================================

const base: SemaforoInput = {
  subtipo_producto: 'enlatado',
  fecha_vencimiento: '2027-06-01',
  fecha_hoy: '2026-08-09',
  requiere_fecha_segun_norma: 'si',
  estado_empaque: 'intacto',
  observacion_visual: 'normal',
}

// ── VERDE ────────────────────────────────────────────────────────

describe('VERDE', () => {
  it('no_perecedero con fecha lejana → verde, fifo', () => {
    const result = evaluarSemaforo(base)
    expect(result.color).toBe('verde')
    expect(result.categoria_asignada).toBe('no_perecedero')
    expect(result.accion_sugerida).toBe('usar_segun_rotacion_fifo')
    expect(result.estrategia_economia_circular).toBeNull()
    expect(result.metodo_calculo).toBe('fecha_documentada')
  })

  it('perecedero_critico (carne_res) con 6 días → verde (umbral ≥5)', () => {
    const result = evaluarSemaforo({
      ...base,
      subtipo_producto: 'carne_res',
      fecha_vencimiento: '2026-08-15',
      fecha_hoy: '2026-08-09',
    })
    expect(result.color).toBe('verde')
    expect(result.categoria_asignada).toBe('perecedero_critico')
    expect(result.dias_restantes).toBe(6)
  })

  it('perecedero_intermedio (huevo) con 10 días → verde (umbral ≥7)', () => {
    const result = evaluarSemaforo({
      ...base,
      subtipo_producto: 'huevo',
      fecha_vencimiento: '2026-08-19',
      fecha_hoy: '2026-08-09',
    })
    expect(result.color).toBe('verde')
    expect(result.categoria_asignada).toBe('perecedero_intermedio')
    expect(result.dias_restantes).toBe(10)
  })

  it('no_perecedero sin fecha + requiere_fecha="no" → verde (producto estable)', () => {
    const result = evaluarSemaforo({
      ...base,
      subtipo_producto: 'granos_secos',
      fecha_vencimiento: null,
      requiere_fecha_segun_norma: 'no',
    })
    expect(result.color).toBe('verde')
    expect(result.metodo_calculo).toBe('no_aplica')
  })
})

// ── AMARILLO ─────────────────────────────────────────────────────

describe('AMARILLO', () => {
  // Ejemplo 1 del documento: bebida_refrigerada, vence en 3 días
  it('bebida_refrigerada vence en 3 días → amarillo (ejemplo 1 doc)', () => {
    const result = evaluarSemaforo({
      ...base,
      subtipo_producto: 'bebida_refrigerada',
      fecha_vencimiento: '2026-08-12',
      fecha_hoy: '2026-08-09',
    })
    expect(result.color).toBe('amarillo')
    expect(result.categoria_asignada).toBe('perecedero_intermedio')
    expect(result.dias_restantes).toBe(3)
    expect(result.accion_sugerida).toBe('priorizar_uso_inmediato')
    expect(result.estrategia_economia_circular).toBe('redistribucion_interna_o_donacion')
    expect(result.ods_relacionados).toContain('ODS 2: Hambre cero')
    expect(result.ods_relacionados).toContain('ODS 12: Producción y consumo responsables')
    expect(result.metodo_calculo).toBe('fecha_documentada')
  })

  it('perecedero_critico (carne_res) vence en 3 días → amarillo (umbral 1-4)', () => {
    const result = evaluarSemaforo({
      ...base,
      subtipo_producto: 'carne_res',
      fecha_vencimiento: '2026-08-12',
      fecha_hoy: '2026-08-09',
    })
    expect(result.color).toBe('amarillo')
    expect(result.dias_restantes).toBe(3)
    expect(result.accion_sugerida).toBe('priorizar_uso_inmediato')
  })

  it('no_perecedero vence en 15 días → amarillo (umbral 1-29)', () => {
    const result = evaluarSemaforo({
      ...base,
      subtipo_producto: 'enlatado',
      fecha_vencimiento: '2026-08-24',
      fecha_hoy: '2026-08-09',
    })
    expect(result.color).toBe('amarillo')
    expect(result.dias_restantes).toBe(15)
  })

  // Ejemplo 4 del documento: hojas_verdes sin fecha, recibidas hace 3 días
  it('hojas_verdes sin fecha + recibidas hace 3 días → amarillo estimado (ejemplo 4 doc)', () => {
    const result = evaluarSemaforo({
      ...base,
      subtipo_producto: 'hojas_verdes',
      fecha_vencimiento: null,
      requiere_fecha_segun_norma: 'no',
      fecha_recepcion_o_compra: '2026-08-06',
      fecha_hoy: '2026-08-09',
    })
    expect(result.color).toBe('amarillo')
    expect(result.categoria_asignada).toBe('perecedero_intermedio')
    expect(result.dias_restantes).toBe(3)   // 6 vida_util - 3 días transcurridos
    expect(result.metodo_calculo).toBe('estimado_por_recepcion')
    expect(result.accion_sugerida).toBe('priorizar_uso_inmediato')
    expect(result.estrategia_economia_circular).toBe('redistribucion_interna_o_donacion')
  })

  it('verde pero dano_leve en empaque → amarillo (ajuste final)', () => {
    const result = evaluarSemaforo({
      ...base,
      subtipo_producto: 'enlatado',
      fecha_vencimiento: '2027-06-01',
      estado_empaque: 'dano_leve',
    })
    expect(result.color).toBe('amarillo')
    expect(result.accion_sugerida).toBe('priorizar_uso_inmediato')
  })

  it('verde pero observacion dudosa → amarillo (ajuste final)', () => {
    const result = evaluarSemaforo({
      ...base,
      subtipo_producto: 'enlatado',
      fecha_vencimiento: '2027-06-01',
      observacion_visual: 'dudoso',
    })
    expect(result.color).toBe('amarillo')
    expect(result.accion_sugerida).toBe('priorizar_uso_inmediato')
  })

  it('perecedero_critico (carne_res) con 5 días → verde (límite inferior)', () => {
    const result = evaluarSemaforo({
      ...base,
      subtipo_producto: 'carne_res',
      fecha_vencimiento: '2026-08-14',
      fecha_hoy: '2026-08-09',
    })
    expect(result.color).toBe('verde')
    expect(result.dias_restantes).toBe(5)
  })

  it('perecedero_intermedio con 7 días → verde (límite inferior)', () => {
    const result = evaluarSemaforo({
      ...base,
      subtipo_producto: 'lacteo',
      fecha_vencimiento: '2026-08-16',
      fecha_hoy: '2026-08-09',
    })
    expect(result.color).toBe('verde')
    expect(result.dias_restantes).toBe(7)
  })

  it('perecedero_intermedio con 1 día → amarillo', () => {
    const result = evaluarSemaforo({
      ...base,
      subtipo_producto: 'lacteo',
      fecha_vencimiento: '2026-08-10',
      fecha_hoy: '2026-08-09',
    })
    expect(result.color).toBe('amarillo')
    expect(result.dias_restantes).toBe(1)
  })
})

// ── ROJO ─────────────────────────────────────────────────────────

describe('ROJO', () => {
  // Ejemplo 2 del documento: hielo con empaque roto
  it('empaque roto_abierto_fuga → rojo sanatorio (ejemplo 2 doc)', () => {
    const result = evaluarSemaforo({
      ...base,
      subtipo_producto: 'hielo_empaquetado',
      fecha_vencimiento: '2027-01-01',
      fecha_hoy: '2026-08-09',
      estado_empaque: 'roto_abierto_fuga',
    })
    expect(result.color).toBe('rojo')
    expect(result.accion_sugerida).toBe('retirar_consumo_humano_disposicion_controlada')
    expect(result.ods_relacionados).toContain('ODS 3: Salud y bienestar')
  })

  // Ejemplo 3 del documento: conserva vencida hace 18 días, intacta
  it('conserva vencida hace 18 días, empaque intacto → rojo + evaluar valorizacion (ejemplo 3 doc)', () => {
    const result = evaluarSemaforo({
      ...base,
      subtipo_producto: 'enlatado',
      fecha_vencimiento: '2026-07-22',
      fecha_hoy: '2026-08-09',
    })
    expect(result.color).toBe('rojo')
    expect(result.dias_restantes).toBe(-18)
    expect(result.categoria_asignada).toBe('no_perecedero')
    expect(result.accion_sugerida).toBe('retirar_consumo_humano_evaluar_valorizacion')
    expect(result.estrategia_economia_circular).toBe('evaluar_compostaje_o_alimentacion_animal_certificada')
    expect(result.ods_relacionados).toContain('ODS 12: Producción y consumo responsables')
  })

  it('producto vencido (dias_restantes = -1) → rojo', () => {
    const result = evaluarSemaforo({
      ...base,
      subtipo_producto: 'carne_res',
      fecha_vencimiento: '2026-08-08',
      fecha_hoy: '2026-08-09',
    })
    expect(result.color).toBe('rojo')
    expect(result.dias_restantes).toBe(-1)
  })

  it('vence hoy (dias_restantes = 0) → rojo', () => {
    const result = evaluarSemaforo({
      ...base,
      subtipo_producto: 'carne_res',
      fecha_vencimiento: '2026-08-09',
      fecha_hoy: '2026-08-09',
    })
    expect(result.color).toBe('rojo')
    expect(result.dias_restantes).toBe(0)
  })

  it('requiere_fecha="si" sin fecha → rojo (falta trazabilidad)', () => {
    const result = evaluarSemaforo({
      ...base,
      subtipo_producto: 'carne_res',
      fecha_vencimiento: null,
      requiere_fecha_segun_norma: 'si',
    })
    expect(result.color).toBe('rojo')
    expect(result.metodo_calculo).toBe('no_aplica')
  })

  it('observacion no_conforme → rojo sin importar fecha (prioridad sobre todo)', () => {
    const result = evaluarSemaforo({
      ...base,
      subtipo_producto: 'enlatado',
      fecha_vencimiento: '2027-06-01',  // fecha lejana
      observacion_visual: 'no_conforme',
    })
    expect(result.color).toBe('rojo')
    expect(result.accion_sugerida).toBe('retirar_consumo_humano_disposicion_controlada')
  })

  it('empaque roto en perecedero → rojo + disposicion_controlada (spec US2 AC2)', () => {
    const result = evaluarSemaforo({
      ...base,
      subtipo_producto: 'pollo',
      fecha_vencimiento: '2026-08-20',
      estado_empaque: 'roto_abierto_fuga',
    })
    expect(result.color).toBe('rojo')
    expect(result.accion_sugerida).toBe('retirar_consumo_humano_disposicion_controlada')
    expect(result.ods_relacionados).toContain('ODS 3: Salud y bienestar')
  })

  it('no_perecedero vencido + empaque dano_leve → rojo + separar_compostaje', () => {
    const result = evaluarSemaforo({
      ...base,
      subtipo_producto: 'granos_secos',
      fecha_vencimiento: '2026-07-01',
      fecha_hoy: '2026-08-09',
      estado_empaque: 'dano_leve',
    })
    expect(result.color).toBe('rojo')
    // Vencido → rojo. Empaque dano_leve en seco → separar reciclaje
    expect(result.estrategia_economia_circular).toBe('separar_compostaje_o_reciclaje_empaque')
  })

  it('frutas_verduras estimada: recibida hace 10 días (sobrepasa vida util) → rojo', () => {
    const result = evaluarSemaforo({
      ...base,
      subtipo_producto: 'frutas_verduras',
      fecha_vencimiento: null,
      requiere_fecha_segun_norma: 'no',
      fecha_recepcion_o_compra: '2026-07-30',
      fecha_hoy: '2026-08-09',
    })
    expect(result.color).toBe('rojo')
    expect(result.metodo_calculo).toBe('estimado_por_recepcion')
  })
})

// ── METODO DE CALCULO ────────────────────────────────────────────

describe('metodo_calculo', () => {
  it('con fecha_vencimiento → fecha_documentada', () => {
    const result = evaluarSemaforo(base)
    expect(result.metodo_calculo).toBe('fecha_documentada')
  })

  it('sin fecha + requiere="si" → no_aplica', () => {
    const result = evaluarSemaforo({
      ...base,
      fecha_vencimiento: null,
      requiere_fecha_segun_norma: 'si',
    })
    expect(result.metodo_calculo).toBe('no_aplica')
  })

  it('frutas con fecha_recepcion → estimado_por_recepcion', () => {
    const result = evaluarSemaforo({
      ...base,
      subtipo_producto: 'tomate',
      fecha_vencimiento: null,
      requiere_fecha_segun_norma: 'no',
      fecha_recepcion_o_compra: '2026-08-06',
      fecha_hoy: '2026-08-09',
    })
    expect(result.metodo_calculo).toBe('estimado_por_recepcion')
  })

  it('no_perecedero sin fecha + requiere="no" → no_aplica (producto estable)', () => {
    const result = evaluarSemaforo({
      ...base,
      subtipo_producto: 'granos_secos',
      fecha_vencimiento: null,
      requiere_fecha_segun_norma: 'no',
    })
    expect(result.metodo_calculo).toBe('no_aplica')
    expect(result.color).toBe('verde')
  })
})

// ── RAZON ────────────────────────────────────────────────────────

describe('razon constraints', () => {
  it('razon nunca supera 150 caracteres', () => {
    const casos: SemaforoInput[] = [
      base,
      { ...base, estado_empaque: 'roto_abierto_fuga' },
      { ...base, fecha_vencimiento: '2026-08-08', fecha_hoy: '2026-08-09' },
      {
        ...base,
        subtipo_producto: 'hojas_verdes',
        fecha_vencimiento: null,
        requiere_fecha_segun_norma: 'no',
        fecha_recepcion_o_compra: '2026-08-06',
      },
    ]
    for (const c of casos) {
      const result = evaluarSemaforo(c)
      expect(result.razon.length).toBeLessThanOrEqual(150)
    }
  })
})
