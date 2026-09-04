# Reglas de negocio

## Prioridad actual

Durante esta fase la experiencia principal debe concentrarse en:

1. Vencimiento.
2. Temperatura.

## Semáforo

Estados:

- Verde.
- Amarillo.
- Naranja.
- Rojo.
- Gris / no evaluado cuando aplique.

Los rangos deben configurarse y no duplicarse en componentes de UI.

## Vencimiento

Ejemplo conceptual:

```text
Verde: más de X días
Amarillo: entre X y X días
Naranja: entre X y X días
Rojo: X días o menos
```

Los valores definitivos deben validarse con el proceso operativo.

## Temperatura

Los umbrales no son universales. Deben depender de:

- producto/categoría;
- tipo de almacenamiento;
- equipo;
- procedimiento aplicable;
- criterios técnicos de inocuidad.

## Formularios

### Observación visual
- Normal.
- Dudoso.
- No conforme.
- No aplica.

### Empaque
- Intacto.
- Daño leve.
- Roto/fuga.
- No aplica.

## Historial

Editar o eliminar no debe borrar silenciosamente evidencia. Registrar:
- quién;
- cuándo;
- campo;
- valor anterior;
- valor nuevo;
- motivo.
