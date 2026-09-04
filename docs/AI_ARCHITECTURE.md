# Arquitectura de IA

## Objetivo

Desacoplar la aplicación de proveedores concretos y medir la calidad de la IA antes de ampliar su autonomía.

## AI Gateway

```text
Fresko
  -> AI Gateway
      -> Voz
      -> Visión
      -> Embeddings
      -> Matching
      -> Proveedor A
      -> Proveedor B
      -> Futuro LLM local
```

La aplicación debería consumir capacidades, no proveedores:

```text
ai.transcribe(audio)
ai.analyzeProduct(image)
ai.extractInvoice(image)
ai.createEmbedding(text)
```

## Evals

Toda función de IA relevante debe tener evaluaciones.

### Voz
- precisión de transcripción;
- extracción correcta de producto/cantidad/lote;
- latencia;
- costo;
- tasa de error.

### Visión
- precisión del estado sugerido;
- falsos positivos;
- falsos negativos;
- calidad mínima de imagen;
- confirmación humana.

### Métricas ejemplo

```text
Exactitud identificación producto
Exactitud extracción cantidad
Falsos positivos condición visual
Latencia promedio
Costo por análisis
Tasa de corrección humana
```

## Agentes

Los agentes se evaluarán después de estabilizar seguridad, datos, reglas y evals.

Un agente no debe modificar inventario crítico sin autorización, controles y trazabilidad.
