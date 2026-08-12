import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import {
  Mic, Thermometer, Boxes, ClipboardList, PackageCheck, LayoutDashboard,
  Bell, Settings2, SlidersHorizontal, Users, HelpCircle,
} from 'lucide-react'
import type { ReactNode } from 'react'

// Ayuda en la app: muestra al usuario qué puede hacer según su rol.
// El contenido resume los manuales de docs/manuales/*.

type Rol = 'admin' | 'supervisor' | 'auditor'

interface NavAyuda { icon: ReactNode; label: string; desc: string }
interface Seccion { titulo: string; items: string[] }
interface Contenido {
  titulo: string
  intro: string
  nav: NavAyuda[]
  secciones: Seccion[]
}

const ic = 'w-5 h-5'

const HELP: Record<Rol, Contenido> = {
  auditor: {
    titulo: 'Auditor',
    intro: 'Recorres la bodega y registras el inventario. Todo funciona sin internet: los datos se guardan en el teléfono y se sincronizan solos cuando vuelve la señal.',
    nav: [
      { icon: <Mic className={ic} />, label: 'Captura', desc: 'Contar productos por voz o a mano' },
      { icon: <Thermometer className={ic} />, label: 'Temp.', desc: 'Anotar temperatura de cámaras y neveras' },
      { icon: <Boxes className={ic} />, label: 'Inventario', desc: 'Ver los lotes y su color de semáforo' },
      { icon: <ClipboardList className={ic} />, label: 'Sesiones', desc: 'Ver las auditorías y su detalle' },
      { icon: <PackageCheck className={ic} />, label: 'Recepción', desc: 'Recibir mercadería fotografiando la factura' },
    ],
    secciones: [
      {
        titulo: 'Contar por voz (offline)',
        items: [
          'Mantén presionado el micrófono y di el producto y la cantidad (ej. "veinte litros de leche entera").',
          'Sin señal, el audio queda "grabado — pendiente" y se procesa al reconectar. Nunca pierdes la cuenta.',
          'Si el producto no aparece, elige entre los 3 más parecidos, o búscalo a mano.',
        ],
      },
      {
        titulo: 'Completar y confirmar',
        items: [
          'Cantidad, fecha de vencimiento o recepción, código de lote (opcional) y equipo si aplica.',
          'Estado del empaque y observación visual: empaque roto o "no conforme" marcan el lote como no apto.',
          'Verás el semáforo con el motivo. Offline dice "Provisional": se confirma al sincronizar.',
          'Toma foto de evidencia si hay un hallazgo, y pulsa Confirmar conteo.',
        ],
      },
      {
        titulo: 'Temperatura y recepción',
        items: [
          'Temperatura: elige el equipo y registra los °C. La hora la pone el servidor.',
          'Recepción: fotografía la factura, revisa ítem por ítem y confirma (necesita internet).',
          'Un producto que no está en el catálogo queda "pendiente de aprobación".',
        ],
      },
    ],
  },
  supervisor: {
    titulo: 'Supervisor',
    intro: 'Vigilas el estado del inventario en tiempo real, actúas sobre las alertas y cierras las auditorías. Ves lo que registran los auditores sin que te lo envíen.',
    nav: [
      { icon: <LayoutDashboard className={ic} />, label: 'Dashboard', desc: 'Resumen en vivo: colores, alertas, pendientes' },
      { icon: <Boxes className={ic} />, label: 'Inventario', desc: 'Lotes y su color, con filtros' },
      { icon: <Bell className={ic} />, label: 'Alertas', desc: 'Reconocer y cerrar hallazgos del semáforo' },
      { icon: <ClipboardList className={ic} />, label: 'Sesiones', desc: 'Ver auditorías y cerrarlas con resumen' },
      { icon: <PackageCheck className={ic} />, label: 'Recepción', desc: 'Recibir mercadería por foto de factura' },
    ],
    secciones: [
      {
        titulo: 'Dashboard',
        items: [
          'KPIs por color de todas las sesiones activas.',
          'Alertas críticas (rojo y naranja) recientes: toca una para ir a la sesión.',
          'Panel de productos pendientes de aprobación (aparece cuando hay).',
        ],
      },
      {
        titulo: 'Gestionar alertas',
        items: [
          'Las dispara el semáforo al alcanzar un umbral; quedan con la versión de regla congelada (auditable).',
          'Pestañas Abiertas / Reconocidas / Cerradas. Reconocer y Cerrar son acciones tuyas (el auditor no puede).',
        ],
      },
      {
        titulo: 'Sesiones y aprobaciones',
        items: [
          'En el detalle ves cada ítem con color, foto, transcripción y —solo tú/admin— razón y acción.',
          'Con la sesión abierta, "Cerrar sesión" genera un resumen (con párrafo IA si hay internet).',
          'Apruebas o rechazas los productos pendientes detectados en facturas.',
          'Reportes HACCP: documento imprimible por período para inspección.',
        ],
      },
    ],
  },
  admin: {
    titulo: 'Administrador',
    intro: 'Configuras el sistema: catálogo, reglas del semáforo, sedes, equipos y usuarios. El Panel (primer icono) es el directorio con todas las funciones.',
    nav: [
      { icon: <Settings2 className={ic} />, label: 'Panel', desc: 'Acceso a todas las funciones de configuración' },
      { icon: <SlidersHorizontal className={ic} />, label: 'Reglas', desc: 'Configurar los umbrales de color + simulador' },
      { icon: <PackageCheck className={ic} />, label: 'Catálogo', desc: 'Productos del hotel' },
      { icon: <ClipboardList className={ic} />, label: 'Pendientes', desc: 'Aprobar productos nuevos' },
      { icon: <Users className={ic} />, label: 'Usuarios', desc: 'Invitar y dar accesos' },
    ],
    secciones: [
      {
        titulo: 'Puesta en marcha (orden recomendado)',
        items: [
          'Sedes y secciones → dónde se guarda el inventario.',
          'Equipos de frío → cámaras/neveras (para reglas de temperatura).',
          'Catálogo → sube tus productos (a mano o Importar CSV) y Categorías → agrúpalos.',
          'Reglas del semáforo → define cómo se colorea cada cosa.',
          'Usuarios → invita a tu equipo con su rol.',
        ],
      },
      {
        titulo: 'Reglas del semáforo (lo clave)',
        items: [
          'El color no está fijo en el programa: sale de tus reglas. Sin reglas, todo sale gris.',
          'Elige tipo (vencimiento, temperatura, trazabilidad, cuarentena…) y ámbito (global/categoría/producto). Gana la más específica.',
          'Arma la tabla de umbrales: color, valores, acción, mensaje y ruta de valorización (banco de alimentos, compostaje…).',
          'Usa el Simulador para ver qué color sale y qué regla ganó, antes de guardar.',
          'Al editar no se sobreescribe: se crea una versión nueva y se re-evalúa el inventario.',
          'Revisa Reglas → Cobertura: las celdas grises son combinaciones sin regla.',
        ],
      },
      {
        titulo: 'Reglas de oro',
        items: [
          'Ningún umbral fijo en el código: todo vive en tus reglas.',
          'Los registros no se borran, se corrigen (queda trazabilidad).',
          'La hora es del servidor; ningún usuario ve datos de otro hotel.',
        ],
      },
    ],
  },
}

const SEMAFORO = [
  ['bg-green-500', 'Verde', 'Apto — usar con normalidad'],
  ['bg-yellow-400', 'Amarillo', 'Alerta — priorizar uso pronto'],
  ['bg-orange-500', 'Naranja', 'Urgente — usar ya o derivar'],
  ['bg-red-500', 'Rojo', 'Riesgo — retirar / bloquear salida'],
  ['bg-gray-400', 'Gris', 'Sin dato — falta info o regla (no es apto)'],
] as const

export default async function AyudaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const rol = (user.app_metadata?.rol as Rol) ?? 'auditor'
  const c = HELP[rol] ?? HELP.auditor

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <HelpCircle className="w-7 h-7 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ayuda — {c.titulo}</h1>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">{c.intro}</p>
        </div>
      </div>

      {/* Barra inferior del rol */}
      <section className="space-y-2">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tu barra inferior</h2>
        <ul className="rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden">
          {c.nav.map((n) => (
            <li key={n.label} className="flex items-center gap-3 px-4 py-3">
              <span className="text-blue-600 shrink-0">{n.icon}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">{n.label}</p>
                <p className="text-xs text-gray-500">{n.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Secciones */}
      {c.secciones.map((s) => (
        <section key={s.titulo} className="space-y-2">
          <h2 className="text-base font-bold text-gray-800">{s.titulo}</h2>
          <ul className="space-y-2">
            {s.items.map((item, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-gray-700 leading-snug">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {/* Semáforo (común) */}
      <section className="space-y-2">
        <h2 className="text-base font-bold text-gray-800">El semáforo</h2>
        <p className="text-sm text-gray-500">
          El color de cada lote lo definen las reglas del hotel (no es fijo). De mejor a peor:
        </p>
        <ul className="rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden">
          {SEMAFORO.map(([dot, label, desc]) => (
            <li key={label} className="flex items-center gap-3 px-4 py-2.5">
              <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${dot}`} />
              <p className="text-sm text-gray-700">
                <span className="font-semibold">{label}</span> — {desc}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
