# NNN. Título de la feature — Tareas

- Feature: `NNN-slug`
- Plan: [planning.md](planning.md)
- Fecha: AAAA-MM-DD

<!-- Reemplaza cada texto de ejemplo. Al copiar esta plantilla a docs/specs/features/NNN-slug/, añade un "../" a cada enlace relativo (el enlace a planning.md ya es correcto). -->

## Traspaso

Permite empezar el bloque siguiente sin releer la feature. Unas 20 líneas. La actualiza la última tarea del bloque, en su mismo commit ([guía](../../development/agent-execution.md#traspaso)).

| Campo | Contenido |
|---|---|
| Punta de la rama | SHA y título del último commit |
| Siguiente bloque | Fase o tareas, y la primera tarea que se ejecuta |
| Decisiones de ejecución | Lo decidido durante la implementación que no está en el plan, con su enlace |
| Riesgos abiertos | Lo que puede romper el bloque siguiente |
| Entorno | Comandos, servidores o copias de datos que han dado problemas y cómo se resolvieron |

## Reglas

- En áreas con TDD obligatorio ([STD-18](../../architecture/standards.md)), cada TASK de implementación indica el TEST que se escribe primero.
- Una tarea solo se marca `hecha` con evidencia: commit, comando y resultado registrados en `verification.md`, en el mismo commit de la tarea ([guía](../../development/agent-execution.md#evidencia-en-el-commit-de-la-tarea)).
- Una tarea que toca la interfaz registra la comparación de capturas antes y después ([STD-12](../../architecture/standards.md)).
- Las pruebas que modifican datos usan una copia de `backend/data.json` con `WEBSTORE_DATA_FILE` ([STD-09](../../architecture/standards.md)).
- Las tareas de alto impacto se marcan con ⚠ y requieren revisión humana antes de ejecutarse ([disparadores](../../architecture/development-workflow.md#disparadores-de-revisión-adicional)).

## Fases

| Fase | Objetivo |
|---|---|
| 1 | … |

## Bloques de sesión

Cada bloque se ejecuta en una sesión nueva ([guía](../../development/agent-execution.md#una-sesión-por-bloque)). Un bloque es una fase o 6 a 8 tareas como máximo, y termina antes de cada tarea ⚠.

| Bloque | Tareas | Termina antes de (⚠) |
|---|---|---|
| 1 | TASK-01 a TASK-0x | TASK-0x / — |

## Tareas

| ID | Fase | Descripción | Capa | REQ/AC | TEST primero | Depende de | Riesgo | Nivel y esfuerzo | E2E | Capturas | Evidencia esperada | Estado |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| TASK-01 | 1 | … | … | REQ-xx / AC-xx | TEST-xx | — | Bajo | estándar · medio | No | No | … | pendiente |

- **Nivel y esfuerzo:** quién ejecuta la tarea, según las [tablas de la guía](../../development/agent-execution.md#delegar-por-nivel-y-esfuerzo): `ligero`, `estándar` o `avanzado`, y `bajo`, `medio`, `alto` o `muy alto`. No nombres un modelo: cada herramienta lo resuelve en el [catálogo de niveles](../../../.agents/execution-catalog.json).
- **E2E:** `Sí` si la tarea cambia plantillas, rutas, datos guardados o el contrato; `Spec <nombre>` si basta una spec; `No` en otro caso.
- **Capturas:** `Sí` si la tarea toca plantillas, estilos o tokens.

Estados: `pendiente`, `bloqueada`, `en curso`, `hecha`.

## Definition of Ready

Marca solo lo que se cumple de verdad ([criterios](../../development/definition-of-ready.md)).

| Tarea | Lista | Motivo si no lo está |
|---|---|---|
| TASK-01 | Sí / No | … |

## Hitos de revisión humana

Cada revisión ⚠ lista sus criterios concretos de aprobación: qué debe comprobar la persona.

- **⚠ TASK-xx:** …
  - Criterio de aprobación: …
