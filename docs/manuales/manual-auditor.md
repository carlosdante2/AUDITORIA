# Manual del Auditor 🟢

Tu trabajo es **recorrer la bodega y registrar el inventario**. La app te dice, en el
momento, si cada producto está en buen estado. **Todo funciona sin internet**: cuenta
tranquilo aunque no haya señal; los datos se guardan en el teléfono y se sincronizan
solos cuando vuelve la conexión.

## Tu barra inferior (5 iconos)

| Icono | Pantalla | Para qué |
|---|---|---|
| 🎤 **Captura** | Contar inventario | Registrar productos por voz o a mano |
| 🌡️ **Temp.** | Temperatura | Anotar la temperatura de cámaras y neveras |
| 📦 **Inventario** | Inventario | Ver los lotes y su color de semáforo |
| 📋 **Sesiones** | Sesiones | Ver las auditorías y su detalle |
| ✅ **Recepción** | Recepción | Recibir mercadería fotografiando la factura |

---

## 1. Captura de inventario (lo principal)

1. Entra a **Captura**.
2. **Por voz**: mantén presionado el botón del micrófono y di el producto y la cantidad
   (ej. *"veinte litros de leche entera"*). Suéltalo al terminar.
   - Si no hay señal, el audio queda **"grabado — pendiente de procesar"** y se transcribe
     cuando vuelva internet. Nunca pierdas la cuenta por falta de red.
   - **A mano**: escribe el nombre en el buscador y elige el producto de la lista.
3. Si el producto dicho no aparece, la app muestra los **3 más parecidos** para que elijas.
4. Completa los datos que pida:
   - **Cantidad** (en la unidad del producto).
   - **Fecha de vencimiento** (si el producto la exige) o **fecha de recepción**.
     Si ya tomaste la foto de evidencia, puedes tocar **"Leer fecha de la foto"**
     para que la IA la busque en el empaque — siempre debes **confirmarla** antes
     de guardar (puedes corregirla si no quedó bien).
   - **Código de lote** (opcional, pero mejora la trazabilidad).
   - **Equipo** (cámara/nevera) donde está, si aplica.
   - **Estado del empaque**: Intacto / Daño leve / Roto o fuga / **No aplica** (para
     productos a granel sin empaque, como papa, tomate o cebolla en canasta).
   - **Observación visual**: Normal / Dudoso / No conforme. Debajo del botón que elijas
     aparecen ejemplos de qué encaja en cada nivel:
     - **Normal**: apariencia fresca, color uniforme, textura firme, sin daños visibles.
     - **Dudoso**: abolladuras, magulladuras puntuales, inicio de maduración avanzada,
       textura algo blanda, cambio leve de color.
     - **No conforme**: moho/hongos, magulladura extensa, aplastado o reventado,
       sobremaduro/podrido, mal olor, manchas oscuras extendidas, insectos o plagas.
5. Verás el **semáforo del producto** (verde/amarillo/naranja/rojo/gris) con el motivo.
   - Offline dice **"Provisional"**: es un adelanto; el resultado final se confirma al
     sincronizar. Empaque **roto** u observación **no conforme** lo marcan como no apto.
6. Toma la **foto de evidencia** — es **obligatoria**: respalda el estado de empaque y la
   observación visual que elegiste.
7. Si quieres, agrega un **comentario** (opcional) con cualquier detalle adicional.
8. Pulsa **Confirmar conteo**. Se guarda y queda listo para el siguiente ítem.

> **Sincronización:** cuando el teléfono recupera señal, todos los conteos y fotos
> pendientes se suben solos, sin duplicar nada. El indicador te avisa si queda algo por subir.

## 2. Registrar temperatura 🌡️

1. Entra a **Temp.**
2. Cada equipo muestra su **ubicación real** (sede · sección) para que sepas
   exactamente cuál nevera es cuál. Si no tiene ubicación, pídele al admin
   que se la asigne en Equipos de frío.
3. Escribe la temperatura en °C y guarda. La hora la pone el servidor (no se puede alterar).
4. Toca **"Historial"** en cualquier equipo para ver las últimas lecturas
   registradas, con fecha, hora y quién las tomó.

Estas lecturas alimentan las reglas de **cadena de frío**: si un equipo se calienta o
lleva mucho sin medirse, sus lotes cambian de color automáticamente.

## 3. Ver inventario 📦

Lista de lotes con su **chip de color**, la **categoría** del producto y la **ubicación**
real del equipo donde está (sede · sección). Toca uno para ver el detalle: qué dimensión
bajó el semáforo, qué regla se aplicó y con qué valor. Puedes filtrar por color (ej. ver
solo los rojos).

## 4. Sesiones 📋

Una **sesión** es un período de conteo en una bodega/área. Puedes ver las sesiones y su
detalle (ítems contados, colores, fotos, comentarios y la recomendación de qué hacer con
el producto). *Cerrar* una sesión lo hace el supervisor.

Cada ítem con lote creado trae un enlace **"Ver en Inventario"** que te lleva directo a
su estado actual — el conteo que hiciste y el lote de inventario son dos cosas
distintas (el conteo es la foto del momento; el lote se sigue re-evaluando solo con
el tiempo), pero ahora quedan conectadas.

## 5. Recepción por factura ✅

1. Entra a **Recepción → Nueva**.
2. **Fotografía la factura**. La app lee los productos, cantidades y precios.
3. Revisa **ítem por ítem**: corrige lo que haga falta y confirma.
   - Un producto que **no está en el catálogo** queda marcado como *pendiente de aprobación*
     (lo aprueba admin o supervisor). No entra al inventario hasta entonces.
4. Al confirmar, los productos aprobados **crean lotes** y se suman al inventario; la foto
   de la factura queda archivada como respaldo.

> La recepción por factura **sí necesita internet** (la lectura de la imagen es en línea).

---

## Consejos rápidos

- **Mantén presionado** el micrófono mientras hablas (evita capturas por ruido de cocina).
- Si ves **gris**, no es "aprobado": falta un dato o falta una regla. Avisa al supervisor.
- No borres nada por las dudas: los registros no se eliminan, se corrigen.
- Revisa el indicador de **pendientes de sincronización** antes de cerrar la app.
