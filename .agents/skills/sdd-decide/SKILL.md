---
name: sdd-decide
description: Etapa 3 del flujo SDD de WebStore. Registra como ADR las decisiones de arquitectura significativas que necesita una feature y actualiza los documentos de arquitectura y el contrato del BFF si cambia su alcance. Úsalo cuando el plan de una feature identifica ADR necesarios o decisiones abiertas que la bloquean.
metadata:
  project: webstore
  stage: "3/7"
---

# Registrar decisiones de una feature

## Entrada

Argumentos: el `NNN-slug` de la feature y, opcionalmente, la decisión concreta.

## Lee primero

- `docs/specs/features/NNN-slug/specification.md` y `planning.md`
- `docs/adrs/0001-registrar-decisiones-de-arquitectura.md` y STD-16 de `docs/architecture/standards.md` (cuándo hace falta un ADR y cuándo no)
- `docs/adrs/0000-template.md` y los ADR existentes en `docs/adrs/` como ejemplos del formato
- `docs/architecture/README.md`, `backend/architecture.md` y `frontend/architecture.md`
- `docs/planning/PENDING-DECISIONS.md`, si la decisión figura allí

## Pasos

1. Para cada decisión del plan, comprueba si cumple los criterios de ADR-0001: difícil de revertir o que afecta a más de un componente (Storefront, Admin o BFF), al contrato HTTP o a las reglas de dependencia.
2. Crea un ADR por decisión con el siguiente número correlativo de cuatro dígitos, usando `0000-template.md`. Rellena sus partes de forma breve: por qué había que decidir (de 2 a 3 líneas), la tabla de opciones con qué habría significado cada una, la decisión con su motivo (de 1 a 2 líneas) y las consecuencias.
3. Deja el ADR en estado `Propuesta` hasta que una persona lo apruebe. Presenta las decisiones de una en una (`docs/architecture/development-workflow.md`, apartado «Hitos humanos»). Solo entonces cámbialo a `Aceptada`.
4. Al aceptarse, actualiza el estado vigente en `docs/architecture/README.md`, `backend/architecture.md` o `frontend/architecture.md`, y en `docs/planning/PENDING-DECISIONS.md` si la decisión estaba pendiente allí.
5. Actualiza `backend/docs/BFF-CONTRACT.md`, `frontend/sheriff.config.ts` o los diagramas solo si cambia su alcance, y en la tarea que corresponda si el cambio es de código.
6. Enlaza los ADR desde `planning.md`.
7. Haz commit de cada ADR y de su aceptación en la rama `feature/NNN-slug` de la feature (`docs/architecture/development-workflow.md`, apartado «Un pull request por feature»).

## Salida

ADR en `docs/adrs/` y, si aplica, documentos de arquitectura actualizados.

## No hacer

- No edites el contenido de un ADR aceptado: crea uno nuevo que lo sustituya.
- No generes un número fijo de ADR por obligación.
- No conviertas el ADR en una tesis: los detalles se enlazan.
- No escribas ADR retroactivos de decisiones que nadie ha tomado.
- No reescribas `docs/changelog/`: es historia.
- No abras un PR al terminar la etapa ni hagas push sin que la persona lo pida: los ADR se entregan en el PR único de la feature.
