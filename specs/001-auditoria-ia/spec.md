# Feature Specification: Fresko — PWA de Auditoría de Inventario

**Feature Branch**: `001-auditoria-ia`

**Created**: 2026-08-09

**Updated**: 2026-08-12 — unificación con el spec del Motor de Semáforo Sanitario Configurable (ver Anexo Técnico).

**Status**: Draft

**Input**: User description: "PWA multi-tenant de auditoría de inventario llamada Fresko con captura por voz, semáforo sanitario/sectorial con IA, recepción de mercadería por foto de factura, evidencia fotográfica offline. Tres roles: Auditor, Supervisor, Admin. Primer sector: Alimentos y Bebidas en hotelería colombiana."

> **Nota de unificación:** este documento fusiona el spec de producto original con el spec técnico del **Motor de Semáforo Sanitario Configurable**. Las secciones 1–4 describen el producto a nivel de requisitos; el **Anexo Técnico** (sección 5) contiene el modelo de datos, el algoritmo de evaluación y la API del motor. La **regla de oro** del motor gobierna todo el semáforo: ningún umbral, rango de temperatura, cantidad de días o color puede estar escrito en el código; todo vive en base de datos y lo define el administrador de cada hotel.

---

## 1. User Scenarios & Testing

### User Story 1 — Auditor captura inventario por voz en campo (Priority: P1)

El auditor de turno recorre la bodega de alimentos con su teléfono móvil instalado como aplicación. Para cada producto que cuenta, presiona el botón de voz y dice el nombre y la cantidad. El sistema lo identifica en el catálogo del hotel, muestra inmediatamente su estado de semáforo con la acción recomendada, y el auditor confirma con un toque. Todo esto funciona sin necesidad de internet.

**Why this priority**: Es el flujo principal del producto. Sin captura por voz offline el sistema no entrega su propuesta de valor central. Todo lo demás depende de que esto funcione.

**Independent Test**: Un auditor puede completar la revisión de una bodega entera — desde abrir la app hasta confirmar el último ítem — sin conexión a internet, y todos los conteos quedan registrados localmente listos para sincronizar.

**Acceptance Scenarios**:

1. **Given** el auditor está en bodega sin señal de red, **When** presiona el botón de voz y dice "veinte litros de leche entera", **Then** el sistema identifica "Leche Entera" del catálogo, muestra el semáforo correspondiente y espera confirmación del auditor.
2. **Given** el producto dicho no existe en el catálogo, **When** el auditor pronuncia un nombre no registrado, **Then** el sistema muestra los 3 productos más parecidos para que el auditor elija manualmente.
3. **Given** el auditor confirma un ítem, **When** no hay conexión, **Then** el conteo se guarda localmente y se marca como "pendiente de sincronización", sin perder ningún dato.
4. **Given** el auditor recupera señal de red, **When** la app detecta conexión, **Then** sincroniza todos los conteos pendientes automáticamente, sin duplicar ningún registro.

---

### User Story 2 — El semáforo informa el estado sanitario de cada lote según reglas configurables (Priority: P1)

Al confirmar cada ítem contado, el auditor ve de inmediato el color del semáforo del lote. El color **no** se calcula con lógica cableada: resulta de evaluar las reglas que el administrador del hotel definió desde el panel. Junto al color, el sistema explica qué dimensión bajó el semáforo, qué regla ganó, qué valor la disparó, qué debe hacer el personal y — si aplica — sugiere una alternativa sostenible (donación, compostaje, redistribución).

Los colores posibles son cinco: **VERDE** (sano), **AMARILLO** (atención), **NARANJA** (urgente), **ROJO** (retirar/bloquear) y **GRIS** (indeterminado: falta el dato para evaluar — nunca se trata como verde).

**Why this priority**: El semáforo configurable es el diferenciador clave del producto. Sin él, la app es solo un contador; con él, es una herramienta de gestión sanitaria auditable y adaptable a los lineamientos de cada hotel y sector.

**Independent Test**: Con una regla de VENCIMIENTO configurada por el admin, un lote con 2 días restantes y empaque intacto devuelve el color y el mensaje que esa regla define — sin conexión a internet, en menos de 2 segundos — evaluando la copia cacheada de las reglas, no umbrales cableados.

**Acceptance Scenarios**:

1. **Given** el admin configuró una regla de VENCIMIENTO con umbral AMARILLO para "vence en 1–6 días", **When** el auditor confirma un lote perecedero con 2 días restantes, **Then** el semáforo muestra el color y el mensaje de esa regla, explica "vence en 2 días", sugiere la acción configurada y propone la ruta de economía circular cuando aplique.
2. **Given** existe una regla de TRAZABILIDAD que exige código de lote, proveedor y fecha de vencimiento, **When** el auditor registra un lote con empaque roto o con campos obligatorios faltantes, **Then** el semáforo aplica el umbral ROJO configurado y muestra la acción de bloqueo/retiro definida por la regla.
3. **Given** una fruta fresca sin fecha de vencimiento impresa y sin regla que cubra ese caso, **When** el auditor la registra, **Then** el sistema devuelve **GRIS** con motivo "falta el dato / sin regla configurada" — nunca VERDE — y lo marca como indeterminado.
4. **Given** un lote alcanza un umbral ROJO por vencimiento pero conserva empaque íntegro, **When** el sistema lo evalúa, **Then** sugiere una ruta de economía circular (compostaje, donación a banco de alimentos) antes de la disposición final, si la acción de la regla lo contempla.
5. **Given** el admin cambia hoy un umbral de una regla, **When** el sistema re-evalúa los lotes, **Then** los lotes reflejan el nuevo color pero las alertas ya emitidas conservan la versión de regla con la que se dispararon (no se recalculan).

---

### User Story 3 — Supervisor ve el estado del inventario en tiempo real (Priority: P2)

El supervisor del área de alimentos accede al dashboard desde su tablet o computador y ve en tiempo real cuántos lotes están en cada color del semáforo, qué bodegas tienen alertas críticas, qué bloqueos de salida/ingreso están activos, y el progreso del auditor en turno. Al cerrar una sesión, puede ver un resumen con los hallazgos más importantes.

**Why this priority**: El supervisor es quien toma decisiones de gestión basadas en los datos capturados. Sin dashboard, los datos existen pero nadie actúa sobre ellos.

**Independent Test**: Un supervisor puede abrir el dashboard, identificar todos los lotes en ROJO de la bodega principal, ver la foto de evidencia adjunta y el detalle de qué regla bajó el semáforo — todo en menos de un minuto desde que el auditor los registró.

**Acceptance Scenarios**:

1. **Given** el auditor ha registrado 3 lotes en ROJO en los últimos 10 minutos, **When** el supervisor abre el dashboard, **Then** ve un contador de alertas críticas actualizado y puede hacer clic para ver el detalle de cada una (regla, versión, valor evaluado, mensaje).
2. **Given** una sesión de auditoría está activa, **When** el supervisor la cierra, **Then** el sistema genera un resumen con total de ítems por color, bloqueos y acciones pendientes y (si hay internet) un párrafo ejecutivo con los hallazgos más relevantes.
3. **Given** hay productos pendientes de aprobación, **When** el supervisor accede al panel de aprobaciones, **Then** ve la lista de productos nuevos detectados en facturas, con la descripción extraída y puede aprobar o rechazar cada uno.

---

### User Story 4 — Auditor recibe mercadería fotografiando la factura (Priority: P2)

Cuando llega un pedido al hotel, el auditor fotografía la factura de compra. El sistema lee automáticamente los productos, cantidades y precios de la factura y los compara con el catálogo del hotel. El auditor revisa cada ítem en pantalla, corrige lo que sea necesario, y confirma la recepción. Cada recepción confirmada crea uno o más **lotes** de primera clase (sin lote no hay trazabilidad). Los productos que no están en el catálogo quedan marcados para aprobación del admin o supervisor.

**Why this priority**: Elimina la doble digitación en la recepción de mercadería, que es donde ocurre la mayoría de los errores de inventario. Es el segundo flujo de mayor valor después de la auditoría.

**Independent Test**: Un auditor fotografía una factura de 10 productos, el sistema identifica correctamente al menos 8, y el auditor puede corregir y confirmar los 2 restantes en menos de 3 minutos total.

**Acceptance Scenarios**:

1. **Given** el auditor fotografía una factura con 10 productos, **When** el sistema la procesa, **Then** muestra una tarjeta de revisión con cada ítem extraído, el producto del catálogo sugerido y la cantidad, esperando confirmación del auditor.
2. **Given** un producto de la factura no está en el catálogo del hotel, **When** el sistema no encuentra coincidencia, **Then** muestra la descripción extraída de la factura marcada como "pendiente de aprobación" y no la registra como inventario hasta que admin/supervisor la apruebe.
3. **Given** la foto de la factura tiene mala iluminación, **When** el sistema no puede leer un ítem con certeza, **Then** lo muestra con un indicador de baja confianza y solicita corrección manual del auditor antes de confirmar.
4. **Given** el auditor confirma toda la recepción, **When** se registra en el sistema, **Then** los ítems aprobados se materializan como lotes, se suman al inventario, se evalúan contra las reglas del hotel, y la foto de la factura queda archivada como respaldo del movimiento.

---

### User Story 5 — Auditor adjunta foto de evidencia a hallazgos (Priority: P2)

Cuando el auditor encuentra un producto con empaque dañado, signos de deterioro o cualquier hallazgo que requiera documentación, puede tomar una foto directamente desde la app y adjuntarla al registro del ítem. Esta foto queda asociada al conteo y el supervisor puede verla en el dashboard.

**Why this priority**: La evidencia fotográfica transforma el reporte de hallazgos de subjetivo a documentado, esencial para trazabilidad sanitaria y decisiones de descarte.

**Independent Test**: Un auditor sin señal de red toma una foto de un empaque roto, la adjunta al ítem, y al reconectarse la foto aparece en el dashboard del supervisor vinculada al registro correcto.

**Acceptance Scenarios**:

1. **Given** un ítem recibe semáforo ROJO, **When** el auditor decide adjuntar evidencia, **Then** la app activa la cámara, toma la foto y la vincula al registro del ítem sin interrumpir el flujo de captura.
2. **Given** el auditor está sin conexión, **When** adjunta una foto de evidencia, **Then** la foto se guarda localmente y la app muestra un aviso de "foto pendiente de sincronización" hasta que haya red.
3. **Given** hay fotos de evidencia pendientes de sincronización, **When** el auditor cierra la app sin conectarse, **Then** al reabrirla el sistema recuerda las fotos pendientes y las sube automáticamente al recuperar señal.

---

### User Story 6 — Admin gestiona catálogo, usuarios y reglas del semáforo (Priority: P3)

El administrador del hotel carga el listado de productos del establecimiento, con su nombre, unidad de medida, tipo y si requiere fecha de vencimiento según norma. Desde ese momento el sistema puede reconocer esos productos por voz y por foto de factura. El admin también configura las **reglas del semáforo** (umbrales, colores, acciones) por ámbito Global / Categoría / Producto, y gestiona qué personas tienen acceso al sistema y con qué rol.

**Why this priority**: El catálogo y las reglas son el insumo que hace funcionar el matching y el semáforo. Sin catálogo no hay nada que reconocer; sin reglas configuradas el semáforo devuelve GRIS. Se configura al onboarding del tenant, por eso es P3 en uso continuo pero P1 en onboarding.

**Independent Test**: El admin carga un archivo con 50 productos y configura al menos una regla de VENCIMIENTO global; todos los productos quedan reconocibles por voz en menos de 5 minutos y un lote nuevo recibe un color distinto de GRIS al ser evaluado.

**Acceptance Scenarios**:

1. **Given** el admin carga una lista de productos, **When** el proceso de carga termina, **Then** todos los productos quedan disponibles para búsqueda por voz y los nuevos productos tienen su capacidad de reconocimiento activa automáticamente.
2. **Given** el admin aprueba un producto nuevo detectado en una factura, **When** lo aprueba con nombre, unidad y tipo, **Then** el producto se incorpora al catálogo y queda disponible para futuros reconocimientos de voz y factura.
3. **Given** el admin invita a un nuevo auditor, **When** el auditor accede por primera vez, **Then** ve únicamente las funciones correspondientes a su rol y los datos del hotel al que pertenece, sin acceso a datos de otros hoteles.
4. **Given** el admin edita una regla existente, **When** guarda los cambios, **Then** el sistema cierra la versión vigente y crea una versión nueva (no sobreescribe), re-evalúa los lotes afectados por el ámbito y ofrece un simulador para verificar el resultado antes de confiar en él.
5. **Given** el admin intenta guardar una regla con umbrales que se solapan, sin ROJO, o con unidad incoherente con el tipo, **When** presiona guardar, **Then** el sistema rechaza o advierte según la validación correspondiente antes de persistir.

---

### Edge Cases

- ¿Qué pasa cuando la voz capta ruido de fondo (cocinas industriales, cámaras de frío)?
- ¿Cómo maneja el sistema un producto registrado dos veces en la misma sesión? → Ambos conteos se guardan como registros independientes. El supervisor los ve en el dashboard y decide si hay discrepancia real o duplicado accidental. No hay bloqueo automático.
- ¿Qué ocurre si el auditor confirma una recepción de factura y luego no hay internet para sincronizar?
- ¿Cómo se comporta el semáforo cuando un lote no tiene regla que cubra su tipo/categoría? → Devuelve **GRIS** con motivo `SIN_REGLA_CONFIGURADA`. Nunca VERDE.
- ¿Qué pasa cuando falta el dato para evaluar un tipo (sin lectura de temperatura, sin fecha de vencimiento)? → Ese tipo devuelve GRIS; GRIS tiene mayor severidad que VERDE en la agregación.
- El formato de audio de MediaRecorder varía por plataforma (webm/opus en Chrome, mp4/aac en Safari iOS) — el sistema lo maneja preservando el mimeType original sin conversión cliente. → Resuelto en FR-018.
- ¿Qué pasa si la foto de evidencia pesa más de lo que IndexedDB puede almacenar en el dispositivo?

---

## 2. Requirements

### Functional Requirements

#### Captura, reconocimiento y offline

- **FR-001**: El sistema DEBE permitir registrar el conteo de un producto por voz sin requerir conexión a internet en ningún paso del flujo de auditoría.
- **FR-004**: El sistema DEBE reconocer productos por nombre aproximado o parcial, no solo por coincidencia exacta, tanto en captura por voz como en lectura de facturas.
- **FR-010**: El sistema DEBE mostrar al auditor un indicador visible cuando hay conteos o fotos pendientes de sincronización.
- **FR-011**: El sistema DEBE ser instalable como aplicación en dispositivos móviles Android e iOS sin requerir descarga desde una tienda de aplicaciones.
- **FR-015**: Cuando dos auditores registran el mismo producto en una misma sesión, el sistema DEBE guardar ambos conteos como registros independientes y marcarlo como "conteo duplicado" en el dashboard del supervisor para su revisión.
- **FR-016**: Cuando no hay conexión al momento de capturar por voz, el sistema DEBE grabar el audio, guardarlo localmente junto con su `mimeType` (sin convertir el formato), y mostrar al auditor un estado explícito de "grabado — pendiente de procesar". La UI NUNCA debe mostrar una confirmación de registro exitoso hasta que Groq procese la transcripción.
- **FR-017**: La cola de audios pendientes DEBE vaciarse automáticamente al detectar el evento `online` del navegador y al abrir la app (flush en arranque). No depender únicamente de reintentos temporizados.
- **FR-018**: El sistema DEBE preservar el `mimeType` del audio grabado (webm/opus en Chrome, mp4/aac en Safari iOS) y enviarlo sin modificación al servicio de transcripción. No se realiza ninguna conversión de formato en el cliente.

#### Semáforo sanitario configurable (motor de reglas)

- **FR-002**: El sistema DEBE clasificar cada lote auditado con un color de semáforo (VERDE, AMARILLO, NARANJA, ROJO, GRIS), razón, valor evaluado, acción sugerida y — cuando aplique — estrategia de economía circular. La evaluación de campo DEBE funcionar sin conexión evaluando una copia cacheada de las reglas del hotel con el mismo evaluador que el servidor; la evaluación autoritativa se materializa en el servidor (ver Anexo §5.2.5).
- **FR-003**: El sistema DEBE calcular el color de cada lote evaluando reglas configuradas por el administrador — NUNCA con umbrales, rangos, días o colores escritos en el código (frontend, backend o job). Las reglas se definen por ámbito Global / Categoría / Producto y el sistema resuelve la más específica aplicable (ver Anexo §5.2.1). Sectores futuros DEBEN poder usar reglas diferentes sin cambiar la arquitectura.
- **FR-019**: El sistema DEBE soportar los tipos de regla del MVP: `VENCIMIENTO`, `TEMPERATURA`, `LECTURA_VENCIDA`, `TRAZABILIDAD` y `CUARENTENA` (con `POST_APERTURA` y `STOCK_MINIMO` como tipos previstos). Cada tipo extrae su valor según Anexo §5.2.2.
- **FR-020**: Cuando no existe regla aplicable para un tipo, o falta el dato necesario para evaluarlo, el sistema DEBE devolver **GRIS** con su motivo, y NUNCA VERDE. En la agregación, GRIS tiene mayor severidad que VERDE.
- **FR-021**: El color final del lote DEBE ser el de mayor severidad entre todas las reglas evaluadas, y los bloqueos (`BLOQUEA_SALIDA`, `BLOQUEA_INGRESO`, `FUERZA_CUARENTENA`) DEBEN agregarse por OR de los umbrales disparados.
- **FR-022**: Al editar una regla, el sistema NO DEBE hacer UPDATE: cierra la versión vigente (`vigente_hasta = now()`) y crea una versión nueva (`version + 1`). El historial de reglas es parte de la auditoría.
- **FR-023**: Al guardar una regla el sistema DEBE validar antes de persistir: solapamiento de rangos (rechazo), cobertura incompleta del dominio (autocompletar con VERDE avisando), ausencia de ROJO (advertencia bloqueante con confirmación), unidad incoherente con el tipo (rechazo) y monotonía invertida (advertencia). Ver Anexo §5.3.
- **FR-024**: El sistema DEBE ofrecer al admin un **simulador** que, dado un caso hipotético, muestre el color resultante, qué regla ganó y por qué (especificidad aplicada) y qué bloqueos se activarían — sin persistir nada.
- **FR-025**: El sistema DEBE ofrecer una vista de **cobertura de reglas** (matriz categorías × tipos) que resalte las combinaciones sin regla configurada, como defensa contra la configuración a medias.
- **FR-026**: El sistema DEBE re-evaluar los lotes afectados: al crear/modificar un lote, al registrar una lectura de temperatura (lotes del equipo), al guardar/activar/desactivar una regla (lotes del hotel afectados por el ámbito) y mediante un job programado horario (para que `VENCIMIENTO` y `LECTURA_VENCIDA` avancen solos).
- **FR-027**: El sistema DEBE emitir alertas con la **versión de regla y el umbral congelados**. Las alertas históricas NUNCA se recalculan aunque la regla cambie después.
- **FR-028**: El sistema DEBE registrar lecturas de temperatura por equipo con **hora de servidor** (nunca del cliente), usuario y evidencia opcional, para alimentar las reglas `TEMPERATURA` y `LECTURA_VENCIDA` (cadena de frío).

#### Recepción, catálogo y evidencia

- **FR-005**: El sistema DEBE procesar una foto de factura y extraer automáticamente los productos, cantidades y precios listados en ella.
- **FR-006**: El sistema DEBE presentar al auditor una pantalla de revisión ítem por ítem antes de registrar cualquier recepción de mercadería; ningún ítem se registra sin confirmación explícita del auditor.
- **FR-007**: El sistema DEBE bloquear el ingreso al catálogo de cualquier producto nuevo detectado en facturas hasta que admin o supervisor lo aprueben explícitamente.
- **FR-008**: El sistema DEBE permitir adjuntar una foto de evidencia a cualquier ítem auditado, y guardarla localmente cuando no hay internet, sincronizándola automáticamente al recuperar conexión.
- **FR-013**: El admin DEBE poder cargar o actualizar el catálogo de productos del hotel mediante la subida de un archivo Excel o CSV con columnas predefinidas (nombre, unidad de medida, subtipo sanitario, requiere_fecha_vencimiento). Los cambios DEBEN estar disponibles para reconocimiento por voz y factura en menos de 10 minutos tras la carga.
- **FR-014**: El sistema DEBE validar el archivo cargado antes de procesarlo, informando al admin de filas con errores (columnas faltantes, subtipos desconocidos) sin detener la importación de las filas válidas restantes.

#### Multi-tenant, tiempo real y auditabilidad

- **FR-009**: El sistema DEBE garantizar que ningún usuario acceda a datos de un tenant diferente al suyo, ni en la interfaz ni por API. Se aplica **RLS en Supabase** sobre `hotel_id` en todas las tablas; no se confía únicamente en el filtro de la capa de aplicación.
- **FR-012**: El supervisor DEBE poder ver en tiempo real el estado del inventario auditado, las alertas críticas y las fotos de evidencia sin necesidad de que el auditor le envíe nada manualmente.
- **FR-029**: Los registros NO se eliminan. La corrección se hace por contra-asiento con motivo y usuario; nunca `DELETE` sobre lotes, movimientos o alertas. El stock negativo está prohibido en perecibles (rechazar el movimiento). Toda acción lleva `usuario_id` y la evidencia fotográfica lleva hash SHA-256 + timestamp de servidor.

### Key Entities

- **Tenant (Hotel)**: Empresa que usa el sistema. Tiene catálogo propio, usuarios propios, reglas propias, sector configurado y datos completamente aislados de otros tenants.
- **Usuario**: Persona con acceso al sistema. Pertenece a un tenant. Tiene un rol (Auditor, Supervisor, Admin) que determina qué puede ver y hacer.
- **Categoría**: Agrupación jerárquica opcional de productos del tenant (`parent_id`). Ámbito posible de una regla.
- **Producto**: Ítem del catálogo del tenant. Tiene nombre, unidad de medida, tipo/condición sanitaria y capacidad de ser reconocido por voz y por foto. Clave de unicidad `(tenant_id, nombre, unidad_de_medida)`: el mismo insumo en presentaciones distintas ("Aceite 1L" vs "Aceite 5L") son productos separados.
- **Lote**: Entidad de primera clase; sin lote no hay trazabilidad. Instancia física de un producto con cantidad, fechas (recepción, producción, vencimiento, apertura), proveedor, ubicación y estado de cuarentena.
- **Regla**: Definición configurable por el admin (tipo, ámbito, versión, vigencia) que determina cómo se colorea un lote. Ver Anexo §5.1.2.
- **Umbral de regla**: Fila de una regla (color, operador, valores, unidad, acción, mensaje) que traduce un valor evaluado a un color y una acción.
- **Estado de lote (materializado)**: Resultado evaluado de un lote (color final, detalle por dimensión, bloqueos), recalculado por el motor.
- **Alerta**: Evento disparado por un umbral, con versión de regla y umbral **congelados**; nunca se recalcula.
- **Equipo / Lectura de temperatura**: Cámara/nevera/vitrina y sus mediciones con hora de servidor, insumo de las reglas de cadena de frío.
- **Sesión de auditoría**: Período de conteo en una bodega o área. Tiene estado (abierta/cerrada), un supervisor responsable y un conjunto de conteos.
- **Conteo**: Registro de un producto/lote auditado dentro de una sesión. Incluye cantidad, estado del empaque, observación visual, fechas, resultado del semáforo y foto de evidencia opcional.
- **Recepción**: Evento de ingreso de mercadería originado en una foto de factura. Contiene los ítems extraídos, sus estados de aprobación, los lotes creados y la foto de respaldo.
- **Producto pendiente**: Producto detectado en una factura que no existe en el catálogo. Requiere aprobación de admin/supervisor para integrarse al sistema.

---

## 3. Success Criteria

### Measurable Outcomes

- **SC-001**: El auditor completa el registro de un producto (desde presionar el botón de voz hasta confirmar el semáforo) en menos de 15 segundos en condiciones normales.
- **SC-002**: El 90% de los productos dichos por voz son identificados correctamente en el catálogo sin corrección manual del auditor.
- **SC-003**: El 85% de los productos en una factura son identificados y pre-asignados correctamente antes de la revisión manual del auditor.
- **SC-004**: El flujo completo de auditoría (captura + semáforo evaluado contra reglas cacheadas) funciona sin internet el 100% del tiempo. Cero interrupciones por falta de conexión en el flujo principal.
- **SC-005**: Las fotos de evidencia tomadas offline se sincronizan exitosamente en el 100% de los casos al recuperar conexión, sin pérdida de datos.
- **SC-006**: El supervisor ve los conteos del auditor en el dashboard en menos de 30 segundos desde que el auditor los sincroniza.
- **SC-007**: El 100% de los datos de un tenant son inaccesibles para usuarios de otro tenant, verificable en auditoría de seguridad.
- **SC-008**: Un hotel nuevo puede tener su catálogo cargado, al menos una regla por tipo del MVP configurada y su primer auditor operativo en menos de 30 minutos desde el registro.
- **SC-009**: El sistema soporta hasta 500 productos en el catálogo de un tenant y hasta 5 auditores activos simultáneos por hotel sin degradación de rendimiento en el dashboard ni en el matching semántico.
- **SC-010**: El catálogo completo de hasta 500 productos (con embeddings) y el conjunto de reglas del hotel caben en el almacenamiento local del dispositivo y se sincronizan al iniciar sesión en menos de 60 segundos con conexión estándar.
- **SC-011**: Cero umbrales, rangos, días o colores del semáforo escritos en el código: una búsqueda de valores cableados (p. ej. `if (dias < 7)`) en frontend, backend y job no arroja coincidencias.

---

## 4. Clarifications, Assumptions & Scope

### Clarifications — Session 2026-08-09

- Q: ¿Cómo carga el admin el catálogo de productos del hotel inicialmente? → A: Subida de archivo Excel/CSV con columnas predefinidas (nombre, unidad, subtipo, requiere_fecha_vencimiento). El sistema valida filas inválidas sin detener la importación de las válidas.
- Q: ¿Cuántos productos puede tener el catálogo de un tenant y cuántos auditores activos simultáneos se esperan? → A: Hasta 500 productos por tenant y hasta 5 auditores simultáneos por hotel (referencia v1). El catálogo completo cabe en IndexedDB para matching offline total sin estrategia de caché parcial.
- Q: ¿Qué identifica de forma única a un producto en el catálogo de un tenant? → A: La combinación nombre + unidad de medida. El mismo insumo en presentaciones distintas ("Aceite 1L" vs "Aceite 5L") son productos separados. Clave: `(tenant_id, nombre, unidad_de_medida)`.
- Q: ¿Qué debe ocurrir cuando dos auditores cuentan el mismo producto en la misma sesión? → A: Ambos conteos se guardan como registros independientes. El supervisor los ve en el dashboard y resuelve discrepancias. No hay bloqueo ni sobreescritura automática.
- Q: ¿Qué hace el sistema cuando Groq Whisper no está disponible y el auditor captura por voz? → A: El audio se graba siempre y se encola localmente con su mimeType. La UI muestra estado "grabado, pendiente de procesar" — sin spinners infinitos ni confirmaciones falsas. La cola se vacía al recuperar conexión (evento `online`) y al abrir la app (flush en arranque), no solo por reintentos temporizados. El mimeType (webm/opus en Chrome, mp4/aac en Safari iOS) se guarda con el blob y se envía tal cual a Groq sin conversión en cliente.

### Clarifications — Session 2026-08-12 (unificación del motor de semáforo)

- Q: ¿El semáforo se calcula offline en el dispositivo o en el servidor? → A: Ambos, sin contradicción. El motor autoritativo evalúa y materializa `lote_estado` en el servidor. En campo, el dispositivo evalúa una **copia cacheada de las reglas del hotel** (no umbrales cableados) para mostrar el color sin conexión; al sincronizar, el servidor re-evalúa de forma autoritativa.
- Q: ¿Cuántos colores usa el semáforo? → A: Cinco — VERDE, AMARILLO, NARANJA, ROJO y GRIS. GRIS es indeterminado (falta el dato o no hay regla) y NUNCA se trata como VERDE.
- Q: ¿Las reglas INVIMA vienen cableadas? → A: No. El seed INVIMA es solo un ejemplo editable (Anexo §5.7). Ningún umbral vive en el código.

### Assumptions

- Los auditores usan dispositivos móviles modernos (Android 10+ o iOS 14+) con micrófono funcional y cámara.
- El hotel tiene un catálogo de productos digitizable (lista en papel, Excel o sistema existente). El admin realiza la carga inicial antes de que los auditores empiecen a usar el sistema.
- La captura de voz requiere que el auditor mantenga presionado el botón mientras habla (no activación por palabra clave), para evitar capturas accidentales en ambientes ruidosos.
- La recepción de mercadería por foto de factura requiere conexión a internet (la extracción de texto de imágenes no funciona offline).
- El semáforo aplica las normas sanitarias colombianas (INVIMA) como **seed de ejemplo** en v1, editable por el admin. La adaptación a normativas de otros países/sectores es configuración, no cambio de arquitectura.
- Los usuarios se autentican con email y contraseña. Autenticación social (Google, etc.) es alcance futuro.
- Un auditor pertenece a un único hotel. Un usuario no puede pertenecer a múltiples tenants simultáneamente en v1.
- Las fotos de evidencia se comprimen automáticamente antes de guardarse (máximo 2MB por foto después de compresión).

### Alcance del MVP

**Construir:** captura por voz offline; semáforo configurable con tipos `VENCIMIENTO`, `TEMPERATURA`, `LECTURA_VENCIDA`, `TRAZABILIDAD`, `CUARENTENA`; constructor de reglas + simulador + cobertura; recepción por factura; evidencia fotográfica offline; dashboard de supervisor; bitácora/alertas auditables.

**No construir todavía:** control de plagas, limpieza y desinfección, calibración de instrumentos, gestión documental de proveedores. Son módulos vendibles después; incluirlos ahora impide entregar.

---

## 5. Anexo Técnico — Motor de Semáforo Sanitario Configurable

**Regla de oro:** ningún umbral, rango de temperatura, cantidad de días o color puede estar escrito en el código. Todo vive en base de datos. Si aparece un `if (dias < 7)` en el código, está mal.

### 5.1 Modelo de datos

#### 5.1.1 Entidades base (asumidas existentes o a crear)

```sql
-- Tenant
CREATE TABLE hotel (
  id            uuid PRIMARY KEY,
  nombre        text NOT NULL,
  activo        boolean NOT NULL DEFAULT true,
  creado_en     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE categoria (
  id            uuid PRIMARY KEY,
  hotel_id      uuid NOT NULL REFERENCES hotel(id),
  nombre        text NOT NULL,          -- "Pescados crudos", "Lácteos", "Secos"
  parent_id     uuid REFERENCES categoria(id),  -- jerarquía opcional
  UNIQUE (hotel_id, nombre)
);

CREATE TABLE producto (
  id            uuid PRIMARY KEY,
  hotel_id      uuid NOT NULL REFERENCES hotel(id),
  categoria_id  uuid NOT NULL REFERENCES categoria(id),
  nombre        text NOT NULL,
  unidad        text NOT NULL,          -- kg, L, unidad
  -- atributos sanitarios (los define el admin, no vienen precargados)
  es_crudo               boolean,
  es_listo_consumo       boolean,
  condicion_conservacion text,          -- SECO | REFRIGERADO | CONGELADO
  activo        boolean NOT NULL DEFAULT true
);

-- El lote es entidad de primera clase. Sin lote no hay trazabilidad.
CREATE TABLE lote (
  id                uuid PRIMARY KEY,
  hotel_id          uuid NOT NULL REFERENCES hotel(id),
  producto_id       uuid NOT NULL REFERENCES producto(id),
  codigo_lote       text,               -- puede ser null -> lo detecta regla TRAZABILIDAD
  proveedor_id      uuid,
  ubicacion_id      uuid,
  cantidad          numeric(14,3) NOT NULL,
  fecha_recepcion   timestamptz NOT NULL,
  fecha_produccion  date,
  fecha_vencimiento date,
  fecha_apertura    timestamptz,        -- null si no ha sido abierto
  estado_cuarentena text NOT NULL DEFAULT 'LIBRE',  -- LIBRE|EN_EVALUACION|NO_CONFORME|LIBERADO
  activo            boolean NOT NULL DEFAULT true
);
```

#### 5.1.2 Núcleo del motor: reglas

```sql
CREATE TYPE tipo_regla AS ENUM (
  'VENCIMIENTO',      -- días restantes hasta fecha_vencimiento
  'POST_APERTURA',    -- horas transcurridas desde fecha_apertura
  'TEMPERATURA',      -- última lectura del equipo donde está el lote
  'LECTURA_VENCIDA',  -- horas sin lectura de temperatura del equipo
  'TRAZABILIDAD',     -- completitud de campos obligatorios del lote
  'CUARENTENA',       -- estado_cuarentena del lote
  'STOCK_MINIMO'      -- cantidad vs mínimo configurado
);

CREATE TYPE ambito_regla AS ENUM ('GLOBAL', 'CATEGORIA', 'PRODUCTO');

CREATE TYPE color_semaforo AS ENUM ('VERDE','AMARILLO','NARANJA','ROJO','GRIS');
-- GRIS = indeterminado (falta el dato para evaluar). NO es verde.

CREATE TYPE accion_regla AS ENUM (
  'SOLO_ALERTA',
  'BLOQUEA_SALIDA',    -- no se puede despachar el lote
  'BLOQUEA_INGRESO',   -- no se puede recepcionar
  'FUERZA_CUARENTENA'
);

CREATE TABLE regla (
  id            uuid PRIMARY KEY,
  hotel_id      uuid NOT NULL REFERENCES hotel(id),
  tipo          tipo_regla NOT NULL,
  ambito        ambito_regla NOT NULL,
  ambito_id     uuid,                   -- null si GLOBAL; categoria_id o producto_id
  nombre        text NOT NULL,
  activa        boolean NOT NULL DEFAULT true,
  version       int NOT NULL DEFAULT 1,
  vigente_desde timestamptz NOT NULL DEFAULT now(),
  vigente_hasta timestamptz,            -- null = vigente
  creado_por    uuid NOT NULL,
  creado_en     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ambito_coherente CHECK (
    (ambito = 'GLOBAL' AND ambito_id IS NULL) OR
    (ambito <> 'GLOBAL' AND ambito_id IS NOT NULL)
  )
);

-- Una regla vigente por (hotel, tipo, ambito, ambito_id)
CREATE UNIQUE INDEX ux_regla_vigente
  ON regla (hotel_id, tipo, ambito, COALESCE(ambito_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE vigente_hasta IS NULL AND activa;

CREATE TABLE regla_umbral (
  id         uuid PRIMARY KEY,
  regla_id   uuid NOT NULL REFERENCES regla(id) ON DELETE CASCADE,
  color      color_semaforo NOT NULL,
  operador   text NOT NULL,             -- 'GT','GTE','LT','LTE','BETWEEN','EQ','IS_NULL','IN'
  valor_min  numeric,
  valor_max  numeric,
  valor_text text,                      -- para EQ/IN sobre enums (ej. estado_cuarentena)
  unidad     text,                      -- dias | horas | celsius | porcentaje | -
  accion     accion_regla NOT NULL DEFAULT 'SOLO_ALERTA',
  mensaje    text,                      -- texto que ve el usuario
  orden      int NOT NULL DEFAULT 0,
  estrategia_circular text             -- ruta de valorización opcional (banco de
                                        -- alimentos, donación, compostaje…). Los ODS
                                        -- se DERIVAN de aquí en la UI, no se guardan.
);
```

#### 5.1.3 Resultado evaluado (materializado)

```sql
CREATE TABLE lote_estado (
  lote_id        uuid PRIMARY KEY REFERENCES lote(id) ON DELETE CASCADE,
  hotel_id       uuid NOT NULL,
  color          color_semaforo NOT NULL,
  evaluado_en    timestamptz NOT NULL DEFAULT now(),
  detalle        jsonb NOT NULL,   -- array de {tipo, color, valor_evaluado, regla_id, version, mensaje, accion}
  bloqueo_salida boolean NOT NULL DEFAULT false,
  bloqueo_ingreso boolean NOT NULL DEFAULT false
);

CREATE INDEX ix_lote_estado_color ON lote_estado (hotel_id, color);
```

#### 5.1.4 Alertas con versión de regla congelada

```sql
CREATE TABLE alerta (
  id             uuid PRIMARY KEY,
  hotel_id       uuid NOT NULL,
  lote_id        uuid REFERENCES lote(id),
  equipo_id      uuid,
  regla_id       uuid NOT NULL,
  regla_version  int NOT NULL,          -- congelado: NO se reescribe si la regla cambia
  umbral_snapshot jsonb NOT NULL,       -- copia del umbral que disparó
  color          color_semaforo NOT NULL,
  valor_evaluado numeric,
  mensaje        text NOT NULL,
  estado         text NOT NULL DEFAULT 'ABIERTA',  -- ABIERTA|RECONOCIDA|CERRADA
  creada_en      timestamptz NOT NULL DEFAULT now(),
  reconocida_por uuid,
  cerrada_en     timestamptz
);
```

> **Importante:** las alertas históricas nunca se recalculan. Si el admin cambia un umbral hoy, los lotes se re-evalúan, pero las alertas ya emitidas conservan la versión de regla con la que se dispararon. Esto es lo que hace el registro auditable.

#### 5.1.5 Equipos y lecturas (necesario para TEMPERATURA y LECTURA_VENCIDA)

```sql
CREATE TABLE equipo (
  id        uuid PRIMARY KEY,
  hotel_id  uuid NOT NULL,
  codigo    text NOT NULL,
  tipo      text NOT NULL,   -- CAMARA_REFRIG | CAMARA_CONGEL | NEVERA | VITRINA | ALMACEN_SECO
  ubicacion text,
  activo    boolean NOT NULL DEFAULT true
);

CREATE TABLE lectura_temperatura (
  id          uuid PRIMARY KEY,
  hotel_id    uuid NOT NULL,
  equipo_id   uuid NOT NULL REFERENCES equipo(id),
  valor_c     numeric(6,2) NOT NULL,
  registrado_en timestamptz NOT NULL DEFAULT now(),  -- HORA DE SERVIDOR, no del cliente
  usuario_id  uuid NOT NULL,
  evidencia_url text,
  evidencia_hash text
);

CREATE INDEX ix_lectura_equipo_fecha ON lectura_temperatura (equipo_id, registrado_en DESC);
```

### 5.2 Algoritmo de evaluación

#### 5.2.1 Resolución de regla aplicable (especificidad)

Para un lote y un `tipo_regla`, buscar en este orden y **quedarse con la primera que exista**:

1. `ambito = 'PRODUCTO'` y `ambito_id = lote.producto_id`
2. `ambito = 'CATEGORIA'` y `ambito_id = producto.categoria_id` (subir por `parent_id` si hay jerarquía, de hijo a padre)
3. `ambito = 'GLOBAL'`

Si no existe ninguna → ese tipo devuelve `GRIS` con motivo `SIN_REGLA_CONFIGURADA`. **No devolver VERDE.**

#### 5.2.2 Extracción del valor por tipo

| tipo | valor evaluado | si el dato falta |
|---|---|---|
| `VENCIMIENTO` | `fecha_vencimiento - hoy` en días | GRIS |
| `POST_APERTURA` | `now() - fecha_apertura` en horas | no aplica (skip) si `fecha_apertura` es null |
| `TEMPERATURA` | última `lectura_temperatura.valor_c` del equipo de la ubicación del lote | GRIS |
| `LECTURA_VENCIDA` | `now() - max(registrado_en)` en horas | GRIS |
| `TRAZABILIDAD` | conteo de campos obligatorios faltantes (`codigo_lote`, `proveedor_id`, `fecha_vencimiento`) | — |
| `CUARENTENA` | `estado_cuarentena` (texto) | — |
| `STOCK_MINIMO` | `cantidad` | — |

#### 5.2.3 Agregación

```
severidad = { VERDE:0, GRIS:1, AMARILLO:2, NARANJA:3, ROJO:4 }

color_final    = el color de mayor severidad entre todas las reglas evaluadas
bloqueo_salida = OR de accion='BLOQUEA_SALIDA' de todos los umbrales disparados
```

`GRIS` está deliberadamente por encima de `VERDE`. Un lote sin datos no es un lote sano.

#### 5.2.4 Cuándo se re-evalúa (servidor, autoritativo)

- Al crear o modificar un lote.
- Al registrar una lectura de temperatura (re-evalúa los lotes del equipo).
- Al guardar/activar/desactivar una regla (re-evalúa todos los lotes del hotel afectados por el ámbito).
- Job programado cada hora (para que `VENCIMIENTO` y `LECTURA_VENCIDA` avancen solos).

#### 5.2.5 Evaluación offline en cliente

El semáforo que el auditor ve en campo (US2, FR-002, SC-004) se calcula en el dispositivo, pero **sin duplicar lógica ni cablear umbrales**. El principio es un único evaluador puro compartido y las reglas viajando como datos.

**Evaluador compartido.** La función de evaluación (`evaluarLote(lote, reglas, ahora) -> { color_final, bloqueos, detalle }`) es pura y vive en un módulo isomórfico (TS) que corren **igual** el servidor y el cliente. La resolución de especificidad (§5.2.1), la extracción de valor por tipo (§5.2.2) y la agregación por severidad (§5.2.3) son el mismo código en ambos lados. No hay una segunda implementación en el cliente.

**Reglas como datos cacheados.** Al iniciar sesión, el dispositivo descarga y guarda en IndexedDB, junto al catálogo (SC-010), el conjunto de reglas **vigentes** del hotel (`regla` + `regla_umbral`, solo `vigente_hasta IS NULL AND activa`) con su `version`. El cliente evalúa contra esa copia; nunca contra constantes en el código.

**El servidor es la verdad; el cliente es una vista previa.** El color calculado offline es provisional y se marca como tal en la UI. Al sincronizar el conteo/lote, el servidor **re-evalúa de forma autoritativa** (§5.2.4) y materializa `lote_estado`. Si el resultado difiere del que vio el auditor (p. ej. porque llegó una lectura de temperatura, o las reglas cacheadas quedaron viejas), **gana el servidor**: se actualiza el estado, y si el cambio cruza a un color con acción de bloqueo o dispara un umbral, se emite la alerta correspondiente con la versión de regla del servidor. La discrepancia no es un error del cliente: es el comportamiento esperado de datos que avanzan en el tiempo.

**Frescura de las reglas.** El cliente registra la `version` (o un `hash`/`updated_at` del conjunto) de las reglas cacheadas. Al recuperar conexión y en el flush de arranque (FR-017), compara contra el servidor y refresca la copia si cambió. Un cliente con reglas viejas **sigue operando** (no bloquea la auditoría en campo); la corrección la aporta la re-evaluación del servidor al sincronizar.

**Sin lectura, GRIS.** El cliente no tiene acceso a las lecturas de temperatura del equipo en tiempo real, así que los tipos `TEMPERATURA` y `LECTURA_VENCIDA` se evalúan a **GRIS** offline (dato ausente, §5.2.2) y se resuelven a su color real cuando el servidor re-evalúa. Coherente con "GRIS nunca es VERDE".

### 5.3 Validaciones al guardar una regla

Rechazar el guardado si:

1. **Solapamiento de rangos.** Dos umbrales de la misma regla cuyos intervalos se cruzan. Validar antes de persistir, no al evaluar.
2. **Cobertura incompleta.** Los umbrales no cubren todo el dominio numérico. Ofrecer autocompletar el hueco con VERDE, pero avisando explícitamente.
3. **Falta ROJO.** Una regla sin ningún umbral de color ROJO no tiene sentido operativo. Advertencia bloqueante con confirmación.
4. **Unidad inconsistente** con el `tipo` (ej. `celsius` en una regla de `VENCIMIENTO`).
5. **Monotonía invertida.** En `VENCIMIENTO`, un umbral ROJO con más días que uno VERDE. Advertencia.

Al editar una regla existente: **no hacer UPDATE.** Cerrar la versión actual (`vigente_hasta = now()`) y crear una fila nueva con `version + 1`. El historial de reglas es parte de la auditoría.

### 5.4 API

```
GET    /api/hotels/:hotelId/reglas?tipo=&ambito=
POST   /api/hotels/:hotelId/reglas
PUT    /api/hotels/:hotelId/reglas/:id        -> versiona, no sobreescribe
DELETE /api/hotels/:hotelId/reglas/:id        -> soft: activa=false, vigente_hasta=now()
POST   /api/hotels/:hotelId/reglas/:id/duplicar
       body: { ambito, ambito_ids: [] }        -> clona a otras categorías/productos

POST   /api/hotels/:hotelId/reglas/simular
       body: { producto_id, fecha_vencimiento, fecha_apertura, temperatura_c,
               horas_sin_lectura, estado_cuarentena, codigo_lote, proveedor_id }
       resp: { color_final, bloqueos, detalle: [{tipo, color, regla_aplicada, motivo}] }

GET    /api/hotels/:hotelId/reglas/cobertura
       resp: categorías y tipos SIN regla asignada

GET    /api/hotels/:hotelId/lotes?color=ROJO
POST   /api/hotels/:hotelId/lotes/:id/reevaluar
```

Todas las rutas filtran por `hotel_id`. Aplicar **RLS en Supabase** sobre `hotel_id` en todas las tablas; no confiar en el filtro de la capa de aplicación.

### 5.5 UI del admin

#### 5.5.1 Constructor de reglas (una sola pantalla, sin wizard)

- Selector: tipo de regla → ámbito (Global / Categoría / Producto).
- Tabla editable de umbrales: `color | operador | valor_min | valor_max | unidad | acción | mensaje`.
- Botón "Agregar umbral", "Duplicar regla a…".
- Validación en vivo de solapamiento (marcar en rojo las filas en conflicto antes de guardar).

#### 5.5.2 Simulador (obligatorio, no opcional)

Panel lateral en la misma pantalla. El admin ingresa un caso hipotético y ve:
- El color resultante.
- **Qué regla ganó y por qué** (especificidad aplicada).
- Qué bloqueos se activarían.

Sin esto el admin configura a ciegas y no confía en el resultado.

#### 5.5.3 Cobertura de reglas

Matriz `categorías × tipos de regla`. Celdas sin regla en gris con enlace directo a crearla. Es la defensa contra la configuración a medias — que es el modo de falla más probable de todo este módulo.

#### 5.5.4 Vista de inventario

Listado de lotes con chip de color. Al hacer clic, expandir el `detalle` jsonb: qué dimensión bajó el semáforo, qué regla, qué valor. El color sin explicación se ignora a la semana.

### 5.6 Reglas de negocio no negociables

1. **Ningún umbral hardcodeado.** Ni en frontend, ni en backend, ni en el job.
2. **Registros no se eliminan.** Corrección por contra-asiento con motivo y usuario. Nunca `DELETE` sobre lotes, movimientos o alertas.
3. **Stock negativo prohibido** en productos perecibles. Rechazar el movimiento.
4. **Hora de servidor siempre.** Nunca la hora del cliente en lecturas, aperturas o evidencias.
5. **Toda acción lleva `usuario_id`.** Sin excepción.
6. **Evidencia fotográfica** con hash SHA-256 + timestamp de servidor almacenado junto al archivo.

### 5.7 Seed de demostración (ejemplo INVIMA, editable por el admin)

```json
[
  {
    "tipo": "VENCIMIENTO", "ambito": "GLOBAL", "nombre": "Vencimiento estándar",
    "umbrales": [
      {"color":"VERDE","operador":"GT","valor_min":15,"unidad":"dias","accion":"SOLO_ALERTA"},
      {"color":"AMARILLO","operador":"BETWEEN","valor_min":7,"valor_max":15,"unidad":"dias","accion":"SOLO_ALERTA","estrategia_circular":"REDISTRIBUCION_INTERNA"},
      {"color":"NARANJA","operador":"BETWEEN","valor_min":1,"valor_max":6,"unidad":"dias","accion":"SOLO_ALERTA","estrategia_circular":"BANCO_ALIMENTOS"},
      {"color":"ROJO","operador":"LTE","valor_max":0,"unidad":"dias","accion":"BLOQUEA_SALIDA","estrategia_circular":"COMPOSTAJE"}
    ]
  },
  {
    "tipo": "TEMPERATURA", "ambito": "CATEGORIA", "ambito_nombre": "Congelados",
    "nombre": "Temperatura congelados",
    "umbrales": [
      {"color":"VERDE","operador":"LTE","valor_max":-18,"unidad":"celsius"},
      {"color":"AMARILLO","operador":"BETWEEN","valor_min":-18,"valor_max":-15,"unidad":"celsius"},
      {"color":"ROJO","operador":"GT","valor_min":-15,"unidad":"celsius","accion":"FUERZA_CUARENTENA"}
    ]
  },
  {
    "tipo": "TRAZABILIDAD", "ambito": "GLOBAL", "nombre": "Campos obligatorios",
    "umbrales": [
      {"color":"VERDE","operador":"EQ","valor_min":0,"unidad":"-"},
      {"color":"ROJO","operador":"GTE","valor_min":1,"unidad":"-","accion":"BLOQUEA_INGRESO",
       "mensaje":"Lote sin código, proveedor o fecha de vencimiento"}
    ]
  }
]
```

Estos valores son **ejemplo**, no norma. El admin los sobreescribe según los lineamientos de su hotel.
