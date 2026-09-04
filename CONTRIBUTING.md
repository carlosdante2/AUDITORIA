# Guía de trabajo del equipo

## Ramas fijas

- `master`: principal y estable.
- `dev-lorena`: Lorena.
- `dev-geraldin`: Geraldin.
- `dev-carlos`: Carlos.
- `dev-companero4`: cuarto integrante.

## Antes de trabajar

```bash
git switch master
git pull origin master
git switch dev-lorena
git merge master
```

Cada integrante sustituye `dev-lorena` por su rama.

## Guardar cambios

```bash
git status
git add .
git commit -m "feat: descripción clara"
git push
```

## Integrar

Crear Pull Request de la rama personal hacia `master`.

## Reglas

- No desarrollar directamente en `master`.
- No subir secretos.
- No usar `git push --force`.
- Revisar conflictos en equipo.
- Una persona distinta revisa el Pull Request.
- No aceptar cambios masivos de IA sin revisar archivos afectados.
