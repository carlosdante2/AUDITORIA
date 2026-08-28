import Link from 'next/link'
import Image from 'next/image'
import {
  Gauge,
  Mic,
  WifiOff,
  ReceiptText,
  Camera,
  ShieldCheck,
  ClipboardList,
  LineChart,
  SlidersHorizontal,
  ArrowRight,
  Phone,
  Mail,
} from 'lucide-react'

// Landing pública: presenta qué hace Fresko y enruta al login.
// El área autenticada vive bajo app/(app)/ con su propio control de sesión.

const features = [
  {
    icon: Gauge,
    title: 'Semáforo de vida útil',
    text: 'Cada producto en verde, amarillo o rojo según su vencimiento. Reglas configurables por categoría y sede.',
  },
  {
    icon: Mic,
    title: 'Captura por voz',
    text: 'Inventaría hablando. Manos libres, sin teclear, con validación en tiempo real.',
  },
  {
    icon: WifiOff,
    title: 'Funciona sin internet',
    text: 'PWA offline: captura y evidencia aunque no haya señal. Sincroniza sola al reconectar.',
  },
  {
    icon: ReceiptText,
    title: 'Recepción por foto de factura',
    text: 'Toma la foto de la factura y la IA extrae los productos recibidos y sus cantidades.',
  },
  {
    icon: Camera,
    title: 'Evidencia fotográfica',
    text: 'Respalda cada conteo con fotos. Nada queda sin soporte visual.',
  },
  {
    icon: ShieldCheck,
    title: 'Trazabilidad auditable',
    text: 'Registros inmutables con hora de servidor. Cada alerta conserva la regla que la disparó.',
  },
]

const roles = [
  {
    icon: ClipboardList,
    title: 'Auditor',
    text: 'Captura en piso: cuenta, fotografía y registra vencimientos en segundos.',
  },
  {
    icon: LineChart,
    title: 'Supervisor',
    text: 'Tablero en vivo del estado sanitario por sede, sección y categoría.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Administrador',
    text: 'Configura catálogo, reglas del semáforo, sedes y usuarios sin código.',
  },
]

const semaforo = [
  { color: '#2FA26F', bg: '#EAF6EF', label: 'A tiempo', text: 'Dentro de su vida útil.' },
  { color: '#DFA23A', bg: '#FBF2E1', label: 'Por vencer', text: 'Priorizar rotación.' },
  { color: '#DC2626', bg: '#FDECEC', label: 'Vencido', text: 'Retirar de inmediato.' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F4F6F3] text-[#26332C]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-black/5 bg-[#F4F6F3]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Image src="/fresko-logotipo.png" alt="Fresko" width={150} height={28} priority className="h-7 w-auto" />
          <nav className="flex items-center gap-2 sm:gap-4">
            <a
              href="#contacto"
              className="hidden rounded-full px-4 py-2 text-sm font-semibold text-[#26332C] transition-colors hover:text-[#2FA26F] sm:inline-block"
            >
              Contacto
            </a>
            <Link
              href="/login"
              className="rounded-full bg-[#26332C] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2FA26F]"
            >
              Iniciar sesión
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pt-16 pb-12 md:pt-24 md:pb-20">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#2FA26F]/30 bg-[#2FA26F]/10 px-4 py-1.5 text-sm font-medium text-[#1f7a52]">
            <span className="h-2 w-2 rounded-full bg-[#2FA26F]" />
            Para hotelería y Alimentos &amp; Bebidas
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight md:text-6xl">
            Vida útil <span className="text-[#2FA26F]">bajo control</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-[#4a544d] md:text-xl">
            Fresko controla el vencimiento de tu inventario perecedero con un semáforo sanitario,
            captura por voz y evidencia fotográfica — incluso sin internet.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full bg-[#2FA26F] px-7 py-3 text-base font-semibold text-white shadow-lg shadow-[#2FA26F]/25 transition-colors hover:bg-[#26332C]"
            >
              Entrar a la app
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#que-hacemos"
              className="inline-flex items-center gap-2 rounded-full border border-[#26332C]/15 bg-white px-7 py-3 text-base font-semibold text-[#26332C] transition-colors hover:border-[#26332C]/30"
            >
              Ver qué hacemos
            </a>
          </div>
        </div>

        {/* Semáforo */}
        <div className="mx-auto mt-14 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
          {semaforo.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-black/5 p-5 text-left"
              style={{ backgroundColor: s.bg }}
            >
              <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
              <p className="mt-3 text-lg font-semibold" style={{ color: s.color }}>
                {s.label}
              </p>
              <p className="mt-1 text-sm text-[#4a544d]">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Qué hacemos */}
      <section id="que-hacemos" className="border-t border-black/5 bg-white py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Qué hacemos</h2>
            <p className="mt-4 text-lg text-[#4a544d]">
              Digitalizamos la auditoría de inventario perecedero para que nada se venza sin que lo sepas.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-black/5 bg-[#F4F6F3] p-6 transition-shadow hover:shadow-md"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2FA26F]/12 text-[#2FA26F]">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#4a544d]">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Un rol para cada tarea</h2>
            <p className="mt-4 text-lg text-[#4a544d]">
              Del piso a la gerencia, cada perfil entra directo a donde trabaja.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {roles.map((r) => (
              <div key={r.title} className="rounded-2xl border border-black/5 bg-white p-7">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#26332C] text-[#6FD3A2]">
                  <r.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-xl font-semibold">{r.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#4a544d]">{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contacto */}
      <section id="contacto" className="border-t border-black/5 bg-white py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Hablemos</h2>
            <p className="mt-4 text-lg text-[#4a544d]">
              Estamos en Colombia y Perú. Escríbenos o llámanos y te mostramos Fresko funcionando.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Colombia */}
            <div className="rounded-2xl border border-black/5 bg-[#F4F6F3] p-6">
              <div className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden>
                  🇨🇴
                </span>
                <h3 className="text-lg font-semibold">Colombia</h3>
              </div>
              <ul className="mt-4 space-y-3">
                <li>
                  <a
                    href="tel:+573202508852"
                    className="flex items-center gap-3 text-[#26332C] transition-colors hover:text-[#2FA26F]"
                  >
                    <Phone className="h-5 w-5 shrink-0 text-[#2FA26F]" />
                    <span className="font-medium">+57 320 250 8852</span>
                  </a>
                </li>
                <li>
                  <a
                    href="tel:+573160404533"
                    className="flex items-center gap-3 text-[#26332C] transition-colors hover:text-[#2FA26F]"
                  >
                    <Phone className="h-5 w-5 shrink-0 text-[#2FA26F]" />
                    <span className="font-medium">+57 316 040 4533</span>
                  </a>
                </li>
              </ul>
            </div>

            {/* Perú */}
            <div className="rounded-2xl border border-black/5 bg-[#F4F6F3] p-6">
              <div className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden>
                  🇵🇪
                </span>
                <h3 className="text-lg font-semibold">Perú</h3>
              </div>
              <ul className="mt-4 space-y-3">
                <li>
                  <a
                    href="tel:+51906959989"
                    className="flex items-center gap-3 text-[#26332C] transition-colors hover:text-[#2FA26F]"
                  >
                    <Phone className="h-5 w-5 shrink-0 text-[#2FA26F]" />
                    <span className="font-medium">+51 906 959 989</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Correo */}
          <div className="mx-auto mt-6 max-w-3xl">
            <a
              href="mailto:ctadeo@clarocomunica.com"
              className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-[#26332C] px-6 py-6 text-center text-white transition-colors hover:bg-[#2FA26F] sm:flex-row sm:gap-3"
            >
              <Mail className="h-5 w-5 shrink-0" />
              <span className="text-base font-semibold break-all">ctadeo@clarocomunica.com</span>
            </a>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="px-5 pb-20">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl bg-[#26332C] px-8 py-14 text-center md:px-16 md:py-20">
          <Image
            src="/fresko-logotipo-negativo.png"
            alt="Fresko"
            width={180}
            height={33}
            className="mx-auto h-8 w-auto"
          />
          <h2 className="mt-8 text-3xl font-bold tracking-tight text-white md:text-4xl">
            Empieza a controlar la vida útil hoy
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
            Menos mermas, más inocuidad y una auditoría que se hace sola.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#2FA26F] px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-white hover:text-[#26332C]"
          >
            Iniciar sesión
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-black/5 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 text-sm text-[#7c847d] sm:flex-row">
          <Image src="/fresko-logotipo.png" alt="Fresko" width={110} height={20} className="h-5 w-auto opacity-80" />
          <p>© {new Date().getFullYear()} Fresko · Vida útil bajo control</p>
        </div>
      </footer>
    </div>
  )
}
