# Contract: POST /api/vision

**Relay de Groq Vision — extracción de items de facturas**

## Request

```
POST /api/vision
Content-Type: multipart/form-data
Authorization: Bearer {supabase_access_token}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `image` | File | Sí | Foto de factura (JPEG/PNG, max 2MB) |
| `reception_id` | string | Sí | UUID de la recepción |

## Response 200

```json
{
  "reception_id": "uuid",
  "proveedor": "Carnes del Valle S.A.S.",
  "fecha_factura": "2026-08-09",
  "items": [
    {
      "descripcion": "Lomo de res 1kg",
      "cantidad": 5,
      "unidad": "kg",
      "precio_unitario": 28000
    },
    {
      "descripcion": "Pollo entero",
      "cantidad": 10,
      "unidad": "unidades",
      "precio_unitario": 12500
    }
  ],
  "confidence": 0.87,
  "raw_text": "..."
}
```

## Response 422

```json
{
  "error": "IMAGE_NOT_READABLE",
  "message": "No se pudo leer el texto de la imagen. Tome una foto más nítida."
}
```

## Notas de implementación

- Modelo: `llama-4-scout-17b-16e-instruct`
- Prompt en español colombiano con contexto de facturas de proveedores de alimentos
- Comprime imagen a ≤1MB antes de enviar a Groq si supera ese tamaño
- Items sin cantidad clara: `cantidad: null`
- Retorna siempre `raw_text` para auditoría
