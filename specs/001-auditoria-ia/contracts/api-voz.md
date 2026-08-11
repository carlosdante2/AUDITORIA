# Contract: POST /api/voz

**Relay de Groq Whisper STT — transcripción de audio de campo**

## Request

```
POST /api/voz
Content-Type: multipart/form-data
Authorization: Bearer {supabase_access_token}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `audio` | File | Sí | Blob de audio (webm/opus o mp4/aac) |
| `mimeType` | string | Sí | MIME type original del MediaRecorder |
| `language` | string | No | Default "es" |
| `local_id` | string | Sí | UUID del conteo (para correlación) |

## Response 200

```json
{
  "local_id": "uuid",
  "transcription": "cinco kilogramos de carne de res lomo",
  "language": "es",
  "duration_seconds": 3.2
}
```

## Response 422

```json
{
  "error": "AUDIO_TOO_SHORT",
  "message": "El audio debe tener al menos 0.5 segundos"
}
```

## Response 502

```json
{
  "error": "GROQ_UNAVAILABLE",
  "message": "Servicio de transcripción no disponible. El audio quedó en cola.",
  "queued": true
}
```

## Notas de implementación

- Valida que el archivo sea ≤25MB (límite Groq Whisper)
- Reenvía el mimeType original en el header `X-Audio-Format` a Groq
- No convierte el formato en servidor
- Si Groq retorna error 5xx, devuelve 502 con `queued: true`
- Modelo: `whisper-large-v3-turbo`
