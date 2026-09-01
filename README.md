# 🧊 Fresko

## Sistema inteligente de inventario, auditoría y control operativo

Fresko es una plataforma web orientada a la digitalización de procesos de **inventario, auditoría, recepción y control de alimentos**, especialmente en entornos donde la conectividad puede ser limitada o intermitente.

El sistema combina funcionamiento **offline-first**, gestión por roles, trazabilidad, reglas configurables e integración de herramientas de inteligencia artificial para apoyar la captura y análisis de información.

> 🚧 Proyecto en desarrollo y validación técnica.

---

## 🎯 Objetivo

Fresko busca reemplazar procesos manuales de inventario y auditoría por un flujo digital más organizado, trazable y eficiente.

La plataforma permite:

- 📦 Gestionar inventarios y lotes.
- 📅 Controlar fechas de vencimiento.
- 🌡️ Registrar temperaturas.
- 📥 Gestionar recepción de productos.
- 📷 Capturar evidencias fotográficas.
- 🎙️ Registrar información mediante voz.
- 🚦 Aplicar reglas y semáforos.
- 🚨 Generar alertas.
- 📊 Consultar información operativa.
- 📴 Trabajar temporalmente sin Internet.
- 🔄 Sincronizar datos posteriormente.
- 👥 Gestionar usuarios por roles.
- 🏢 Separar información entre organizaciones.
- 🤖 Utilizar IA como herramienta de apoyo.

---

## 👥 Roles

### Administrador

Responsable de la configuración general.

Puede gestionar:

- Usuarios.
- Catálogo.
- Reglas.
- Sedes y secciones.
- Equipos.
- Productos pendientes.
- Configuración general.

### Supervisor

Responsable del seguimiento operativo.

Puede consultar:

- Dashboard.
- Inventario.
- Alertas.
- Sesiones.
- Recepción.
- Historiales.

### Auditor

Responsable principalmente de las operaciones de campo.

Puede utilizar:

- Captura.
- Inventario.
- Temperatura.
- Sesiones.
- Recepción.
- Evidencias.

---

## 🧩 Arquitectura general

```text
Usuario
   │
   ▼
Next.js + React
   │
   ├── UI / PWA
   ├── API Routes
   └── Lógica de aplicación
          │
      ┌───┴─────────────┐
      ▼                 ▼
IndexedDB / Dexie     Servicios IA
      │                 │
      └──────┬──────────┘
             ▼
          Supabase
             │
     ┌───────┼─────────┐
     ▼       ▼         ▼
   Auth   PostgreSQL  Storage
             │
             ▼
      Edge Functions
```

---

## 🛠️ Tecnologías

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- Lucide React
- PWA

### Backend y datos

- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Storage
- Row Level Security
- Supabase Edge Functions

### Offline

- IndexedDB
- Dexie

### Inteligencia Artificial

- Procesamiento de voz.
- Análisis de imágenes.
- Matching.
- Embeddings.
- Clasificación y reglas asistidas.

---

## 📴 Funcionamiento offline

Fresko está diseñado para permitir ciertas operaciones sin conexión.

```text
Usuario captura información
          │
          ▼
     ¿Hay Internet?
       │       │
      Sí       No
       │       │
       ▼       ▼
   Supabase  IndexedDB
               │
               ▼
         Cola pendiente
               │
        vuelve Internet
               │
               ▼
         Sincronización
```

Entre las estructuras locales utilizadas se encuentran:

```text
audioQueue
photoQueue
countQueue
reglasCache
products
```

---

## 🏢 Multi-tenant

El sistema contempla diferentes organizaciones mediante `tenant_id`.

```text
Fresko
│
├── Organización A
│   ├── Admin
│   ├── Supervisor
│   └── Auditor
│
├── Organización B
│   ├── Admin
│   ├── Supervisor
│   └── Auditor
│
└── Organización N
```

El objetivo es mantener aislados los datos de cada organización.

---

## 🚦 Reglas de negocio

Durante la fase actual se priorizan principalmente:

- Fecha de vencimiento.
- Temperatura.

El motor de reglas permite generar estados tipo semáforo:

```text
🟢 Verde
🟡 Amarillo
🟠 Naranja
🔴 Rojo
⚪ Gris
```

Los rangos deben ser configurables y no quedar definidos directamente en la interfaz.

---

## 📦 Inventario

Cada registro debería permitir conocer información como:

- Producto.
- Categoría.
- Cantidad.
- Unidad.
- Lote.
- Fecha de recepción.
- Fecha de vencimiento.
- Ubicación.
- Equipo de almacenamiento.
- Temperatura.
- Estado.
- Motivo de alerta.
- Evidencia.
- Usuario responsable.
- Historial.

---

## 🤖 Inteligencia Artificial

La IA se utiliza como apoyo para tareas como:

- Transcripción de voz.
- Extracción de información.
- Análisis de fotografías.
- Matching de productos.
- Clasificación.
- Generación de sugerencias.

La IA no debe considerarse automáticamente una fuente infalible.

Cuando corresponda, los resultados deberán ser confirmados por una persona.

---

## 🔐 Seguridad

La aplicación implementa controles de seguridad por capas:

```text
Usuario
   ↓
Autenticación
   ↓
Rol
   ↓
Tenant
   ↓
Servidor
   ↓
RLS
   ↓
Base de datos
```

Principios del proyecto:

- Mínimo privilegio.
- Separación de roles.
- Protección de secretos.
- Aislamiento por tenant.
- Validación de entradas.
- Trazabilidad.
- Manejo seguro de archivos.
- Privacidad por diseño.

---

## 🌿 Estrategia Git

La rama principal actual es:

```text
master
```

El equipo debe trabajar mediante ramas independientes.

Ejemplos:

```text
feature/inventario
feature/reglas
feature/temperatura
feature/audio
fix/sincronizacion
security/permisos
docs/readme
```

Flujo recomendado:

```text
master
   │
   ▼
rama de trabajo
   │
   ▼
Pull Request
   │
   ▼
Revisión
   │
   ▼
Pruebas
   │
   ▼
Merge
   │
   ▼
master
```

---

## 🚀 Ejecutar el proyecto

Clonar:

```bash
git clone https://github.com/carlosdante2/AUDITORIA.git
cd AUDITORIA
```

Instalar dependencias:

```bash
npm install
```

Crear archivo de variables de entorno:

```bash
cp .env.local.example .env.local
```

Configurar las variables necesarias.

Ejecutar en desarrollo:

```bash
npm run dev
```

Abrir:

```text
http://localhost:3000
```

---

## 🔒 Variables de entorno

Nunca subir credenciales reales al repositorio.

Ejemplo:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

GROQ_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

Los secretos deben mantenerse únicamente en entornos seguros.

---

## 🗺️ Roadmap

### En curso

- [x] Arquitectura offline-first.
- [x] Gestión básica por roles.
- [x] Inventario.
- [x] Captura por voz.
- [x] Integración con Supabase.
- [x] Motor de reglas.
- [ ] Mejorar ubicación de productos y equipos.
- [ ] Mejorar control de vencimientos.
- [ ] Mejorar reglas de temperatura.
- [ ] Mejorar historial y trazabilidad.
- [ ] Mejorar sincronización.
- [ ] Mejorar análisis de fotografías.
- [ ] Aumentar cobertura de pruebas.
- [ ] Fortalecer seguridad y observabilidad.

---

## 📚 Documentación

La documentación técnica ampliada se organizará en:

```text
docs/
├── ARCHITECTURE.md
├── DATABASE.md
├── SECURITY.md
├── OFFLINE.md
├── AI.md
├── BUSINESS_RULES.md
└── CONTRIBUTING.md
```

---

## 🤝 Contribuir

Antes de trabajar:

```bash
git checkout master
git pull origin master
```

Crear rama:

```bash
git checkout -b feature/nombre-tarea
```

Después:

```bash
git add .
git commit -m "feat: descripción del cambio"
git push -u origin feature/nombre-tarea
```

Finalmente crear un Pull Request hacia `master`.

---

## ⚠️ Estado

Fresko se encuentra en desarrollo.

Antes de considerarlo listo para producción deben completarse pruebas de:

- Seguridad.
- Privacidad.
- Multi-tenancy.
- Sincronización.
- Operación offline.
- Integridad de datos.
- Rendimiento.
- Manejo de errores.
- Inteligencia Artificial.

---

## 📄 Licencia

La licencia del proyecto deberá definirse antes de su distribución pública o comercial.

---

## 🧊 Fresko

**Inventario, trazabilidad y auditoría inteligente para operaciones de alimentos.**
