# Contract: POST /api/match

**Matching semántico de texto libre contra catálogo del tenant (pgvector)**

## Request

```
POST /api/match
Content-Type: application/json
Authorization: Bearer {supabase_access_token}
```

```json
{
  "query": "lomo de res 1kg",
  "tenant_id": "uuid",
  "top_k": 3
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `query` | string | Sí | Texto a matchear (descripción de voz o factura) |
| `tenant_id` | string | Sí | UUID del tenant — validado contra JWT |
| `top_k` | integer | No | Default 3, max 5 |

## Response 200

```json
{
  "matches": [
    {
      "producto_id": "uuid",
      "nombre": "Carne de res lomo",
      "unidad_medida": "kg",
      "subtipo": "carne_res",
      "score": 0.94,
      "requiere_fecha_vencimiento": true
    },
    {
      "producto_id": "uuid",
      "nombre": "Carne de res molida",
      "unidad_medida": "kg",
      "subtipo": "carne_res",
      "score": 0.71,
      "requiere_fecha_vencimiento": true
    }
  ],
  "below_threshold": false
}
```

Cuando ningún match supera el umbral (0.75):
```json
{
  "matches": [...],
  "below_threshold": true,
  "suggestion": "Ningún producto en catálogo coincide con suficiente confianza. Se creará como producto pendiente."
}
```

## Notas de implementación

- Genera embedding con `text-embedding-3-small` para `query`
- Query SQL: `SELECT ... ORDER BY embedding <=> $query_emb LIMIT top_k`
- Umbral de retorno: solo incluye matches con score coseno ≥ 0.70
- `below_threshold: true` si el mejor score < 0.75
- tenant_id en el WHERE validado contra `get_my_tenant_id()` (RLS)
