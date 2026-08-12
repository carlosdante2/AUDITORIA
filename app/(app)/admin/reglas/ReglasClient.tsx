'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { validarUmbrales, UNIDAD_POR_TIPO, type TipoRegla, type Color, type Umbral, type Accion, type Operador } from '@/lib/reglas-engine'
import { Plus, Trash2, FlaskConical, Save, AlertTriangle, Pencil, Grid3x3 } from 'lucide-react'

interface UmbralRow extends Umbral {}
interface Regla {
  id: string; tipo: TipoRegla; ambito: string; ambito_id: string | null; nombre: string; version: number
  regla_umbrales: UmbralRow[]
}
interface Opt { id: string; nombre: string }
interface Props { initialReglas: Regla[]; categorias: Opt[]; productos: Opt[] }

const TIPOS: { v: TipoRegla; label: string }[] = [
  { v: 'VENCIMIENTO', label: 'Vencimiento (días)' },
  { v: 'TEMPERATURA', label: 'Temperatura (°C)' },
  { v: 'LECTURA_VENCIDA', label: 'Lectura vencida (horas sin medir)' },
  { v: 'TRAZABILIDAD', label: 'Trazabilidad (campos faltantes)' },
  { v: 'CUARENTENA', label: 'Cuarentena (estado)' },
  { v: 'STOCK_MINIMO', label: 'Stock mínimo (cantidad)' },
]
const COLORES: Color[] = ['VERDE', 'AMARILLO', 'NARANJA', 'ROJO']
const OPERADORES: Operador[] = ['GT', 'GTE', 'LT', 'LTE', 'BETWEEN', 'EQ', 'IN', 'IS_NULL']
const ACCIONES: Accion[] = ['SOLO_ALERTA', 'BLOQUEA_SALIDA', 'BLOQUEA_INGRESO', 'FUERZA_CUARENTENA']

const COLOR_CLS: Record<string, string> = {
  VERDE: 'bg-green-100 text-green-800 border-green-300',
  AMARILLO: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  NARANJA: 'bg-orange-100 text-orange-800 border-orange-300',
  ROJO: 'bg-red-100 text-red-800 border-red-300',
  GRIS: 'bg-gray-100 text-gray-600 border-gray-300',
}

function nuevoUmbral(tipo: TipoRegla, color: Color): UmbralRow {
  return { color, operador: 'GT', valor_min: null, valor_max: null, valor_text: null, unidad: UNIDAD_POR_TIPO[tipo], accion: 'SOLO_ALERTA', mensaje: null, orden: 0 }
}

export function ReglasClient({ initialReglas, categorias, productos }: Props) {
  const [reglas, setReglas] = useState<Regla[]>(initialReglas)
  const [editId, setEditId] = useState<string | null>(null)
  const [tipo, setTipo] = useState<TipoRegla>('VENCIMIENTO')
  const [ambito, setAmbito] = useState<'GLOBAL' | 'CATEGORIA' | 'PRODUCTO'>('GLOBAL')
  const [ambitoId, setAmbitoId] = useState<string>('')
  const [nombre, setNombre] = useState('')
  const [umbrales, setUmbrales] = useState<UmbralRow[]>([nuevoUmbral('VENCIMIENTO', 'ROJO')])
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  const validacion = useMemo(() => validarUmbrales(tipo, umbrales), [tipo, umbrales])

  function resetForm() {
    setEditId(null); setTipo('VENCIMIENTO'); setAmbito('GLOBAL'); setAmbitoId(''); setNombre('')
    setUmbrales([nuevoUmbral('VENCIMIENTO', 'ROJO')]); setSaveMsg(null)
  }

  function cargarParaEditar(r: Regla) {
    setEditId(r.id); setTipo(r.tipo); setAmbito(r.ambito as typeof ambito)
    setAmbitoId(r.ambito_id ?? ''); setNombre(r.nombre)
    setUmbrales(r.regla_umbrales.length ? r.regla_umbrales.map((u) => ({ ...u })) : [nuevoUmbral(r.tipo, 'ROJO')])
    setSaveMsg(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function setU(i: number, patch: Partial<UmbralRow>) {
    setUmbrales((prev) => prev.map((u, j) => (j === i ? { ...u, ...patch } : u)))
  }
  function addUmbral() { setUmbrales((prev) => [...prev, { ...nuevoUmbral(tipo, 'AMARILLO'), orden: prev.length }]) }
  function delUmbral(i: number) { setUmbrales((prev) => prev.filter((_, j) => j !== i)) }

  async function guardar(forzar = false) {
    if (validacion.errores.length > 0) return
    if (ambito !== 'GLOBAL' && !ambitoId) { setSaveMsg('Selecciona la categoría o producto del ámbito.'); return }
    setSaving(true); setSaveMsg(null)
    const url = editId ? `/api/reglas/${editId}` : '/api/reglas'
    const method = editId ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo, ambito, ambito_id: ambito === 'GLOBAL' ? null : ambitoId, nombre, umbrales, forzar }),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)

    if (res.status === 409 && data.error === 'CONFIRM_REQUIRED') {
      if (confirm('Advertencias:\n\n' + (data.advertencias ?? []).join('\n') + '\n\n¿Guardar de todas formas?')) {
        return guardar(true)
      }
      return
    }
    if (!res.ok) { setSaveMsg(data.message ?? (data.errores ?? []).join(' ') ?? 'Error al guardar'); return }

    setSaveMsg('✓ Regla guardada' + (editId ? ` (v${data.version})` : ''))
    // Refresca la lista simple: recarga desde el server la próxima navegación; aquí actualizamos en memoria
    const nueva: Regla = { id: data.id, tipo, ambito, ambito_id: ambito === 'GLOBAL' ? null : ambitoId, nombre, version: data.version ?? 1, regla_umbrales: umbrales }
    setReglas((prev) => [nueva, ...prev.filter((r) => r.id !== editId)])
    resetForm()
  }

  async function eliminar(id: string) {
    if (!confirm('¿Desactivar esta regla? (queda en el historial versionado)')) return
    const res = await fetch(`/api/reglas/${id}`, { method: 'DELETE' })
    if (res.ok) setReglas((prev) => prev.filter((r) => r.id !== id))
  }

  const targetOpts = ambito === 'CATEGORIA' ? categorias : ambito === 'PRODUCTO' ? productos : []

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reglas del semáforo</h1>
          <p className="text-sm text-gray-500">Define los umbrales por vencimiento, trazabilidad, cuarentena y stock. Nada está fijo en el código.</p>
        </div>
        <Link href="/admin/reglas/cobertura" className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 border border-indigo-200 bg-indigo-50 rounded-lg px-3 h-9">
          <Grid3x3 className="w-3.5 h-3.5" />Cobertura
        </Link>
      </div>

      {/* Builder */}
      <section className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-800">{editId ? 'Editar regla (crea nueva versión)' : 'Nueva regla'}</h2>
          {editId && <button onClick={resetForm} className="text-xs text-gray-500 underline">cancelar edición</button>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-xs font-semibold text-gray-600">Tipo</span>
            <select value={tipo} disabled={!!editId}
              onChange={(e) => { const t = e.target.value as TipoRegla; setTipo(t); setUmbrales((p) => p.map((u) => ({ ...u, unidad: UNIDAD_POR_TIPO[t] }))) }}
              className="w-full h-11 rounded-lg border border-gray-300 px-2 text-sm bg-white disabled:bg-gray-100">
              {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-gray-600">Ámbito</span>
            <select value={ambito} disabled={!!editId} onChange={(e) => { setAmbito(e.target.value as typeof ambito); setAmbitoId('') }}
              className="w-full h-11 rounded-lg border border-gray-300 px-2 text-sm bg-white disabled:bg-gray-100">
              <option value="GLOBAL">Global (todo el inventario)</option>
              <option value="CATEGORIA">Categoría</option>
              <option value="PRODUCTO">Producto</option>
            </select>
          </label>
        </div>

        {ambito !== 'GLOBAL' && (
          <label className="space-y-1 block">
            <span className="text-xs font-semibold text-gray-600">{ambito === 'CATEGORIA' ? 'Categoría' : 'Producto'}</span>
            <select value={ambitoId} disabled={!!editId} onChange={(e) => setAmbitoId(e.target.value)}
              className="w-full h-11 rounded-lg border border-gray-300 px-2 text-sm bg-white disabled:bg-gray-100">
              <option value="">Selecciona…</option>
              {targetOpts.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
            </select>
          </label>
        )}

        <label className="space-y-1 block">
          <span className="text-xs font-semibold text-gray-600">Nombre de la regla</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Vencimiento estándar"
            className="w-full h-11 rounded-lg border border-gray-300 px-3 text-sm" />
        </label>

        {/* Umbral table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600">Umbrales</span>
            <button onClick={addUmbral} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600"><Plus className="w-3.5 h-3.5" />Agregar</button>
          </div>
          <div className="space-y-2">
            {umbrales.map((u, i) => (
              <div key={i} className={`rounded-xl border p-2.5 space-y-2 ${COLOR_CLS[u.color]}`}>
                <div className="flex items-center gap-2">
                  <select value={u.color} onChange={(e) => setU(i, { color: e.target.value as Color })} className="h-9 rounded-lg border border-gray-300 px-1.5 text-xs bg-white text-gray-900">
                    {COLORES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={u.operador} onChange={(e) => setU(i, { operador: e.target.value as Operador })} className="h-9 rounded-lg border border-gray-300 px-1.5 text-xs bg-white text-gray-900">
                    {OPERADORES.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                  {(u.operador === 'GT' || u.operador === 'GTE' || u.operador === 'BETWEEN' || u.operador === 'EQ') && (
                    <input type="number" value={u.valor_min ?? ''} onChange={(e) => setU(i, { valor_min: e.target.value === '' ? null : Number(e.target.value) })}
                      placeholder="min" className="h-9 w-16 rounded-lg border border-gray-300 px-2 text-xs text-gray-900" />
                  )}
                  {(u.operador === 'LT' || u.operador === 'LTE' || u.operador === 'BETWEEN') && (
                    <input type="number" value={u.valor_max ?? ''} onChange={(e) => setU(i, { valor_max: e.target.value === '' ? null : Number(e.target.value) })}
                      placeholder="max" className="h-9 w-16 rounded-lg border border-gray-300 px-2 text-xs text-gray-900" />
                  )}
                  {(u.operador === 'IN' || (u.operador === 'EQ' && tipo === 'CUARENTENA')) && (
                    <input value={u.valor_text ?? ''} onChange={(e) => setU(i, { valor_text: e.target.value || null })}
                      placeholder="texto (coma=varios)" className="h-9 flex-1 rounded-lg border border-gray-300 px-2 text-xs text-gray-900" />
                  )}
                  <span className="text-[10px] text-gray-500">{u.unidad}</span>
                  <button onClick={() => delUmbral(i)} className="ml-auto p-1 text-gray-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="flex items-center gap-2">
                  <select value={u.accion} onChange={(e) => setU(i, { accion: e.target.value as Accion })} className="h-8 rounded-lg border border-gray-300 px-1.5 text-[11px] bg-white text-gray-900">
                    {ACCIONES.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <input value={u.mensaje ?? ''} onChange={(e) => setU(i, { mensaje: e.target.value || null })}
                    placeholder="mensaje al usuario (opcional)" className="h-8 flex-1 rounded-lg border border-gray-300 px-2 text-[11px] text-gray-900" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Validación en vivo */}
        {validacion.errores.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
            {validacion.errores.map((e, i) => <p key={i} className="text-xs text-red-700 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />{e}</p>)}
          </div>
        )}
        {validacion.advertencias.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
            {validacion.advertencias.map((a, i) => <p key={i} className="text-xs text-amber-700">⚠ {a}</p>)}
          </div>
        )}

        {saveMsg && <p className={`text-sm ${saveMsg.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>{saveMsg}</p>}
        <button onClick={() => guardar(false)} disabled={saving || validacion.errores.length > 0 || !nombre.trim()}
          className="w-full h-11 rounded-xl bg-blue-600 text-white text-sm font-bold disabled:opacity-50 inline-flex items-center justify-center gap-2">
          <Save className="w-4 h-4" />{saving ? 'Guardando…' : editId ? 'Guardar nueva versión' : 'Crear regla'}
        </button>
      </section>

      {/* Simulador */}
      <Simulador productos={productos} categorias={categorias} />

      {/* Reglas existentes */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-gray-800">Reglas vigentes ({reglas.length})</h2>
        {reglas.length === 0 && <p className="text-sm text-gray-400 text-center py-6">Aún no hay reglas. Crea la primera arriba.</p>}
        {reglas.map((r) => (
          <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">{r.nombre} <span className="text-xs font-normal text-gray-400">v{r.version}</span></p>
                <p className="text-xs text-gray-500">{r.tipo} · {r.ambito}{r.ambito !== 'GLOBAL' ? ` · ${targetName(r, categorias, productos)}` : ''}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => cargarParaEditar(r)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => eliminar(r.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {r.regla_umbrales.slice().sort((a, b) => a.orden - b.orden).map((u, i) => (
                <span key={i} className={`text-[11px] px-2 py-0.5 rounded-full border ${COLOR_CLS[u.color]}`}>
                  {u.color} {u.operador} {u.valor_text ?? [u.valor_min, u.valor_max].filter((x) => x !== null).join('–')}
                </span>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}

function targetName(r: Regla, categorias: Opt[], productos: Opt[]): string {
  const pool = r.ambito === 'CATEGORIA' ? categorias : productos
  return pool.find((o) => o.id === r.ambito_id)?.nombre ?? '—'
}

// ── Simulador ──────────────────────────────────────────────────────
function Simulador({ productos, categorias }: { productos: Opt[]; categorias: Opt[] }) {
  const [f, setF] = useState({ producto_id: '', categoria_id: '', fecha_vencimiento: '', codigo_lote: '', proveedor_id: '', estado_cuarentena: 'LIBRE', cantidad: '' })
  const [res, setRes] = useState<null | { color_final: string; bloqueo_salida: boolean; bloqueo_ingreso: boolean; detalle: { tipo: string; color: string; motivo?: string; mensaje?: string | null; regla_id: string | null }[] }>(null)
  const [loading, setLoading] = useState(false)

  async function simular() {
    setLoading(true)
    const res = await fetch('/api/reglas/simular', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        producto_id: f.producto_id || null, categoria_id: f.categoria_id || null,
        fecha_vencimiento: f.fecha_vencimiento || null, codigo_lote: f.codigo_lote || null,
        proveedor_id: f.proveedor_id || null, estado_cuarentena: f.estado_cuarentena,
        cantidad: f.cantidad ? Number(f.cantidad) : 0,
      }),
    })
    setRes(await res.json()); setLoading(false)
  }

  return (
    <section className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 space-y-3">
      <h2 className="text-sm font-bold text-indigo-900 flex items-center gap-1.5"><FlaskConical className="w-4 h-4" />Simulador</h2>
      <p className="text-xs text-indigo-700">Prueba un lote hipotético y mira qué color sale y qué regla ganó.</p>

      <div className="grid grid-cols-2 gap-2">
        <select value={f.categoria_id} onChange={(e) => setF({ ...f, categoria_id: e.target.value })} className="h-10 rounded-lg border border-gray-300 px-2 text-xs bg-white col-span-2">
          <option value="">Categoría (para reglas de categoría)…</option>
          {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <label className="text-[11px] text-gray-600">Vencimiento<input type="date" value={f.fecha_vencimiento} onChange={(e) => setF({ ...f, fecha_vencimiento: e.target.value })} className="w-full h-10 rounded-lg border border-gray-300 px-2 text-xs" /></label>
        <label className="text-[11px] text-gray-600">Cantidad<input type="number" value={f.cantidad} onChange={(e) => setF({ ...f, cantidad: e.target.value })} className="w-full h-10 rounded-lg border border-gray-300 px-2 text-xs" /></label>
        <label className="text-[11px] text-gray-600">Código lote<input value={f.codigo_lote} onChange={(e) => setF({ ...f, codigo_lote: e.target.value })} placeholder="(vacío = falta)" className="w-full h-10 rounded-lg border border-gray-300 px-2 text-xs" /></label>
        <label className="text-[11px] text-gray-600">Proveedor<input value={f.proveedor_id} onChange={(e) => setF({ ...f, proveedor_id: e.target.value })} placeholder="(vacío = falta)" className="w-full h-10 rounded-lg border border-gray-300 px-2 text-xs" /></label>
        <label className="text-[11px] text-gray-600 col-span-2">Cuarentena
          <select value={f.estado_cuarentena} onChange={(e) => setF({ ...f, estado_cuarentena: e.target.value })} className="w-full h-10 rounded-lg border border-gray-300 px-2 text-xs bg-white">
            {['LIBRE', 'EN_EVALUACION', 'NO_CONFORME', 'LIBERADO'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>

      <button onClick={simular} disabled={loading} className="w-full h-10 rounded-xl bg-indigo-600 text-white text-sm font-bold disabled:opacity-50">
        {loading ? 'Evaluando…' : 'Simular'}
      </button>

      {res && (
        <div className="bg-white rounded-xl border border-indigo-100 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-black px-3 py-1 rounded-full border ${COLOR_CLS[res.color_final]}`}>{res.color_final}</span>
            {res.bloqueo_salida && <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">bloquea salida</span>}
            {res.bloqueo_ingreso && <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">bloquea ingreso</span>}
          </div>
          <div className="space-y-1">
            {res.detalle.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-gray-600">{d.tipo}</span>
                <span className="flex items-center gap-2">
                  {d.motivo && <span className="text-[10px] text-gray-400">{d.motivo}</span>}
                  {d.mensaje && <span className="text-[10px] text-gray-500 max-w-[160px] truncate">{d.mensaje}</span>}
                  <span className={`px-2 py-0.5 rounded-full border ${COLOR_CLS[d.color]}`}>{d.color}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
