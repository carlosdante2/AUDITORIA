# Contract: POST /api/vision/fecha

**Relay de Groq Vision — lectura de fecha de vencimiento en la foto de evidencia**

Añadido junto a la migración 015/016 (empaque "no aplica" + comentario + fecha
autocompletada). ONLINE ONLY, OPTIONAL — nunca bloquea la captura: si Groq no
está disponible o no detecta una fecha legible, el auditor sigue pudiendo
escribirla a mano en `CountForm`.

## Request

```
POST /api/vision/fecha
Content-Type: multipart/form-data
Authorization: Bearer {supabase_access_token}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `image` | File | Sí | Foto de evidencia del producto (la misma que ya es obligatoria en Captura) |

## Response 200

```json
{
  "fecha_vencimiento": "2026-03-15",
  "texto_encontrado": "VENCE 15/03/26"
}
```

Sin fecha legible:

```json
{
  "fecha_vencimiento": null,
  "texto_encontrado": null
}
```

## Response 502

```json
{
  "error": "VISION_UNAVAILABLE",
  "message": "No se pudo leer la foto. Ingresa la fecha manualmente."
}
```

## Notas de implementación

- Modelo: `llama-4-scout-17b-16e-instruct` (mismo que `/api/vision`)
- `fecha_vencimiento` solo se acepta si el modelo devuelve `YYYY-MM-DD` válido;
  cualquier otro formato se descarta como `null` en vez de intentar parsearlo
- Nunca inventa una fecha si no la ve con claridad (instrucción explícita en el prompt)
- El cliente (`CountForm.tsx`) SIEMPRE trata el resultado como sugerencia: prellena
  el campo pero lo marca "por confirmar" y bloquea el guardado hasta que el
  auditor la revise a propósito (puede corregirla)
- Costeo: `logApiUsage` con `endpoint: 'vision-fecha'` (ver `lib/costs.ts`)
