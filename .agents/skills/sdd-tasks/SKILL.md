---
name: sdd-tasks
description: Etapa 4 del flujo SDD de WebStore. Desglosa una feature planificada en tareas pequeñas (tasks.md) con dependencias, trazabilidad REQ/AC, riesgo, evidencia esperada, nivel y esfuerzo, y el TEST que se escribe primero en las áreas con TDD obligatorio. Úsalo después del plan y de los ADR de una feature.
metadata:
  project: webstore
  stage: "4/7"
---

# Desglosar tareas de una feature

## Entrada

Argumentos: el `NNN-slug` de la feature.

## Lee primero

- `docs/specs/features/NNN-slug/specification.md`, `planning.md` y los ADR enlazados
- `docs/specs/templates/tasks-template.md`
- `docs/development/definition-of-ready.md`
- `docs/development/agent-execution.md` (tablas de nivel y esfuerzo, bloques, Traspaso y controles)
- `docs/architecture/standards.md` (STD-12 y STD-18)

## Pasos

1. Copia la plantilla a `docs/specs/features/NNN-slug/tasks.md` y añade un `../` a cada enlace relativo.
2. Divide el trabajo en resultados revisables: cada TASK tiene entrada, salida, REQ/AC, dependencias, riesgo y evidencia esperada.
3. En áreas con TDD obligatorio, indica en cada TASK de implementación el `TEST-xx` del plan que se escribe primero. Ese TEST forma parte de la misma tarea y va antes del código.
4. Incluye tareas de Storefront, Admin, BFF, contrato y pruebas solo donde la feature las necesite. Un cambio de contrato actualiza `BFF-CONTRACT.md` y el smoke test en la misma tarea.
5. Marca con ⚠ las tareas de alto impacto (cambios del esquema del estado, permisos por rol, contrato HTTP o cambios visuales pedidos) y añade el hito de revisión humana antes de ellas. Cada ⚠ lista sus criterios concretos de aprobación: qué debe comprobar la persona.
6. Rellena la columna Nivel y esfuerzo de cada tarea según las tablas de `docs/development/agent-execution.md` (apartado «Delegar por nivel y esfuerzo»). Escribe el nivel (`ligero`, `estándar` o `avanzado`), no un modelo: cada herramienta lo resuelve en `.agents/execution-catalog.json`. Las tareas ⚠ no se delegan.
7. Rellena la columna E2E: `Sí` si la tarea cambia plantillas, rutas, datos guardados o el contrato; `Spec <nombre>` si basta una spec; `No` en otro caso. Indica también si necesita comparación de capturas (STD-12): `Sí` si cambia plantillas, estilos, componentes o rutas visibles, con las rutas y los anchos que se comparan; `No` en otro caso.
8. Agrupa las tareas en bloques de sesión: una fase o 6 a 8 tareas como máximo, que terminan antes de cada ⚠.
9. Escribe el Traspaso inicial al principio de `tasks.md`, con el primer bloque como siguiente bloque.
10. Evalúa la Definition of Ready de cada tarea con honestidad. Una tarea que depende de una decisión pendiente queda `bloqueada`.
11. Actualiza el estado en `docs/specs/features/README.md` a `desglosada`, con las tareas bloqueadas y su motivo en «Bloqueos y siguiente paso».
12. Haz commit en la rama `feature/NNN-slug` de la feature y pide a la persona que apruebe las tareas. Cuando las apruebe, registra quién y cuándo en la cabecera de `tasks.md`, en un commit de la rama (`docs/architecture/development-workflow.md`, apartado «Hitos humanos»).

## Salida

`docs/specs/features/NNN-slug/tasks.md`.

## No hacer

- No marques tareas como hechas por figurar en un plan.
- No crees issues ni sincronices gestores externos sin autorización explícita.
- No abras un PR al terminar la etapa ni hagas push sin que la persona lo pida: la feature se entrega en un solo PR, después de `sdd-verify` (`docs/architecture/development-workflow.md`, apartado «Un pull request por feature»).
