import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { TIPOS_FASE1 } from '@/lib/reglas-engine'
import { ArrowLeft, Check, X } from 'lucide-react'

export default async function CoberturaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (user.app_metadata?.rol !== 'admin') redirect('/dashboard')

  const [{ data: cats }, { data: reglas }] = await Promise.all([
    supabase.from('categorias').select('id, nombre').order('nombre'),
    supabase.from('reglas').select('tipo, ambito, ambito_id').is('vigente_hasta', null).eq('activa', true),
  ])

  const categorias = cats ?? []
  const rs = reglas ?? []
  const globalPorTipo = new Set(rs.filter((r) => r.ambito === 'GLOBAL').map((r) => r.tipo))
  const catTipo = new Set(rs.filter((r) => r.ambito === 'CATEGORIA').map((r) => `${r.ambito_id}|${r.tipo}`))

  const cell = (cubierto: boolean, especifico = false) => (
    <td className="px-2 py-2 text-center">
      {cubierto
        ? <Check className={`w-4 h-4 mx-auto ${especifico ? 'text-green-600' : 'text-gray-300'}`} />
        : <X className="w-4 h-4 mx-auto text-red-400" />}
    </td>
  )

  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin/reglas" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-2">
          <ArrowLeft className="w-4 h-4" />Volver a reglas
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Cobertura de reglas</h1>
        <p className="text-sm text-gray-500">Verde = regla específica de categoría · gris = cubierto por global · ✗ = sin regla (queda GRIS)</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 text-gray-600">
              <th className="px-3 py-2 text-left sticky left-0 bg-gray-50">Categoría</th>
              {TIPOS_FASE1.map((t) => <th key={t} className="px-2 py-2 font-semibold">{t}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr className="bg-blue-50/40">
              <td className="px-3 py-2 font-bold text-blue-800 sticky left-0 bg-blue-50/40">GLOBAL</td>
              {TIPOS_FASE1.map((t) => cell(globalPorTipo.has(t)))}
            </tr>
            {categorias.map((c) => (
              <tr key={c.id}>
                <td className="px-3 py-2 font-medium text-gray-800 sticky left-0 bg-white">{c.nombre}</td>
                {TIPOS_FASE1.map((t) => cell(globalPorTipo.has(t) || catTipo.has(`${c.id}|${t}`), catTipo.has(`${c.id}|${t}`)))}
              </tr>
            ))}
            {categorias.length === 0 && (
              <tr><td colSpan={TIPOS_FASE1.length + 1} className="px-3 py-6 text-center text-gray-400">Sin categorías. Crea categorías para asignar reglas específicas.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
