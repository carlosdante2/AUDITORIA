<!--
Sync Impact Report
- Version change: (nuevo) → 1.0.0
- Modified principles: n/a (adopción inicial)
- Added sections:
  - Core Principles (9 principios: I–IX)
  - Restricciones de Seguridad y Datos
  - Flujo de Trabajo y Entrega
  - Governance
- Removed sections: ninguna
- Follow-up TODOs: ninguno
- Nota: archivo creado en specs/001-auditoria-ia/constitution.md
  durante la fase de especificación. Al inicializar el repo de Fresko,
  copiar a .specify/memory/constitution.md en ese proyecto.
-->

# Fresko Constitution

## Core Principles

### I. Aislamiento multi-tenant sagrado (NO NEGOCIABLE)

Todo dato pertenece a un `tenant`. Ningún cambio puede permitir lectura o
escritura cross-tenant, ni por API, ni por dashboard, ni por Edge Function.
`tenant_id` DEBE estar presente en todo INSERT; su ausencia es un bug
bloqueante, no un detalle menor.

**Racional:** El sistema sirve a múltiples hoteles sobre una misma base de
datos. Una fuga cross-tenant expone datos operativos y sanitarios de un
cliente al resto.

### II. RLS intocable sin instrucción explícita

Las policies de RLS son el perímetro de seguridad del frontend y NO DEBEN
modificarse sin instrucción explícita del dueño del proyecto. Las Edge
Functions usan `SERVICE_ROLE_KEY` y bypasean RLS; todo chequeo de tenant
dentro de ellas DEBE ser explícito en el código.

**Racional:** RLS es la última línea de defensa; un cambio bien intencionado
puede abrir un agujero silencioso que ningún test de UI detecta.

### III. `app_metadata`, nunca `user_metadata`

El rol del usuario y su `tenant_id` DEBEN leerse y escribirse exclusivamente
en `app_metadata` (solo modificable con service role). `user_metadata` NUNCA
participa en decisiones de autorización o acceso.

**Racional:** `user_metadata` es editable por el propio usuario y puede
permitir escalación de privilegios o acceso cross-tenant. Este principio
existe como lección aprendida del proyecto hermano ALMACENERO DIGITAL.

### IV. Offline-first no es opcional (NO NEGOCIABLE)

El flujo completo de captura de inventario por voz y la evaluación del
semáforo sanitario DEBEN funcionar sin conexión a internet en todo momento.
La red es oportunista: se usa cuando está disponible, nunca bloquea cuando
no lo está. Una feature que rompe el flujo offline no está terminada.

**Racional:** Los auditores trabajan en cámaras de frío, bodegas subterráneas
y áreas sin cobertura. Depender de red en el flujo principal hace el producto
inutilizable en el campo.

### V. La seguridad alimentaria siempre gana (NO NEGOCIABLE)

Ninguna sugerencia de economía circular, optimización de costos ni lógica de
negocio puede anular una decisión de semáforo rojo por riesgo sanitario real
(empaque comprometido, observación no conforme, riesgo microbiológico). La
clasificación sanitaria es el output primario; los insights son secundarios.

**Racional:** El sistema opera en contextos de alimentos y bebidas para
consumo humano. Un error en la clasificación sanitaria puede tener
consecuencias de salud pública. La precaución siempre prevalece.

### VI. El semáforo es por sector

Las reglas de clasificación del semáforo, los umbrales de días, los campos
requeridos y el prompt de IA DEBEN variar según el sector del tenant
(alimentos, ferretería, farmacia, etc.). En v1 solo existe el sector
`alimentos` con normas INVIMA Colombia. Nuevos sectores se agregan como
configuración, no como código nuevo ni como condiciones en el código existente.

**Racional:** El producto es multi-sector. Hardcodear reglas de alimentos
en la lógica central haría imposible escalar a ferretería o farmacia sin
refactoring mayor.

### VII. Ningún producto nuevo entra sin aprobación

Productos detectados automáticamente (por voz no reconocida o por Groq Vision
en facturas) que no existen en el catálogo del tenant DEBEN quedar en estado
`pendiente_aprobacion`. Solo admin o supervisor pueden aprobarlos. El auditor
puede confirmar la descripción en pantalla pero no tiene poder de aprobación
final. Un producto pendiente NUNCA se registra como inventario ni afecta
conteos hasta ser aprobado.

**Racional:** El catálogo es la fuente de verdad del matching semántico. Un
producto mal nombrado o mal categorizado desde el inicio contamina todos los
reconocimientos futuros y los cálculos del semáforo.

### VIII. Un cambio a la vez, confirmado antes de continuar

Este es un producto comercial destinado a operar en hoteles con clientes reales.
Cada entrega contiene UN cambio, verificado end-to-end en el flujo afectado,
y se confirma con el dueño del proyecto antes de continuar con el siguiente.
Cambios en Edge Functions REQUIEREN redeploy manual; un cambio no está "hecho"
hasta que está desplegado y probado.

**Racional:** Los errores en producción afectan directamente la operación
sanitaria de los hoteles; los cambios pequeños y confirmados acotan el radio
de daño y facilitan el diagnóstico.

### IX. Simplicidad primero

Mínimo código que resuelve el problema. Sin features no pedidas, sin
abstracciones para código de un solo uso, sin configurabilidad especulativa,
sin manejo de errores para escenarios imposibles. Ante dos soluciones que
funcionan, gana la más corta y directa. Cambios quirúrgicos: no mejorar
código adyacente ni refactorizar lo que no está roto.

**Racional:** El proyecto lo mantiene un equipo mínimo; cada línea
especulativa es deuda de mantenimiento sin retorno.

## Restricciones de Seguridad y Datos

- `SERVICE_ROLE_KEY` vive solo en secretos de Edge Functions y Vercel; NUNCA
  en el frontend, en el repo, ni en logs.
- Los embeddings de pgvector están aislados por tenant mediante RLS; ningún
  tenant puede acceder al catálogo de otro.
- Las fotos de evidencia y facturas se almacenan en buckets privados de
  Supabase Storage con URLs firmadas y expiración; nunca en URLs públicas.
- `lib/supabase.ts` no se toca salvo pedido explícito del dueño del proyecto.
- Si un cambio afecta `lib/queries.ts`, listar los componentes y páginas
  impactados antes de proceder.
- Migraciones SQL se aplican en orden numérico en el SQL Editor de Supabase;
  ninguna migración se edita después de aplicada (se crea una nueva).
- Secretos requeridos: `GROQ_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY` — solo en variables de entorno de Vercel y
  Supabase, nunca en código fuente.

## Flujo de Trabajo y Entrega

- Antes de implementar: declarar supuestos explícitamente. Si hay varias
  interpretaciones posibles, presentarlas al dueño en lugar de elegir en
  silencio.
- Toda tarea se transforma en un criterio verificable antes de implementar:
  "agregar semáforo" → "dado este JSON de entrada, el output es exactamente
  este JSON de salida".
- El flujo de captura offline DEBE probarse con red desconectada antes de
  declarar una feature como hecha.
- El motor del semáforo (`lib/reglas-engine.ts`) es una función PURA sin
  llamadas de red ni umbrales cableados: todo umbral, color y acción vive en
  la base de datos (reglas configurables por el admin). Su pureza y su
  resolución por especificidad se verifican con tests unitarios que corren
  sin conectividad. En campo se evalúa offline contra las reglas cacheadas
  (`lib/reglas-offline.ts`); el servidor re-evalúa de forma autoritativa.
- Frontend (PWA) se despliega automáticamente en Vercel al hacer push a
  `main`. Edge Functions se despliegan a mano con
  `supabase functions deploy <fn> --no-verify-jwt`. La definición de "hecho"
  incluye el despliegue del componente tocado.
- Checklist por cambio: `tenant_id` en todo INSERT nuevo; sin cambios a RLS
  ni a `lib/supabase.ts`; impacto de `lib/queries.ts` listado; redeploy
  ejecutado; flujo offline probado; un solo cambio por entrega.

## Governance

Esta constitución prevalece sobre cualquier otra práctica documentada del
proyecto Fresko. Las enmiendas requieren: (1) instrucción o aprobación
explícita del dueño del proyecto, (2) actualización de este archivo con
incremento de versión semántica, y (3) propagación a `SPECKIT_AUDITORIA.md`
si el cambio afecta los principios base.

Versionado semántico:
- MAJOR: eliminación o redefinición incompatible de principios NO NEGOCIABLES.
- MINOR: principios o secciones nuevas, o guía materialmente ampliada.
- PATCH: clarificaciones, correcciones de redacción, typos.

Cumplimiento: toda revisión de código (manual o con `/code-review`) DEBE
verificar los principios I, II, III, IV y V explícitamente cuando el cambio
toca datos, auth, lógica de semáforo o Edge Functions. La complejidad
agregada DEBE justificarse contra el principio IX.

Este archivo vive en `specs/001-auditoria-ia/constitution.md` durante la
planificación. Al inicializar el repositorio de Fresko, copiar a
`.specify/memory/constitution.md` en ese proyecto.

**Version**: 1.0.0 | **Ratified**: 2026-08-09 | **Last Amended**: 2026-08-09
