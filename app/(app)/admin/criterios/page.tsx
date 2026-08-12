import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { ShieldCheck, AlertOctagon, AlertTriangle, CheckCircle2 } from 'lucide-react'

// Página de referencia (solo lectura). Fuente de verdad: lib/semaforo.ts
// La lógica es determinista (sin IA) por inocuidad alimentaria (INVIMA).

export default async function CriteriosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const rol = user.app_metadata?.rol as string | undefined
  if (rol !== 'admin') redirect('/dashboard')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Criterios del semáforo</h1>
        <p className="text-sm text-gray-500">Reglas de inocuidad que el sistema aplica automáticamente</p>
      </div>

      {/* Nota determinista */}
      <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-4">
        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800 leading-relaxed">
          El color se calcula con reglas fijas (sin IA), aplicadas igual en cada conteo — incluso sin conexión.
          Esto garantiza consistencia y trazabilidad ante INVIMA. La IA solo genera el <span className="font-semibold">resumen</span> al cerrar la sesión, nunca decide el color.
        </p>
      </div>

      {/* Categorías y umbrales */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-gray-700">1. Categoría del producto → umbral para verde</h2>
        <div className="space-y-2">
          <CategoriaCard
            titulo="Perecedero crítico"
            umbral="≥ 5 días"
            color="red"
            ejemplos="Carnes, pollo, pescado, mariscos, lácteos frescos, preparados de cocina, fruta/verdura cortada"
          />
          <CategoriaCard
            titulo="Perecedero intermedio"
            umbral="≥ 7 días"
            color="amber"
            ejemplos="Frutas y verduras enteras, huevo, hojas verdes, panadería, jugos y bebidas refrigeradas"
          />
          <CategoriaCard
            titulo="No perecedero"
            umbral="≥ 30 días"
            color="green"
            ejemplos="Enlatados, conservas, granos secos, aceites, bebidas estables, café/té, azúcar/sal, agua"
          />
        </div>
        <p className="text-xs text-gray-400">
          Si a un producto le quedan más días que su umbral → <span className="font-semibold text-green-600">verde</span>; si le quedan menos (pero aún no vence) → <span className="font-semibold text-amber-600">amarillo</span>.
        </p>
      </section>

      {/* Rojo */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <AlertOctagon className="w-5 h-5 text-red-500" />
          <h2 className="text-sm font-bold text-gray-700">2. Cuándo es ROJO (riesgo — se evalúa primero, en orden)</h2>
        </div>
        <ol className="space-y-2">
          <ReglaRojo n={1} titulo="Empaque roto, abierto o con fuga" detalle="Riesgo de contaminación directa. Retirar del consumo humano y disposición controlada." />
          <ReglaRojo n={2} titulo="Observación visual no conforme" detalle="Producto alterado o contaminado a la vista. Anula cualquier fecha." />
          <ReglaRojo n={3} titulo="Falta la fecha de vencimiento exigida por norma" detalle="Trazabilidad incompleta bajo INVIMA. Se marca rojo aunque el producto se vea bien." />
          <ReglaRojo n={4} titulo="Vencido (0 días o menos)" detalle="No apto. En no perecederos con empaque intacto se evalúa valorización (compostaje / alimentación animal certificada)." />
        </ol>
      </section>

      {/* Amarillo */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h2 className="text-sm font-bold text-gray-700">3. Cuándo baja a AMARILLO (alerta)</h2>
        </div>
        <ul className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1.5 text-sm text-amber-800">
          <li>• Le quedan menos días que el umbral de su categoría (pero no ha vencido).</li>
          <li>• Estaba verde pero tiene <span className="font-semibold">daño leve</span> en el empaque.</li>
          <li>• Estaba verde pero la <span className="font-semibold">observación visual es dudosa</span>.</li>
        </ul>
        <p className="text-xs text-gray-400">Acción sugerida: priorizar uso inmediato / redistribución interna o donación.</p>
      </section>

      {/* Verde */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-500" />
          <h2 className="text-sm font-bold text-gray-700">4. Cuándo es VERDE (apto)</h2>
        </div>
        <ul className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-1.5 text-sm text-green-800">
          <li>• Dentro de vida útil (días restantes ≥ umbral de su categoría).</li>
          <li>• Empaque intacto y observación visual normal.</li>
          <li>• Producto estable que por norma no requiere fecha.</li>
        </ul>
        <p className="text-xs text-gray-400">Acción sugerida: usar según rotación FIFO.</p>
      </section>

      {/* Cálculo de días */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-gray-700">5. Cómo se calculan los días restantes</h2>
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 text-sm">
          <div className="px-4 py-3">
            <p className="font-medium text-gray-900">Fecha documentada</p>
            <p className="text-gray-500 text-xs mt-0.5">El auditor ingresó la fecha de vencimiento impresa. Es el método preferido.</p>
          </div>
          <div className="px-4 py-3">
            <p className="font-medium text-gray-900">Estimado por recepción</p>
            <p className="text-gray-500 text-xs mt-0.5">Productos sin fecha impresa (ej. frutas): se estima con una vida útil típica desde la fecha de recepción.</p>
          </div>
          <div className="px-4 py-3">
            <p className="font-medium text-gray-900">No aplica</p>
            <p className="text-gray-500 text-xs mt-0.5">Producto estable sin fecha requerida → verde por defecto.</p>
          </div>
        </div>
      </section>

      <p className="text-xs text-gray-400 border-t border-gray-100 pt-4">
        Estos criterios están codificados en <span className="font-mono">lib/semaforo.ts</span> y validados con pruebas automáticas.
        Cambiarlos requiere ajuste técnico deliberado — no son editables desde la interfaz por seguridad alimentaria.
      </p>
    </div>
  )
}

function CategoriaCard({ titulo, umbral, color, ejemplos }: {
  titulo: string; umbral: string; color: 'red' | 'amber' | 'green'; ejemplos: string
}) {
  const cls = {
    red:   'bg-red-50 border-red-200',
    amber: 'bg-amber-50 border-amber-200',
    green: 'bg-green-50 border-green-200',
  }[color]
  const dot = { red: 'bg-red-500', amber: 'bg-amber-400', green: 'bg-green-500' }[color]
  return (
    <div className={`border rounded-xl p-4 ${cls}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
          <p className="text-sm font-bold text-gray-900">{titulo}</p>
        </div>
        <span className="text-xs font-bold text-gray-600">verde si {umbral}</span>
      </div>
      <p className="text-xs text-gray-500 mt-1.5">{ejemplos}</p>
    </div>
  )
}

function ReglaRojo({ n, titulo, detalle }: { n: number; titulo: string; detalle: string }) {
  return (
    <li className="flex gap-3 bg-red-50 border border-red-200 rounded-xl p-3">
      <span className="shrink-0 w-6 h-6 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center">{n}</span>
      <div>
        <p className="text-sm font-semibold text-red-900">{titulo}</p>
        <p className="text-xs text-red-600 mt-0.5">{detalle}</p>
      </div>
    </li>
  )
}
