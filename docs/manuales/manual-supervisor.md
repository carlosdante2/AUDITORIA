# Manual del Supervisor 🔵

Tu trabajo es **vigilar el estado del inventario en tiempo real, actuar sobre las alertas
y cerrar las auditorías**. Ves lo que registran los auditores sin que te lo tengan que
enviar. También puedes hacer todo lo operativo de un auditor si lo necesitas.

## Tu barra inferior (5 iconos)

| Icono | Pantalla | Para qué |
|---|---|---|
| 📊 **Dashboard** | Tablero | Resumen en vivo: colores, alertas críticas, pendientes |
| 📦 **Inventario** | Inventario | Lotes y su color, con filtros |
| 🔔 **Alertas** | Alertas | Reconocer y cerrar los hallazgos del semáforo |
| 📋 **Sesiones** | Sesiones | Ver auditorías y **cerrarlas** con resumen |
| ✅ **Recepción** | Recepción | Recibir mercadería por foto de factura |

---

## 1. Dashboard 📊

Es tu pantalla de arranque. Muestra:
- **KPIs por color** de todas las sesiones activas (aptos / alerta / urgente / riesgo).
- **Alertas críticas** (rojo y naranja) recientes, con producto, cantidad, bodega y motivo.
  Toca una para ir a la sesión.
- **Productos pendientes de aprobación** detectados en facturas (aparece cuando hay).

## 2. Gestionar alertas 🔔

Las alertas las **dispara el semáforo** cuando un lote alcanza un umbral (amarillo/naranja/rojo).
Quedan con la **versión de la regla congelada** (auditable: no cambian aunque luego se edite la regla).

En **Alertas** las ves en tres pestañas:
- **Abiertas**: nuevas, sin atender.
- **Reconocidas**: ya las viste / estás gestionando → botón **Reconocer**.
- **Cerradas**: resueltas → botón **Cerrar**.

Reconocer y cerrar son acciones de supervisor/admin. El auditor no puede.

## 3. Sesiones y cierre 📋

- Ves todas las sesiones con su resumen de colores y las **críticas** resaltadas.
- Al abrir el detalle ves cada ítem con su color, foto de evidencia, transcripción de voz,
  y —solo tú y el admin— la **razón y acción** de los no verdes.
- Con una sesión **abierta**, aparece el botón **Cerrar sesión**:
  - Genera un resumen (total por color, acciones pendientes).
  - Si hay internet, agrega un **párrafo ejecutivo con IA** de los hallazgos.

## 4. Aprobar productos pendientes

Cuando un auditor recibe una factura con un producto que **no está en el catálogo**, queda
en cola de aprobación. Tú (o el admin) lo revisas y decides:
- **Aprobar** → se incorpora al catálogo y queda disponible para voz y factura.
- **Rechazar** → se descarta.

Llegas por el panel de pendientes del **Dashboard**.

## 5. Reportes HACCP

Documento **imprimible** por período: temperaturas registradas, no conformidades y nivel de
cumplimiento. Útil para inspecciones (INVIMA) y control interno.

## 6. Inventario y Recepción

- **Inventario**: mismo detalle por lote que ve el auditor, con filtros por color para
  ubicar rápido lo que está en rojo/naranja.
- **Recepción**: puedes recibir mercadería por factura igual que un auditor.

---

## Cómo leer el semáforo para decidir

- 🔴 **Rojo / 🟠 Naranja** = atención inmediata. Rojo suele **bloquear la salida** del lote.
- 🟡 **Amarillo** = planificar uso pronto; muchas reglas sugieren **derivar** (banco de
  alimentos, redistribución interna) para no desperdiciar.
- ⚪ **Gris** = falta un dato (ej. temperatura) o falta configurar la regla. Pídele al admin
  que complete la **cobertura de reglas**; gris no significa "aprobado".
