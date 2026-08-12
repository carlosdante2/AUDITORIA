# Manuales de usuario — AuditorIA

AuditorIA es la app de auditoría de inventario de Alimentos y Bebidas. Funciona en el
teléfono (instalable como app) y **sirve sin conexión a internet** en el flujo de campo.

Cada persona entra con su correo y contraseña, y ve **solo** las funciones de su rol.
El rol aparece como una etiqueta de color arriba a la derecha (rojo = admin, azul =
supervisor, verde = auditor) y define los **5 iconos de la barra inferior**.

## ¿Cuál manual me toca?

| Rol | Para quién | Manual |
|---|---|---|
| 🟢 **Auditor** | Quien recorre la bodega y cuenta el inventario | [manual-auditor.md](manual-auditor.md) |
| 🔵 **Supervisor** | Quien vigila el estado, revisa alertas y cierra sesiones | [manual-supervisor.md](manual-supervisor.md) |
| 🔴 **Admin** | Quien configura el sistema (catálogo, reglas, usuarios) | [manual-admin.md](manual-admin.md) |

## El semáforo (común a todos)

Cada lote de producto recibe un color según las **reglas que configura el admin**
(no son fijas: cada hotel las adapta). Los colores, de mejor a peor:

| Color | Significa | Acción típica |
|---|---|---|
| 🟢 **Verde** | Apto | Usar con normalidad (rotación FIFO) |
| 🟡 **Amarillo** | Alerta | Priorizar uso pronto |
| 🟠 **Naranja** | Urgente | Usar ya o derivar (ej. banco de alimentos) |
| 🔴 **Rojo** | Riesgo | Retirar del consumo / bloquear salida |
| ⚪ **Gris** | Sin dato | Falta información o falta configurar la regla (no es "apto") |

Junto al color, el sistema explica **por qué** bajó y, cuando aplica, sugiere una **ruta
de valorización** (redistribución interna, banco de alimentos, compostaje…).
