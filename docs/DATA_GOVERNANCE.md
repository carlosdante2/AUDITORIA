# Gobierno y soberanía de datos

## Clasificación propuesta

- Pública.
- Operativa.
- Confidencial.
- Personal.
- Sensible.

## Principios

- Minimización: recoger solo lo necesario.
- Finalidad: cada dato debe tener un uso definido.
- Retención: evitar conservación indefinida.
- Supresión: definir eliminación cuando corresponda.
- Trazabilidad: registrar operaciones relevantes.
- Terceros: documentar qué información se envía a cada proveedor.

## Soberanía de datos

La arquitectura debe permitir elegir dónde procesar la información según su sensibilidad:

```text
Dato poco sensible
    -> proveedor externo permitido

Dato confidencial
    -> gateway + minimización/anonimización

Dato sensible/crítico
    -> evaluar procesamiento interno o LLM local
```

Un LLM local es una opción futura, no un requisito inmediato. Primero se debe medir necesidad, costo, hardware, calidad y mantenimiento.
