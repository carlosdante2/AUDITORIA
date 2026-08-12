'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Upload, CheckCircle, AlertTriangle, Download } from 'lucide-react'

const REQUIRED_COLS = ['nombre', 'unidad_medida', 'subtipo']
const VALID_SUBTIPOS = new Set([
  'carne_res','carne_cerdo','pollo','pescado','mariscos','lacteo','lacteo_fresco',
  'preparado_cocina','fruta_verdura_cortada_o_pelada','huevo','frutas_verduras',
  'hojas_verdes','hierbas_frescas','tomate','pepino','pimenton','calabacin',
  'zanahoria','remolacha','papa','cebolla','ajo','banano','citricos','manzana',
  'pera','mango','papaya','pina','berries','aguacate','bebida_refrigerada',
  'jugos_refrigerados','panaderia','panaderia_vida_corta','enlatado','conserva',
  'granos_secos','bebida','bebida_estable','aceite_grasa','agua','hielo_empaquetado',
  'galletas_cereales','leche_en_polvo','cafe_te','azucar_sal',
])

interface RowError { row: number; reason: string }
interface ImportResult { imported: number; errors: RowError[]; productIds: string[] }

interface ImportarClientProps { tenantId: string }

const TEMPLATE_CSV = `nombre,unidad_medida,subtipo,requiere_fecha_vencimiento
Leche Entera,litros,lacteo,si
Pollo Entero,unidades,pollo,si
Sal Marina,kg,azucar_sal,no
Arroz Blanco,kg,granos_secos,no
Filete de Salmon,kg,pescado,si
Pan de Molde,unidades,panaderia_vida_corta,si
Aceite de Girasol,litros,aceite_grasa,no
`

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = 'plantilla_catalogo.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export function ImportarClient({ tenantId }: ImportarClientProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<'idle' | 'parsing' | 'importing' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<ImportResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setStatus('parsing')
    setResult(null)
    setErrorMsg(null)

    try {
      const text = await file.text()
      const rows = parseCSV(text)

      if (rows.length === 0) throw new Error('El archivo está vacío o no tiene filas válidas')

      const headers = Object.keys(rows[0]).map((h) => h.toLowerCase().trim())
      const missingCols = REQUIRED_COLS.filter((c) => !headers.includes(c))
      if (missingCols.length > 0) {
        throw new Error(`Columnas requeridas faltantes: ${missingCols.join(', ')}`)
      }

      setStatus('importing')

      const supabase = createClient()
      const validRows: Record<string, string>[] = []
      const rowErrors: RowError[] = []

      rows.forEach((row, i) => {
        const r = normalizeRow(row)
        if (!r.nombre?.trim()) {
          rowErrors.push({ row: i + 2, reason: 'nombre vacío' })
        } else if (!r.unidad_medida?.trim()) {
          rowErrors.push({ row: i + 2, reason: 'unidad_medida vacía' })
        } else if (!VALID_SUBTIPOS.has(r.subtipo?.trim())) {
          rowErrors.push({ row: i + 2, reason: `subtipo inválido: "${r.subtipo}"` })
        } else {
          validRows.push(r)
        }
      })

      // Insert valid rows in batches of 50 (upsert by nombre+unidad)
      const insertedIds: string[] = []
      for (let i = 0; i < validRows.length; i += 50) {
        const batch = validRows.slice(i, i + 50).map((r) => ({
          tenant_id:                tenantId,
          nombre:                   r.nombre.trim(),
          unidad_medida:            r.unidad_medida.trim(),
          subtipo:                  r.subtipo.trim(),
          requiere_fecha_vencimiento: r.requiere_fecha_vencimiento?.toLowerCase() !== 'no',
          estado:                   'activo',
        }))

        const { data, error } = await supabase
          .from('products')
          .upsert(batch, { onConflict: 'tenant_id,nombre,unidad_medida', ignoreDuplicates: false })
          .select('id')

        if (!error && data) {
          insertedIds.push(...data.map((d: { id: string }) => d.id))
        } else if (error) {
          rowErrors.push({ row: i + 2, reason: error.message })
        }
      }

      setResult({ imported: insertedIds.length, errors: rowErrors, productIds: insertedIds })

      // Trigger embeddings for all imported products
      if (insertedIds.length > 0) {
        fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/embeddings`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_ids: insertedIds }),
          }
        ).catch(() => { /* embeddings are async — ignore failure */ })
      }

      setStatus('done')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error inesperado')
      setStatus('error')
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Importar catálogo</h1>
        <p className="text-sm text-gray-500">CSV con columnas: nombre, unidad_medida, subtipo, requiere_fecha_vencimiento (opcional)</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFile}
          className="sr-only"
          id="csv-input"
        />

        <label
          htmlFor="csv-input"
          className={`flex flex-col items-center justify-center gap-3 py-10 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
            status === 'parsing' || status === 'importing'
              ? 'border-gray-200 text-gray-300 cursor-not-allowed'
              : 'border-blue-300 text-blue-600 hover:border-blue-500 hover:bg-blue-50/30'
          }`}
        >
          {status === 'parsing' || status === 'importing' ? (
            <>
              <span className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium text-gray-600">
                {status === 'parsing' ? 'Leyendo archivo…' : 'Importando productos…'}
              </span>
            </>
          ) : (
            <>
              <Upload className="w-8 h-8" />
              <span className="text-sm font-medium">Haz clic para seleccionar CSV</span>
            </>
          )}
        </label>

        {/* Error */}
        {status === 'error' && errorMsg && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{errorMsg}</p>
          </div>
        )}

        {/* Results */}
        {status === 'done' && result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-700 font-semibold">
              <CheckCircle className="w-5 h-5" />
              <span>{result.imported} productos importados</span>
              {result.imported > 0 && (
                <span className="text-xs text-green-500 font-normal">(embeddings generándose en background)</span>
              )}
            </div>

            {result.errors.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-orange-700 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  {result.errors.length} fila{result.errors.length > 1 ? 's' : ''} con error
                </p>
                <ul className="text-xs text-gray-600 space-y-0.5 max-h-32 overflow-y-auto">
                  {result.errors.map((e, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-gray-400">Fila {e.row}:</span>
                      <span>{e.reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              type="button"
              onClick={() => { setStatus('idle'); setResult(null) }}
              className="text-sm text-blue-600 hover:underline"
            >
              Importar otro archivo
            </button>
          </div>
        )}
      </div>

      {/* Format guide */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Formato requerido</p>
          <button
            type="button"
            onClick={downloadTemplate}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline"
          >
            <Download className="w-4 h-4" />
            Descargar plantilla
          </button>
        </div>

        {/* Visual table */}
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-600 font-bold text-left">
                <th className="px-3 py-2 border-b border-gray-200">nombre</th>
                <th className="px-3 py-2 border-b border-gray-200">unidad_medida</th>
                <th className="px-3 py-2 border-b border-gray-200">subtipo</th>
                <th className="px-3 py-2 border-b border-gray-200">requiere_fecha_vencimiento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              <tr className="hover:bg-gray-50">
                <td className="px-3 py-2">Leche Entera</td>
                <td className="px-3 py-2">litros</td>
                <td className="px-3 py-2 font-mono text-blue-700">lacteo</td>
                <td className="px-3 py-2 text-green-700 font-semibold">si</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-3 py-2">Pollo Entero</td>
                <td className="px-3 py-2">unidades</td>
                <td className="px-3 py-2 font-mono text-blue-700">pollo</td>
                <td className="px-3 py-2 text-green-700 font-semibold">si</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-3 py-2">Sal Marina</td>
                <td className="px-3 py-2">kg</td>
                <td className="px-3 py-2 font-mono text-blue-700">azucar_sal</td>
                <td className="px-3 py-2 text-orange-600 font-semibold">no</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-3 py-2">Arroz Blanco</td>
                <td className="px-3 py-2">kg</td>
                <td className="px-3 py-2 font-mono text-blue-700">granos_secos</td>
                <td className="px-3 py-2 text-orange-600 font-semibold">no</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Column descriptions */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-1.5">
          <p className="text-xs font-bold text-blue-700 mb-1">Columnas</p>
          <p className="text-xs text-blue-800"><span className="font-semibold">nombre</span> — Nombre del producto tal como aparecerá en el catálogo</p>
          <p className="text-xs text-blue-800"><span className="font-semibold">unidad_medida</span> — kg, litros, unidades, cajas, porciones…</p>
          <p className="text-xs text-blue-800"><span className="font-semibold">subtipo</span> — Categoría INVIMA (ver lista completa en la plantilla)</p>
          <p className="text-xs text-blue-800"><span className="font-semibold">requiere_fecha_vencimiento</span> — <span className="font-mono">si</span> o <span className="font-mono">no</span> (opcional, por defecto <span className="font-mono">si</span>)</p>
        </div>
      </div>
    </div>
  )
}

// ── CSV parser (RFC 4180 subset — no quoted newlines needed) ──────

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''))
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))
  })
}

function normalizeRow(row: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(row)) {
    out[k.toLowerCase().trim()] = v
  }
  return out
}
