---
name: sdd-specify
description: Etapa 1 del flujo SDD de WebStore. Crea o actualiza la especificación (specification.md) de una feature en docs/specs/features/NNN-slug a partir de un requisito del alcance, una mejora del backlog u objetivo, con requisitos REQ, criterios de aceptación AC, datos, casos límite y preguntas abiertas. Úsalo al empezar una feature nueva o cuando cambie el alcance de una existente.
metadata:
  project: webstore
  stage: "1/7"
---

# Especificar una feature

## Entrada

Argumentos: una historia de usuario, un requisito de `docs/planning/`, una mejora de `docs/planning/backlog.md`, un objetivo en texto libre o el `NNN-slug` de una feature existente. Si no hay argumentos, pide el objetivo después de buscar el contexto disponible.

## Lee primero

- `AGENTS.md`
- `docs/specs/README.md` (convenciones de las features)
- `docs/specs/templates/specification-template.md`
- `docs/planning/SCOPE.md`, `docs/planning/TRACEABILITY.md` y `docs/planning/PENDING-DECISIONS.md`: alcance acordado, requisitos ya implementados y lo que sigue sin decidir
- `docs/planning/backlog.md`, si la feature sale de una mejora registrada
- `docs/architecture/glosario.md`: los términos de negocio
- `docs/specs/features/README.md` (índice y siguiente número libre)

## Pasos

1. Trabaja en la rama `feature/NNN-slug` de la feature: todas sus etapas hacen commit en ella (`docs/architecture/development-workflow.md`, apartado «Un pull request por feature»). Si la feature no existe, elige el siguiente `NNN` libre y un slug en kebab-case y en español, y crea la rama desde la rama base (`docs/git/conventional-pull-requests.md`, apartado «Transición»). Para elegir el `NNN`, mira el índice y también las ramas `feature/NNN-*` locales y de `origin`: una feature en curso solo figura en el índice de su rama. No renumeres features existentes.
2. Copia la plantilla a `docs/specs/features/NNN-slug/specification.md` y añade un `../` a cada enlace relativo.
3. Rellena actores (cliente, invitado, `superadmin`, `admin`, `vendedor`), aplicación afectada (Storefront, Admin o ambas), alcance y exclusiones, REQ observables, AC, datos, integraciones, casos límite y fallos.
4. Escribe cada AC como un escenario comprobable. Marca como **propuesto** cualquier AC que no salga del requisito, de la mejora o de lo que diga la persona.
5. Contrasta el objetivo con el contrato del BFF (`backend/docs/BFF-CONTRACT.md`), el estado que guarda el BFF, `docs/planning/PENDING-DECISIONS.md` y el código existente. Registra cada contradicción como pregunta abierta.
6. Si la feature cambia la interfaz, dilo de forma explícita y enlaza el sistema visual (`frontend/docs/VISUAL-SYSTEM.md`). Si no debe cambiarla, añade el AC «sin cambios visuales» para que se compare con capturas.
7. Separa hechos (verificables en el repositorio), supuestos y decisiones pendientes.
8. Añade o actualiza la fila de la feature en `docs/specs/features/README.md` con estado `especificada` y, en «Bloqueos y siguiente paso», las preguntas abiertas que bloquean el hito de alcance.
9. Presenta el alcance para el hito humano de alcance, con las preguntas de una en una (`docs/architecture/development-workflow.md`, apartado «Hitos humanos»). Cuando se apruebe, registra quién y cuándo en la cabecera, en un commit de la rama.

## Salida

`docs/specs/features/NNN-slug/specification.md` y la fila del índice.

## No hacer

- No inventes roles, reglas de negocio ni endpoints.
- No resuelvas contradicciones en silencio, ni cierres una decisión que `PENDING-DECISIONS.md` deja abierta.
- No pidas a la persona del hito que decida una regla de negocio que las fuentes no dicen de forma explícita: regístrala en `PENDING-DECISIONS.md` para quien decide el producto y deja la feature bloqueada (`docs/architecture/development-workflow.md`, apartado «Hitos humanos»).
- No implementes código en esta etapa.
- No abras un PR al terminar la etapa ni hagas push sin que la persona lo pida: la feature se entrega en un solo PR, después de `sdd-verify`.
