# 0002. Adoptar desarrollo guiado por especificaciones y por pruebas

- Estado: Aceptada
- Fecha: 2026-11-06

## Contexto

### Por qué había que decidir

Los requisitos de WebStore están consolidados en [`SCOPE.md`](../planning/SCOPE.md), [`TRACEABILITY.md`](../planning/TRACEABILITY.md) y [`FUNCIONALIDAD.md`](../planning/FUNCIONALIDAD.md), pero no hay artefactos que los refinen hasta contratos, casos límite, pruebas y evidencia. Las pruebas cubren reglas de dominio, límites de arquitectura y un smoke test del contrato, sin pruebas de componentes. Buena parte del código lo producen agentes de IA, que sin una especificación verificable tienden a inventar comportamiento.

### Opciones

| Opción | Qué habría significado | A favor | En contra |
|---|---|---|---|
| **SDD + TDD como IdShield (elegida)** | Una carpeta por feature con especificación, plan, tareas y verificación; prueba primero en las capas de reglas y en el contrato | Trazabilidad verificable; el mismo flujo y los mismos skills que IdShield | El primer incremento de cada feature es más lento |
| Solo la matriz de trazabilidad y pruebas al final | Seguir con `TRACEABILITY.md` como única evidencia | Sin proceso nuevo | La implementación define el comportamiento; la evidencia no llega a la prueba |
| TDD estricto en todo, incluida la UI | Prueba primero también en componentes y facades | Máxima cobertura | El frontend no tiene entorno de pruebas de Angular; fricción alta con la UI |

## Decisión

**Especificaciones (SDD).** Cada feature vive en `docs/specs/features/NNN-slug/` con `specification.md`, `planning.md`, `tasks.md` y `verification.md`, creados desde [`docs/specs/templates/`](../specs/templates/). Usan los identificadores `REQ-xx`, `AC-xx`, `TASK-xx` y `TEST-xx` y siguen las siete etapas de [`development-workflow.md`](../architecture/development-workflow.md). Las [historias de usuario](../planning/user-stories/user-stories.md), derivadas de los documentos de alcance, son la fuente; la especificación las refina, no las sustituye.

**Pruebas primero (TDD).** Escribir la prueba antes del código (rojo → verde → refactor) es obligatorio en:

- BFF: `domain/`, `application/` y el contrato de `api/`.
- Frontend: `domain/` de cada feature.

Además:

- En `application/` y `data/` del frontend la prueba primero es recomendable hasta que exista un entorno de pruebas de Angular.
- Los componentes y las pruebas e2e derivan de los criterios de aceptación y pueden escribirse junto al código. Las herramientas de prueba están en [ADR-0009](0009-usar-node-test-y-playwright-para-las-pruebas.md).
- Antes de modificar código existente sin pruebas se escribe una prueba de caracterización.
- No se fija un porcentaje de cobertura: cuenta la aceptación funcional ([STD-13](../architecture/standards.md)).
- Un cambio de interfaz se acompaña de capturas antes y después ([STD-12](../architecture/standards.md)).

**Herramientas de IA agnósticas.** Las reglas para agentes viven en `AGENTS.md` y los prompts del flujo, como skills del estándar Agent Skills en `.agents/skills/`. Lo propio de cada herramienta se decide en [ADR-0008](0008-trabajar-con-claude-code-o-codex-mediante-adaptadores.md).

*Motivo:* da a personas y agentes una forma de demostrar el resultado en lugar de declararlo, con el proceso que el equipo ya usa en IdShield.

## Consecuencias

- Las pruebas pasan a ser la especificación ejecutable, y la revisión de un PR puede comprobar si el comportamiento coincide con lo acordado.
- Hace falta disciplina para mantener la trazabilidad al cambiar requisitos.
- Lo que la demo ya implementa no se reescribe como features: su evidencia sigue en la trazabilidad y en la [validación](../../frontend/docs/VALIDATION.md). Las features SDD empiezan en `001`.
- Quedan fuera de alcance, como trabajo posterior: el entorno de pruebas de Angular (PBI-0025 del [backlog](../planning/backlog.md)) y cualquier umbral de cobertura.
- Los skills solo ayudan a producir artefactos; su existencia no demuestra que se hayan ejecutado.

## Referencias

- [Kent Beck — Test Driven Development: By Example](https://www.oreilly.com/library/view/test-driven-development/0321146530/)
- [Martin Fowler — Specification By Example](https://martinfowler.com/bliki/SpecificationByExample.html)
- [Agent Skills — Specification](https://agentskills.io/specification)
- [AGENTS.md](https://agents.md/)
