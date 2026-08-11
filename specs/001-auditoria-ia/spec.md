# Feature Specification: AuditorIA — PWA de Auditoría de Inventario

**Feature Branch**: `001-auditoria-ia`

**Created**: 2026-08-09

**Status**: Draft

**Input**: User description: "PWA multi-tenant de auditoría de inventario llamada AuditorIA con captura por voz, semáforo sanitario/sectorial con IA, recepción de mercadería por foto de factura, evidencia fotográfica offline. Tres roles: Auditor, Supervisor, Admin. Primer sector: Alimentos y Bebidas en hotelería colombiana."

---

## User Scenarios & Testing

### User Story 1 — Auditor captura inventario por voz en campo (Priority: P1)

El auditor de turno recorre la bodega de alimentos con su teléfono móvil instalado como aplicación. Para cada producto que cuenta, presiona el botón de voz y dice el nombre y la cantidad. El sistema lo identifica en el catálogo del hotel, muestra inmediatamente su estado de semáforo (verde, amarillo o rojo) con la acción recomendada, y el auditor confirma con un toque. Todo esto funciona sin necesidad de internet.

**Why this priority**: Es el flujo principal del producto. Sin captura por voz offline el sistema no entrega su propuesta de valor central. Todo lo demás depende de que esto funcione.

**Independent Test**: Un auditor puede completar la revisión de una bodega entera — desde abrir la app hasta confirmar el último ítem — sin conexión a internet, y todos los conteos quedan registrados localmente listos para sincronizar.

**Acceptance Scenarios**:

1. **Given** el auditor está en bodega sin señal de red, **When** presiona el botón de voz y dice "veinte litros de leche entera", **Then** el sistema identifica "Leche Entera" del catálogo, muestra el semáforo correspondiente y espera confirmación del auditor.
2. **Given** el producto dicho no existe en el catálogo, **When** el auditor pronuncia un nombre no registrado, **Then** el sistema muestra los 3 productos más parecidos para que el auditor elija manualmente.
3. **Given** el auditor confirma un ítem, **When** no hay conexión, **Then** el conteo se guarda localmente y se marca como "pendiente de sincronización", sin perder ningún dato.
4. **Given** el auditor recupera señal de red, **When** la app detecta conexión, **Then** sincroniza todos los conteos pendientes automáticamente, sin duplicar ningún registro.

---

### User Story 2 — El semáforo informa el estado sanitario de cada producto (Priority: P1)

Al confirmar cada ítem contado, el auditor ve de inmediato si el producto está en buen estado (verde), requiere atención prioritaria (amarillo) o debe retirarse del circuito de consumo (rojo). Junto al color, el sistema explica el motivo, indica qué debe hacer el personal y sugiere una alternativa sostenible si aplica (donación, compostaje, etc.).

**Why this priority**: El semáforo es el diferenciador clave del producto. Sin él, la app es solo un contador; con él, es una herramienta de gestión sanitaria y sostenibilidad.

**Independent Test**: Dado un producto con fecha de vencimiento mañana y empaque intacto, el sistema devuelve "amarillo — priorizar uso inmediato" sin conexión a internet, en menos de 2 segundos.

**Acceptance Scenarios**:

1. **Given** un producto perecedero crítico con 2 días restantes de vencimiento, **When** el auditor lo confirma, **Then** el semáforo muestra amarillo, la razón indica "vence en 2 días", la acción sugiere "priorizar uso inmediato en menú del día" y propone redistribución interna como estrategia sostenible.
2. **Given** un producto con empaque roto, independientemente de su fecha de vencimiento, **When** el auditor lo registra con empaque "roto/abierto", **Then** el semáforo muestra rojo con acción "retirar del consumo humano".
3. **Given** una fruta fresca sin fecha de vencimiento impresa, **When** el auditor indica que fue recibida hace 5 días, **Then** el sistema calcula los días restantes estimados según el tipo de fruta y aplica el semáforo correspondiente, marcando el resultado como "estimado".
4. **Given** un producto en estado rojo por vencimiento pero con empaque íntegro, **When** el sistema lo evalúa, **Then** sugiere una ruta de economía circular (ej. compostaje, donación a banco de alimentos) antes de la disposición final.

---

### User Story 3 — Supervisor ve el estado del inventario en tiempo real (Priority: P2)

El supervisor del área de alimentos accede al dashboard desde su tablet o computador y ve en tiempo real cuántos productos están en cada estado del semáforo, qué bodegas tienen alertas críticas, y el progreso del auditor en turno. Al cerrar una sesión, puede ver un resumen con los hallazgos más importantes.

**Why this priority**: El supervisor es quien toma decisiones de gestión basadas en los datos capturados. Sin dashboard, los datos existen pero nadie actúa sobre ellos.

**Independent Test**: Un supervisor puede abrir el dashboard, identificar todos los productos en rojo de la bodega principal, y ver la foto de evidencia adjunta — todo en menos de un minuto desde que el auditor los registró.

**Acceptance Scenarios**:

1. **Given** el auditor ha registrado 3 productos en rojo en los últimos 10 minutos, **When** el supervisor abre el dashboard, **Then** ve un contador de alertas críticas actualizado y puede hacer clic para ver el detalle de cada una.
2. **Given** una sesión de auditoría está activa, **When** el supervisor la cierra, **Then** el sistema genera un resumen con total de ítems por color, acciones pendientes y (si hay internet) un párrafo ejecutivo con los hallazgos más relevantes.
3. **Given** hay productos pendientes de aprobación, **When** el supervisor accede al panel de aprobaciones, **Then** ve la lista de productos nuevos detectados en facturas, con la descripción extraída y puede aprobar o rechazar cada uno.

---

### User Story 4 — Auditor recibe mercadería fotografiando la factura (Priority: P2)

Cuando llega un pedido al hotel, el auditor fotografía la factura de compra. El sistema lee automáticamente los productos, cantidades y precios de la factura y los compara con el catálogo del hotel. El auditor revisa cada ítem en pantalla, corrige lo que sea necesario, y confirma la recepción. Los productos que no están en el catálogo quedan marcados para aprobación del admin o supervisor.

**Why this priority**: Elimina la doble digitación en la recepción de mercadería, que es donde ocurre la mayoría de los errores de inventario. Es el segundo flujo de mayor valor después de la auditoría.

**Independent Test**: Un auditor fotografía una factura de 10 productos, el sistema identifica correctamente al menos 8, y el auditor puede corregir y confirmar los 2 restantes en menos de 3 minutos total.

**Acceptance Scenarios**:

1. **Given** el auditor fotografía una factura con 10 productos, **When** el sistema la procesa, **Then** muestra una tarjeta de revisión con cada ítem extraído, el producto del catálogo sugerido y la cantidad, esperando confirmación del auditor.
2. **Given** un producto de la factura no está en el catálogo del hotel, **When** el sistema no encuentra coincidencia, **Then** muestra la descripción extraída de la factura marcada como "pendiente de aprobación" y no la registra como inventario hasta que admin/supervisor la apruebe.
3. **Given** la foto de la factura tiene mala iluminación, **When** el sistema no puede leer un ítem con certeza, **Then** lo muestra con un indicador de baja confianza y solicita corrección manual del auditor antes de confirmar.
4. **Given** el auditor confirma toda la recepción, **When** se registra en el sistema, **Then** los ítems aprobados se suman al inventario y la foto de la factura queda archivada como respaldo del movimiento.

---

### User Story 5 — Auditor adjunta foto de evidencia a hallazgos (Priority: P2)

Cuando el auditor encuentra un producto con empaque dañado, signos de deterioro o cualquier hallazgo que requiera documentación, puede tomar una foto directamente desde la app y adjuntarla al registro del ítem. Esta foto queda asociada al conteo y el supervisor puede verla en el dashboard.

**Why this priority**: La evidencia fotográfica transforma el reporte de hallazgos de subjetivo a documentado, esencial para trazabilidad sanitaria y decisiones de descarte.

**Independent Test**: Un auditor sin señal de red toma una foto de un empaque roto, la adjunta al ítem, y al reconectarse la foto aparece en el dashboard del supervisor vinculada al registro correcto.

**Acceptance Scenarios**:

1. **Given** un ítem recibe semáforo rojo, **When** el auditor decide adjuntar evidencia, **Then** la app activa la cámara, toma la foto y la vincula al registro del ítem sin interrumpir el flujo de captura.
2. **Given** el auditor está sin conexión, **When** adjunta una foto de evidencia, **Then** la foto se guarda localmente y la app muestra un aviso de "foto pendiente de sincronización" hasta que haya red.
3. **Given** hay fotos de evidencia pendientes de sincronización, **When** el auditor cierra la app sin conectarse, **Then** al reabrirla el sistema recuerda las fotos pendientes y las sube automáticamente al recuperar señal.

---

### User Story 6 — Admin gestiona el catálogo de productos y usuarios (Priority: P3)

El administrador del hotel carga el listado de productos del establecimiento, con su nombre, unidad de medida, tipo y si requiere fecha de vencimiento según norma. Desde ese momento el sistema puede reconocer esos productos por voz y por foto de factura. El admin también gestiona qué personas tienen acceso al sistema y con qué rol.

**Why this priority**: El catálogo es el insumo que hace funcionar el matching de voz y facturas. Sin él no hay nada que reconocer. Se hace una sola vez al configurar el tenant, por eso es P3 en uso continuo pero P1 en onboarding.

**Independent Test**: El admin carga un archivo con 50 productos, todos quedan listos para ser reconocidos por voz en menos de 5 minutos, y un auditor puede encontrar correctamente "Leche Entera 1L" diciendo "leche" o "leche entera".

**Acceptance Scenarios**:

1. **Given** el admin carga una lista de productos, **When** el proceso de carga termina, **Then** todos los productos quedan disponibles para búsqueda por voz y los nuevos productos tienen su capacidad de reconocimiento activa automáticamente.
2. **Given** el admin aprueba un producto nuevo detectado en una factura, **When** lo aprueba con nombre, unidad y tipo, **Then** el producto se incorpora al catálogo y queda disponible para futuros reconocimientos de voz y factura.
3. **Given** el admin invita a un nuevo auditor, **When** el auditor accede por primera vez, **Then** ve únicamente las funciones correspondientes a su rol y los datos del hotel al que pertenece, sin acceso a datos de otros hoteles.

---

### Edge Cases

- ¿Qué pasa cuando la voz capta ruido de fondo (cocinas industriales, cámaras de frío)?
- ¿Cómo maneja el sistema un producto registrado dos veces en la misma sesión? → Ambos conteos se guardan como registros independientes. El supervisor los ve en el dashboard y decide si hay discrepancia real o duplicado accidental. No hay bloqueo automático.
- ¿Qué ocurre si el auditor confirma una recepción de factura y luego no hay internet para sincronizar?
- ¿Cómo se comporta el semáforo cuando un producto no tiene subtipo definido en el catálogo?
- El formato de audio de MediaRecorder varía por plataforma (webm/opus en Chrome, mp4/aac en Safari iOS) — el sistema lo maneja preservando el mimeType original sin conversión cliente. → Resuelto en FR-018.
- ¿Qué pasa si la foto de evidencia pesa más de lo que IndexedDB puede almacenar en el dispositivo?

---

## Requirements

### Functional Requirements

- **FR-001**: El sistema DEBE permitir registrar el conteo de un producto por voz sin requerir conexión a internet en ningún paso del flujo de auditoría.
- **FR-002**: El sistema DEBE clasificar cada producto auditado con un color de semáforo (verde, amarillo, rojo), razón, acción sugerida y estrategia de economía circular, sin conexión a internet.
- **FR-003**: El sistema DEBE aplicar las reglas del semáforo sanitario según el sector configurado (hoy: alimentos, normas INVIMA Colombia) y permitir que sectores futuros usen reglas diferentes sin cambiar la arquitectura del sistema.
- **FR-004**: El sistema DEBE reconocer productos por nombre aproximado o parcial, no solo por coincidencia exacta, tanto en captura por voz como en lectura de facturas.
- **FR-005**: El sistema DEBE procesar una foto de factura y extraer automáticamente los productos, cantidades y precios listados en ella.
- **FR-006**: El sistema DEBE presentar al auditor una pantalla de revisión ítem por ítem antes de registrar cualquier recepción de mercadería; ningún ítem se registra sin confirmación explícita del auditor.
- **FR-015**: Cuando dos auditores registran el mismo producto en una misma sesión, el sistema DEBE guardar ambos conteos como registros independientes y marcarlo como "conteo duplicado" en el dashboard del supervisor para su revisión.
- **FR-016**: Cuando no hay conexión al momento de capturar por voz, el sistema DEBE grabar el audio, guardarlo localmente junto con su `mimeType` (sin convertir el formato), y mostrar al auditor un estado explícito de "grabado — pendiente de procesar". La UI NUNCA debe mostrar una confirmación de registro exitoso hasta que Groq procese la transcripción.
- **FR-017**: La cola de audios pendientes DEBE vaciarse automáticamente al detectar el evento `online` del navegador y al abrir la app (flush en arranque). No depender únicamente de reintentos temporizados.
- **FR-018**: El sistema DEBE preservar el `mimeType` del audio grabado (webm/opus en Chrome, mp4/aac en Safari iOS) y enviarlo sin modificación al servicio de transcripción. No se realiza ninguna conversión de formato en el cliente.
- **FR-007**: El sistema DEBE bloquear el ingreso al catálogo de cualquier producto nuevo detectado en facturas hasta que admin o supervisor lo aprueben explícitamente.
- **FR-008**: El sistema DEBE permitir adjuntar una foto de evidencia a cualquier ítem auditado, y guardarla localmente cuando no hay internet, sincronizándola automáticamente al recuperar conexión.
- **FR-009**: El sistema DEBE garantizar que ningún usuario acceda a datos de un tenant diferente al suyo, ni en la interfaz ni por API.
- **FR-010**: El sistema DEBE mostrar al auditor un indicador visible cuando hay conteos o fotos pendientes de sincronización.
- **FR-011**: El sistema DEBE ser instalable como aplicación en dispositivos móviles Android e iOS sin requerir descarga desde una tienda de aplicaciones.
- **FR-012**: El supervisor DEBE poder ver en tiempo real el estado del inventario auditado, las alertas críticas y las fotos de evidencia sin necesidad de que el auditor le envíe nada manualmente.
- **FR-013**: El admin DEBE poder cargar o actualizar el catálogo de productos del hotel mediante la subida de un archivo Excel o CSV con columnas predefinidas (nombre, unidad de medida, subtipo sanitario, requiere_fecha_vencimiento). Los cambios DEBEN estar disponibles para reconocimiento por voz y factura en menos de 10 minutos tras la carga.
- **FR-014**: El sistema DEBE validar el archivo cargado antes de procesarlo, informando al admin de filas con errores (columnas faltantes, subtipos desconocidos) sin detener la importación de las filas válidas restantes.

### Key Entities

- **Tenant**: Empresa (hotel) que usa el sistema. Tiene catálogo propio, usuarios propios, sector configurado y datos completamente aislados de otros tenants.
- **Usuario**: Persona con acceso al sistema. Pertenece a un tenant. Tiene un rol (Auditor, Supervisor, Admin) que determina qué puede ver y hacer.
- **Producto**: Ítem del catálogo del tenant. Tiene nombre, unidad de medida, tipo sanitario (para el semáforo), y capacidad de ser reconocido por voz y por foto. La combinación `(tenant_id, nombre, unidad_de_medida)` es la clave de unicidad — el mismo insumo en presentaciones distintas (ej. "Aceite" en litro vs. "Aceite" en caja de 5L) constituye dos productos separados.
- **Sesión de auditoría**: Período de conteo en una bodega o área específica. Tiene un estado (abierta/cerrada), un responsable supervisor y un conjunto de conteos.
- **Conteo**: Registro de un producto auditado dentro de una sesión. Incluye cantidad, estado del empaque, observación visual, fecha de vencimiento o recepción, resultado del semáforo y foto de evidencia opcional.
- **Recepción**: Evento de ingreso de mercadería al hotel, originado en una foto de factura. Contiene los ítems extraídos, sus estados de aprobación y la foto de respaldo.
- **Producto pendiente**: Producto detectado en una factura que no existe en el catálogo. Requiere aprobación de admin/supervisor para integrarse al sistema.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: El auditor completa el registro de un producto (desde presionar el botón de voz hasta confirmar el semáforo) en menos de 15 segundos en condiciones normales.
- **SC-002**: El 90% de los productos dichos por voz son identificados correctamente en el catálogo sin corrección manual del auditor.
- **SC-003**: El 85% de los productos en una factura son identificados y pre-asignados correctamente antes de la revisión manual del auditor.
- **SC-004**: El flujo completo de auditoría (captura + semáforo) funciona sin internet el 100% del tiempo. Cero interrupciones por falta de conexión en el flujo principal.
- **SC-005**: Las fotos de evidencia tomadas offline se sincronizan exitosamente en el 100% de los casos al recuperar conexión, sin pérdida de datos.
- **SC-006**: El supervisor ve los conteos del auditor en el dashboard en menos de 30 segundos desde que el auditor los sincroniza.
- **SC-007**: El 100% de los datos de un tenant son inaccesibles para usuarios de otro tenant, verificable en auditoría de seguridad.
- **SC-008**: Un hotel nuevo puede tener su catálogo cargado y su primer auditor operativo en menos de 30 minutos desde el registro.
- **SC-009**: El sistema soporta hasta 500 productos en el catálogo de un tenant y hasta 5 auditores activos simultáneos por hotel sin degradación de rendimiento en el dashboard ni en el matching semántico.
- **SC-010**: El catálogo completo de hasta 500 productos (con embeddings) cabe en el almacenamiento local del dispositivo y se sincroniza al iniciar sesión en menos de 60 segundos con conexión estándar.

---

## Clarifications

### Session 2026-08-09

- Q: ¿Cómo carga el admin el catálogo de productos del hotel inicialmente? → A: Subida de archivo Excel/CSV con columnas predefinidas (nombre, unidad, subtipo, requiere_fecha_vencimiento). El sistema valida filas inválidas sin detener la importación de las válidas.
- Q: ¿Cuántos productos puede tener el catálogo de un tenant y cuántos auditores activos simultáneos se esperan? → A: Hasta 500 productos por tenant y hasta 5 auditores simultáneos por hotel (referencia v1). El catálogo completo cabe en IndexedDB para matching offline total sin estrategia de caché parcial.
- Q: ¿Qué identifica de forma única a un producto en el catálogo de un tenant? → A: La combinación nombre + unidad de medida. El mismo insumo en presentaciones distintas (ej. "Aceite 1L" vs "Aceite 5L") son productos separados. Clave: `(tenant_id, nombre, unidad_de_medida)`.
- Q: ¿Qué debe ocurrir cuando dos auditores cuentan el mismo producto en la misma sesión? → A: Ambos conteos se guardan como registros independientes. El supervisor los ve en el dashboard y resuelve discrepancias. No hay bloqueo ni sobreescritura automática.
- Q: ¿Qué hace el sistema cuando Groq Whisper no está disponible y el auditor captura por voz? → A: El audio se graba siempre y se encola localmente con su mimeType. La UI muestra estado "grabado, pendiente de procesar" — sin spinners infinitos ni confirmaciones falsas. La cola se vacía al recuperar conexión (evento `online`) y al abrir la app (flush en arranque), no solo por reintentos temporizados. El mimeType (webm/opus en Chrome, mp4/aac en Safari iOS) se guarda con el blob y se envía tal cual a Groq sin conversión en cliente.

## Assumptions

- Los auditores usan dispositivos móviles modernos (Android 10+ o iOS 14+) con micrófono funcional y cámara.
- El hotel tiene un catálogo de productos digitizable (lista en papel, Excel o sistema existente). El admin realiza la carga inicial antes de que los auditores empiecen a usar el sistema.
- La captura de voz requiere que el auditor mantenga presionado el botón mientras habla (no activación por palabra clave), para evitar capturas accidentales en ambientes ruidosos.
- La recepción de mercadería por foto de factura requiere conexión a internet (la extracción de texto de imágenes no funciona offline).
- El semáforo aplica las normas sanitarias colombianas (INVIMA) en la versión v1. La adaptación a normativas de otros países es alcance futuro.
- Los usuarios se autentican con email y contraseña. Autenticación social (Google, etc.) es alcance futuro.
- Un auditor pertenece a un único hotel. Un usuario no puede pertenecer a múltiples tenants simultáneamente en v1.
- Las fotos de evidencia se comprimen automáticamente antes de guardarse para no exceder los límites de almacenamiento local del dispositivo (máximo 2MB por foto después de compresión).
