# 0001. Registrar las decisiones de arquitectura

- Estado: Aceptada
- Fecha: 2026-11-06

## Contexto

### Por qué había que decidir

Las decisiones de WebStore estaban repartidas entre los historiales de cambios de [`docs/changelog/`](../changelog/), los documentos de planificación y los de diseño, mezcladas con evidencia de implementación y pendientes. Al adoptar la estructura de IdShield ([ADR-0004](0004-adoptar-la-estructura-de-repositorio-de-idshield.md)) hacía falta un lugar único para el porqué de cada decisión vigente.

### Opciones

| Opción | Qué habría significado | A favor | En contra |
|---|---|---|---|
| **ADR en `docs/adrs/`, como IdShield (elegida)** | Un archivo por decisión, con contexto, opciones, decisión y consecuencias | Conserva el porqué sin inflar los documentos de arquitectura; el equipo ya usa el formato en IdShield | Exige disciplina al decidir |
| Seguir con los historiales de cambios | Cada decisión queda en el changelog de su fecha | Sin trabajo extra | Mezcla decisiones con cambios; no dice qué sigue vigente |
| Documentar todo en los `architecture.md` | Una sección de decisiones en cada documento | Un solo lugar por aplicación | El documento crece y pierde las alternativas descartadas |

## Decisión

Usaremos Architecture Decision Records (ADR) en `docs/adrs/`, a partir de [`0000-template.md`](0000-template.md):

- Un archivo por decisión: `NNNN-titulo-en-kebab-case.md`, con numeración correlativa de cuatro dígitos.
- Un ADR aceptado no se edita en su contenido. Si la decisión cambia, un ADR nuevo lo sustituye y el anterior pasa a «Sustituida por NNNN».
- Requiere ADR toda decisión difícil de revertir o que afecte a más de una aplicación: tecnología, estructura, contrato del BFF, seguridad y roles, datos y proceso.
- No requieren ADR las actualizaciones de versión de parche o menor ni las decisiones locales a una historia.
- Los ADR se escriben al tomar o discutir una decisión.
- [`docs/architecture/README.md`](../architecture/README.md), [`frontend/architecture.md`](../../frontend/architecture.md) y [`backend/architecture.md`](../../backend/architecture.md) describen el estado vigente y enlazan los ADR que lo justifican.
- Una desviación de un estándar también se registra como ADR ([excepciones](../development/exceptions.md)).

*Motivo:* separa lo que se decidió, y por qué, de lo que cambia cada día, con el mismo formato que IdShield.

## Consecuencias

- Los documentos de arquitectura quedan cortos y describen solo lo vigente. El historial y las alternativas descartadas viven en los ADR.
- Los historiales de `docs/changelog/` siguen siendo historia: no se reescriben ni se convierten en ADR.
- El estado de implementación y los pendientes no van en los ADR: van en la [trazabilidad](../planning/TRACEABILITY.md), en las [decisiones pendientes](../planning/PENDING-DECISIONS.md) y en el [backlog](../planning/backlog.md).
- 0001, 0002 y 0005 son los ADR de proceso equivalentes a los de IdShield. Se escribieron después de 0003, 0004, 0006 y 0007, con la misma fecha.

## Referencias

- [Michael Nygard — Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
