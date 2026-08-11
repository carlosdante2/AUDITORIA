# Quickstart: AuditorIA — Guía de Validación

**Propósito**: Verificar que la implementación cumple los flujos críticos
de la spec. Esto NO es documentación de instalación de producción.

---

## Prerrequisitos

```bash
# Node.js 22 LTS
node --version  # v22.x.x

# Supabase CLI
supabase --version  # >= 1.200

# Variables de entorno (.env.local)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhb...
SUPABASE_SERVICE_ROLE_KEY=eyJhb...
GROQ_API_KEY=gsk_...
OPENAI_API_KEY=sk-...
```

## Setup Inicial

```bash
# 1. Instalar dependencias
npm install

# 2. Aplicar migraciones DB
supabase db push

# 3. Seed datos de prueba
supabase db seed

# 4. Servidor de desarrollo
npm run dev  # http://localhost:3000

# 5. Tests unitarios del semáforo
npm run test:semaforo
```

---

## Escenario 1: Semáforo Local Offline (crítico — FR-006, SC-001, SC-002)

**Propósito**: Verificar que el semáforo funciona sin red.

```bash
# Devtools Chrome → Network → Offline
# Navegar a http://localhost:3000/captura
```

1. Abrir DevTools → Network → seleccionar "Offline"
2. Iniciar sesión de auditoría con bodega "Test Offline"
3. Buscar producto "Carne de res lomo" (debe cargar desde IndexedDB)
4. Ingresar cantidad: 5 kg
5. Marcar fecha vencimiento: **ayer** (un día vencido)
6. Estado empaque: "intacto", Observación: "normal"
7. Confirmar conteo

**Resultado esperado**:
- Semáforo muestra **ROJO**
- Razón: "Producto vencido — retirar inmediatamente"
- Acción: `consumo_inmediato_o_descarte`
- Conteo guardado en IndexedDB (ícono de cola visible en UI)
- Sin errores de red — flujo 100% local

**Tiempo máximo**: semáforo visible en < 100ms desde confirmación

---

## Escenario 2: Cola de Audio Offline (FR-008, FR-016, FR-017)

**Propósito**: Verificar captura por voz offline y flush al reconectar.

1. DevTools → Network → Offline
2. Presionar botón de micrófono en pantalla de captura
3. Decir: *"diez litros de leche entera vence el quince de agosto"*
4. Soltar botón
5. **Resultado inmediato**: mensaje "Audio en cola — se procesará al reconectar"
   (ícono de reloj, NO spinner infinito, NO mensaje de error)
6. DevTools → Network → desactivar Offline
7. **Resultado automático**: la app detecta `online` event → flush de cola
8. La transcripción aparece: "10 litros de leche entera"
9. El producto se matchea contra catálogo

**Verificación de dedup**:
- Forzar error de red durante flush (mock)
- El mismo `local_id` se reintenta → DB tiene exactamente 1 registro

---

## Escenario 3: Recepción de Mercadería con Factura (FR-009, FR-011, FR-012)

**Propósito**: Verificar extracción de factura y matching contra catálogo.

1. Ir a Recepción → Nueva recepción
2. Tomar foto de una factura (o cargar imagen de prueba `tests/fixtures/factura-test.jpg`)
3. Esperar extracción Groq Vision (< 15s)
4. Revisar items detectados:
   - Productos que existen en catálogo: aparecen con nombre normalizado + score
   - Productos NO en catálogo: aparecen marcados "Pendiente aprobación"
5. Confirmar recepción
6. Verificar que los items "Pendiente aprobación" aparecen en el panel Admin

**Resultado esperado**:
- Al menos 1 producto matcheado con score ≥ 0.75
- Al menos 1 producto en estado `pendiente_aprobacion` (si la factura tiene uno nuevo)
- Foto de factura accesible por URL firmada (< 1h expiración)

---

## Escenario 4: Aislamiento Multi-tenant (principio I, RLS)

**Propósito**: Verificar que un tenant no puede ver datos de otro.

```bash
# Crear dos tenants de prueba en seed
# Tenant A: hotel_a_tenant_id
# Tenant B: hotel_b_tenant_id
```

1. Login como auditor del Tenant A
2. Crear sesión y agregar 3 conteos
3. Logout → Login como auditor del Tenant B
4. Verificar que la lista de sesiones está **vacía** (0 sesiones de A visibles)
5. Intentar llamada directa: `supabase.from('product_counts').select('*')` desde Tenant B
6. Resultado: 0 filas — RLS bloquea correctamente

**Test automatizado**:
```bash
npm run test:rls
# Ejecuta pruebas de aislamiento con dos usuarios ficticios
```

---

## Escenario 5: Aprobación de Producto Pendiente (FR-013, FR-014)

**Propósito**: Verificar flujo de aprobación Admin.

1. Login como Admin
2. Ir a Catálogo → Pendientes de aprobación
3. Ver un producto sugerido (ej: "Jamón serrano 200g")
4. Revisar top-3 candidatos del catálogo con scores
5. Opciones:
   - "Es el mismo que: Jamón importado → Usar ese" (mapea sin crear nuevo)
   - "Crear como nuevo producto" (Admin completa subtipo + unidad)
   - "Rechazar" (descarta)
6. Al aprobar → embedding generado automáticamente → producto activo en catálogo

**Resultado esperado**:
- El embedding se genera (verificar en columna `embedding` de `products`)
- El auditor que originó el pendiente ve confirmación en su historial

---

## Tests Unitarios del Semáforo

```bash
npm run test:semaforo
```

Los tests en `lib/__tests__/semaforo.test.ts` cubren todos los casos del
`SEMAFORO_v2_accion_ODS.md`:

| Caso | Input | Color esperado |
|------|-------|---------------|
| Producto vencido | días_restantes: -1 | rojo |
| Vence hoy | días_restantes: 0 | rojo |
| Carne: 1 día restante | subtipo: carne_res | amarillo |
| Empaque roto | estado_empaque: roto_abierto_fuga | rojo |
| Observación no conforme | observacion_visual: no_conforme | rojo |
| Enlatado sin fecha | requiere_fecha: no | verde |
| Fruta sin fecha + recepción reciente | fecha_recepcion: ayer | amarillo |

```
PASS  lib/__tests__/semaforo.test.ts
  ✓ ROJO: producto vencido
  ✓ ROJO: vence hoy
  ✓ ROJO: empaque roto
  ✓ AMARILLO: carne vence en 1 día
  ✓ VERDE: enlatado largo plazo
  ...
```

---

## Checklist Pre-Deploy

- [ ] `npm run test` — todos pasan
- [ ] `npm run build` — sin errores TypeScript
- [ ] Lighthouse PWA score ≥ 90 en mobile
- [ ] Manifest installable (Chrome → "Añadir a pantalla de inicio")
- [ ] Service Worker registrado (DevTools → Application → Service Workers)
- [ ] Semáforo funciona offline (Escenario 1 exitoso)
- [ ] RLS verificado con dos tenants (Escenario 4)
- [ ] Variables de entorno de producción configuradas en Vercel
