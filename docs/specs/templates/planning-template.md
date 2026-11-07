# NNN. Título de la feature — Plan

- Feature: `NNN-slug`
- Especificación: [specification.md](specification.md)
- Estado: borrador | aprobado
- Fecha: AAAA-MM-DD
- Hito de arquitectura: pendiente | aprobado por <persona> el AAAA-MM-DD

<!-- Reemplaza cada texto de ejemplo. Al copiar esta plantilla a docs/specs/features/NNN-slug/, añade un "../" a cada enlace relativo (el enlace a specification.md ya es correcto). -->

## Enfoque

Cómo se resuelve la feature en pocas frases, y qué alternativas se descartaron y por qué.

## Responsabilidades por capa

Usa los nombres y convenciones de [`frontend/architecture.md` §4](../../../frontend/architecture.md#4-componentes-y-convenciones) y de [`backend/architecture.md` §2](../../../backend/architecture.md#2-convenciones).

| Capa | Elemento | Responsabilidad | REQ |
|---|---|---|---|
| Frontend: `domain/` | `<concepto>.model.ts`, `<concepto>.rules.ts`, `<Concepto>Gateway` | … | REQ-xx |
| Frontend: `application/` | `<Feature>Facade`, `<nombre>Guard` | … | REQ-xx |
| Frontend: `data/` | `Bff<Concepto>Gateway` | … | REQ-xx |
| Frontend: `presentation/` | `<Nombre>Page`, `<Nombre>Dialog`, `<Nombre>Component` | … | REQ-xx |
| BFF: `domain/` | `<concepto>.rules.mjs` | … | REQ-xx |
| BFF: `application/` | `<capacidad>.use-cases.mjs`, `<capacidad>.queries.mjs` | … | REQ-xx |
| BFF: `infrastructure/` | Persistencia, seed y migración del estado | … | REQ-xx |
| BFF: `api/` | `<capacidad>.routes.mjs` | … | REQ-xx |

### Dependencias entre features

Dependencias nuevas o cambiadas en [`sheriff.config.ts`](../../../frontend/sheriff.config.ts), sin ciclos, y su reflejo en [`frontend/architecture.md` §2.2](../../../frontend/architecture.md#22-dependencias-entre-features). «Ninguna» si no cambian.

## Contrato del BFF afectado

| Método | Ruta | Petición | Respuestas | Errores (`code`) | Roles |
|---|---|---|---|---|---|
| … | … | … | … | … | … |

Compatibilidad: si el cambio es incompatible, es un [disparador de revisión adicional](../../architecture/development-workflow.md#disparadores-de-revisión-adicional).

## Estado del BFF

| Colección o campo | Regla | Migración (`schemaVersion`) | REQ/ADR |
|---|---|---|---|
| … | … | No / Sí: … | … |

## Tipos intermedios y nombres

Para que ninguna tarea tenga que repensarlos al ejecutarse. Declara los tipos que un cambio de modelo necesita entre tareas y los nombres de campos y variables que nombran conceptos renombrados. Usa el [glosario](../../architecture/glosario.md).

| Tipo o nombre | Definición | Tareas que lo usan |
|---|---|---|
| … | … | TASK-xx |

## Dependencias y riesgos

| Riesgo o dependencia | Impacto | Mitigación |
|---|---|---|
| … | … | … |

## Decisiones

- **Acordadas:** …
- **Condicionadas** (qué trabajo bloquean): …
- **ADR necesarios:** …

## Estrategia de pruebas

TDD obligatorio según [STD-18](../../architecture/standards.md): BFF en `domain/`, `application/` y el contrato de `api/`; frontend en `domain/` de cada feature.

| ID | Nivel | Qué verifica | AC | TDD obligatorio | Comando |
|---|---|---|---|---|---|
| TEST-01 | BFF `domain/` | … | AC-xx | Sí | `npm test --prefix backend` |
| TEST-02 | Frontend `domain/` | … | AC-xx | Sí | `npm test --prefix frontend` |
| TEST-03 | Contrato del BFF | … | AC-xx | Sí | `npm run test:contract --prefix backend` |
| TEST-04 | E2E | … | AC-xx | No | `npm run test:e2e` (desde `frontend/`) |

### Pruebas existentes afectadas

| Prueba | Qué puede cambiar: aserciones o solo valores esperados | Cómo se conserva la cobertura |
|---|---|---|
| … | Solo valores esperados | … |

### Capturas antes y después

Pantallas y anchos que se capturan antes y después ([QA visual](../../development/local-environment.md#qa-visual-con-chrome)). «No aplica» si la feature no toca la interfaz.

| Pantalla o ruta | Anchos | Cambio visual esperado |
|---|---|---|
| … | 1440 y 390 px | Ninguno / … |

### Ejecución prevista

Por paso o tarea prevista, para que `sdd-tasks` no tenga que decidirlo ([tablas de nivel y esfuerzo](../../development/agent-execution.md#delegar-por-nivel-y-esfuerzo); sin nombres de modelo).

| Paso o tarea | Nivel y esfuerzo sugeridos | E2E | Criterios de aprobación (si es ⚠) |
|---|---|---|---|
| … | estándar · medio | No | … |

## Documentos afectados

Contrato del BFF, glosario, trazabilidad, arquitectura del frontend o del backend, sistema visual o ADR que hay que actualizar.

## Hito de arquitectura

Qué se pide aprobar (capas, dependencias entre features, contrato, decisiones) y alternativas presentadas.
