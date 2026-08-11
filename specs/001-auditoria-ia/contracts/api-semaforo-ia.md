# Contract: POST /api/semaforo-ia

**Insights ejecutivos de Claude haiku — SOLO ONLINE, OPCIONAL**

> Este endpoint es complementario. El semáforo determinista en `lib/semaforo.ts`
> es el sistema primario. Este endpoint solo enriquece con insights redactados.

## Request

```
POST /api/semaforo-ia
Content-Type: application/json
Authorization: Bearer {supabase_access_token}
```

```json
{
  "session_id": "uuid",
  "counts_summary": [
    {
      "nombre": "Carne de res lomo",
      "semaforo_color": "rojo",
      "semaforo_razon": "Vence en 0 días",
      "semaforo_accion": "consumo_inmediato_o_descarte",
      "cantidad": 5,
      "unidad_medida": "kg"
    }
  ],
  "bodega": "Bodega Principal",
  "sector": "alimentos_bebidas"
}
```

## Response 200

```json
{
  "insights": "La sesión presenta 2 alertas rojas críticas: carne de res lomo (5kg) y pollo entero (8 unidades) requieren acción inmediata antes del servicio del día. Se recomienda coordinar con cocina en las próximas 2 horas para utilización o donación certificada según estrategia de economía circular.",
  "critical_count": 2,
  "warning_count": 5,
  "ok_count": 18
}
```

## Response 503

```json
{
  "error": "AI_UNAVAILABLE",
  "message": "Insights de IA no disponibles sin conexión. El semáforo local sigue activo."
}
```

## Notas de implementación

- Modelo: `claude-haiku-4-5-20251001`
- Solo se llama al cerrar sesión o en dashboard supervisor
- Nunca bloquea el flujo de auditoría — si falla, la UI lo ignora
- `counts_summary` limita a los 20 items más críticos para no exceder contexto
- Temperatura 0.3 para respuestas consistentes
