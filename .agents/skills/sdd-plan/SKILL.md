---
name: sdd-plan
description: Etapa 2 del flujo SDD de WebStore. Crea el plan técnico (planning.md) de una feature ya especificada, con responsabilidades por aplicación y capa, contratos HTTP del BFF, datos, riesgos, decisiones y la estrategia de pruebas que marca qué pruebas son TDD obligatorio. Úsalo después de aprobar el alcance de la especificación.
metadata:
  project: webstore
  stage: "2/7"
---

# Planificar una feature

## Entrada

Argumentos: el `NNN-slug` de la feature. Si hay varias plausibles, pregunta cuál.

## Lee primero

- `docs/specs/features/NNN-slug/specification.md`
- `docs/specs/templates/planning-template.md`
- `docs/architecture/standards.md` (en especial STD-05, STD-12, STD-13, STD-17 y STD-18)
- `docs/architecture/README.md` (contenedores, una sola fuente de datos y roles)
- `backend/architecture.md` (capas, convenciones, configuración y pruebas)
- `frontend/architecture.md` (features y capas, reglas de dependencia, integración con el BFF y pruebas) y `backend/docs/BFF-CONTRACT.md`
- El código existente que la feature toca

## Pasos

1. Copia la plantilla a `docs/specs/features/NNN-slug/planning.md` y añade un `../` a cada enlace relativo. Comprueba que los enlaces resuelven.
2. Define responsabilidades por aplicación (Storefront, Admin, BFF) y por capa, con los nombres de `frontend/architecture.md` §4 y `backend/architecture.md` §2.
3. Describe contratos HTTP, datos del estado del BFF (y su migración si cambia el esquema), permisos por rol, dependencias y fallos. Si algo ya existe en el código o en `BFF-CONTRACT.md`, enlázalo en lugar de copiarlo.
4. Escribe la estrategia de pruebas: un `TEST-xx` por comportamiento relevante, con nivel (regla de `domain/`, caso de uso del BFF, contrato, límites de arquitectura, e2e o comparación de capturas), AC que cubre, si es TDD obligatorio según STD-18 y el comando que lo ejecuta.
5. Si la feature modifica código existente sin pruebas, añade un TEST de caracterización.
6. Haz que el plan no obligue a repensar al ejecutar (`docs/development/agent-execution.md`):
   1. Si un cambio de modelo cruza tareas, declara los tipos intermedios (por ejemplo, el campo nuevo del estado que el BFF necesita antes que el Admin).
   2. Para cada prueba existente afectada, di si la tarea puede cambiar sus aserciones o solo sus valores esperados, y cómo se conserva la cobertura.
   3. Fija también los nombres de campos y variables que nombran conceptos renombrados (por ejemplo, el campo que guarda una facade).
   4. Por paso o tarea prevista, sugiere nivel y esfuerzo (nivel `ligero`, `estándar` o `avanzado`, sin nombres de modelo), indica si necesita e2e o comparación de capturas y escribe los criterios concretos de aprobación de cada revisión ⚠.
7. Separa decisiones acordadas de condicionadas y lista los ADR necesarios. Lo que dependa de una decisión crítica queda bloqueado.
8. Actualiza el estado en `docs/specs/features/README.md` a `planificada`, con los ADR y las decisiones pendientes en «Bloqueos y siguiente paso», y propone el hito de arquitectura con sus alternativas, una pregunta cada vez (`docs/architecture/development-workflow.md`, apartado «Hitos humanos»).

## Salida

`docs/specs/features/NNN-slug/planning.md`.

## No hacer

- No generes decisiones ficticias ni cifras de rendimiento sin base.
- No instales herramientas ni implementes código.
- No planifiques cambios visuales que la especificación no pida.
