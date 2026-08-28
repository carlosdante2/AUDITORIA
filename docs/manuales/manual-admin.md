# Manual del Administrador 🔴

Tu trabajo es **configurar el sistema** para que funcione: cargar el catálogo, definir las
reglas del semáforo, dar de alta sedes/equipos y gestionar los usuarios. También puedes
hacer todo lo de supervisor y auditor.

## Tu barra inferior (5 iconos)

| Icono | Pantalla | Para qué |
|---|---|---|
| ⚙️ **Panel** | Panel admin | Acceso a **todas** las funciones de configuración |
| 🎚️ **Reglas** | Reglas del semáforo | Configurar los umbrales de color + simulador |
| 📦 **Catálogo** | Catálogo | Productos del hotel |
| 📋 **Pendientes** | Pendientes | Aprobar productos nuevos |
| 👥 **Usuarios** | Usuarios | Invitar y dar accesos |

> La barra solo tiene 5 espacios, pero tienes más funciones. El **Panel** (primer icono) es
> el directorio completo: desde ahí llegas a todo lo demás — **Sedes y secciones**,
> Categorías, Equipos de frío, Importar, Alertas, Reportes y Costos.

---

## El Panel: todas tus funciones

| Función | Qué hace |
|---|---|
| **Sedes y secciones** | Define almacenes (sedes) y sus secciones (cámara fría, almacén seco…). |
| **Catálogo de productos** | Crea, edita, categoriza o activa/desactiva productos. |
| **Categorías** | Agrupa productos (con jerarquía) para asignarles reglas por categoría. |
| **Equipos de frío** | Cámaras y neveras; base de las reglas de temperatura. |
| **Importar productos (CSV)** | Carga masiva desde Excel/CSV + generación de embeddings para voz. |
| **Productos pendientes** | Aprueba/rechaza productos detectados en facturas. |
| **Usuarios y accesos** | Invita auditores y supervisores. |
| **Reglas del semáforo** | ⭐ Configura los umbrales de color (ver abajo). |
| **Alertas** | Reconoce y cierra hallazgos (igual que el supervisor). |
| **Reportes HACCP** | Documento imprimible por período. |
| **Control de costos IA** | Gasto de los servicios de IA (Groq/Jina). |

---

## Puesta en marcha (orden recomendado)

1. **Sedes y secciones** → dónde se guarda el inventario.
2. **Equipos de frío** → cámaras/neveras (si vas a usar reglas de temperatura).
3. **Catálogo** → sube tus productos (a mano o por **Importar CSV**). Columnas:
   nombre, unidad, subtipo sanitario, requiere fecha de vencimiento.
4. **Categorías** → agrupa productos (ej. "Congelados", "Lácteos").
5. **Reglas del semáforo** → define cómo se colorea cada cosa (paso clave, abajo).
6. **Usuarios** → invita a tu equipo con su rol.

Con esto, un auditor puede empezar a contar y ver colores reales.

---

## ⭐ Reglas del semáforo (el corazón del sistema)

El color de cada lote **no está fijo en el programa**: sale de reglas que tú defines. Si no
configuras reglas, todo sale **gris** ("sin dato", nunca verde).

Entra a **Reglas** (icono 🎚️ de la barra inferior, o desde el Panel). En una sola pantalla:

1. Elige el **tipo** de regla:
   - **VENCIMIENTO** — días para vencer.
   - **TEMPERATURA** — última lectura del equipo (°C).
   - **LECTURA_VENCIDA** — horas sin medir temperatura.
   - **TRAZABILIDAD** — campos obligatorios del lote (código, proveedor, fecha).
   - **CUARENTENA** — estado del lote (libre / en evaluación / no conforme).
2. Elige el **ámbito**: Global, Categoría o Producto. Si hay varias, gana **la más específica**
   (Producto > Categoría > Global).
3. Arma la **tabla de umbrales**: por cada fila defines color, operador, valores, unidad,
   **acción** (solo alerta / bloquea salida / bloquea ingreso / fuerza cuarentena),
   **mensaje** y —opcional— la **ruta de valorización** (banco de alimentos, compostaje…),
   de la que se derivan los ODS que ve el usuario.
4. Usa el **Simulador** (al lado): ingresa un caso hipotético y verás qué color sale, **qué
   regla ganó y por qué**, y qué bloqueos se activarían. No configures a ciegas.
5. **Guardar**. El sistema valida antes:
   - Rechaza umbrales que **se solapan** o con **unidad incoherente**.
   - Avisa si **falta el color rojo** o si no cubres todo el rango.
   - Al editar una regla existente **no se sobreescribe**: se crea una **versión nueva** y se
     re-evalúa el inventario. El historial queda para auditoría.

### Cobertura de reglas
En **Reglas → Cobertura** ves una matriz *categorías × tipos*. Las celdas **grises** son
combinaciones **sin regla**: ahí el semáforo no puede colorear. Complétalas para evitar
el error más común (configuración a medias).

> **Nota:** para que "empaque roto → rojo" funcione, debe existir una regla **CUARENTENA**.
> El auditor marca el empaque; eso pone el lote en cuarentena y tu regla lo colorea.

---

## Usuarios y productos pendientes

- **Usuarios**: invitas por correo y asignas rol (Auditor / Supervisor / Admin). Cada persona
  solo ve los datos de **tu hotel**.
- **Pendientes**: apruebas los productos nuevos que los auditores detectan en facturas; al
  aprobarlos entran al catálogo y quedan reconocibles por voz y factura.

---

## Reglas de oro del sistema

- **Nada de umbrales fijos en el código**: todo color/umbral vive en tus reglas.
- **Los registros no se borran**: se corrigen (queda trazabilidad).
- **La hora es del servidor**: no se puede alterar en lecturas ni evidencias.
- **Aislamiento por hotel**: ningún usuario ve datos de otro tenant.
