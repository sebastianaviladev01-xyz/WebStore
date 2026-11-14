# Especificaciones por feature (SDD)

Aquí viven las especificaciones versionadas de cada feature de WebStore. El flujo completo, con las etapas, los hitos humanos y el ciclo TDD, está en [`development-workflow.md`](../architecture/development-workflow.md). La decisión que lo justifica es [ADR-0002](../adrs/0002-adoptar-sdd-y-tdd.md).

## Estructura

| Ruta | Contenido |
|---|---|
| [`features/README.md`](features/README.md) | Índice de features y su estado |
| `features/NNN-slug/specification.md` | Qué debe hacer la feature: alcance, REQ, AC, datos, casos límite y preguntas |
| `features/NNN-slug/planning.md` | Cómo se construye: responsabilidades por capa, contrato del BFF, datos, riesgos y estrategia de pruebas |
| `features/NNN-slug/tasks.md` | Tareas pequeñas con dependencias y el TEST que se escribe primero |
| `features/NNN-slug/verification.md` | Qué se ejecutó, con qué resultado y qué queda pendiente |
| [`templates/`](templates/) | Plantillas de los cuatro artefactos |
| [`design/`](design/) | Especificaciones de diseño anteriores al flujo SDD, conservadas como referencia |

## Especificaciones de diseño anteriores

[`design/2026-11-04-lg-inspired-storefront-refinement-design.md`](design/2026-11-04-lg-inspired-storefront-refinement-design.md) es el diseño del refinamiento del Storefront del 2026-11-04. Es anterior a este flujo y no es una feature SDD: no tiene REQ ni AC. Las decisiones visuales vigentes están en el [sistema visual](../../frontend/docs/VISUAL-SYSTEM.md), y lo que sigue abierto sobre el inicio, en las [decisiones pendientes](../planning/PENDING-DECISIONS.md).

## Convenciones

- `NNN` es un número correlativo de tres dígitos, desde `001`. No se renumera nunca, aunque una feature se abandone.
- `slug` va en kebab-case y en español, y describe la capacidad (`comprar-como-invitado`, `gestionar-tarifas-de-envio`).
- `REQ-xx`, `AC-xx`, `TASK-xx` y `TEST-xx` son únicos dentro de la feature. Para citarlos desde fuera se antepone la carpeta: `001-slug/AC-02`.
- Al copiar una plantilla a la carpeta de la feature, cada enlace relativo necesita un `../` más, porque la carpeta está un nivel más abajo que `templates/`.

## Relación con las historias de usuario

Las [historias de usuario](../planning/user-stories/user-stories.md) son la fuente de los requisitos. La especificación las refina hasta el nivel de implementación y no las sustituye:

- Cada "Escenario NN" de la historia se convierte en `AC-NN`, con el mismo número.
- Un AC que no sale de la historia se marca como **propuesto** hasta que lo apruebe una persona en el hito de alcance.
- Una contradicción entre la historia, el contrato del BFF y el código se registra como pregunta abierta. No se resuelve en silencio.
- Un tema de [`PENDING-DECISIONS.md`](../planning/PENDING-DECISIONS.md) es una decisión pendiente de la especificación, no un supuesto.

Las historias de WebStore describen lo que la demo ya implementa ([trazabilidad](../planning/TRACEABILITY.md)). Una feature nueva parte de una historia, de un elemento priorizado del [backlog](../planning/backlog.md) o de un ADR.

## Etapas, skills y artefactos

| Etapa | Skill | Artefacto | Hito humano |
|---|---|---|---|
| 1. Especificar | `sdd-specify` | `specification.md` | Alcance |
| 2. Planificar | `sdd-plan` | `planning.md` | — |
| 3. Decidir y modelar | `sdd-decide` | ADR en `docs/adrs/` | Arquitectura |
| 4. Desglosar | `sdd-tasks` | `tasks.md` | — |
| 5. Implementar | `sdd-implement` | Código y pruebas | Solo en alto impacto |
| 6. Verificar | `sdd-verify` | `verification.md` | — |
| 7. Entregar | `pr-create` y `post-merge` | El PR único de la feature, los ADR actualizados y el registro de la entrega | Entrega |

Las etapas 1 a 6 son commits de una misma rama `feature/NNN-slug`, y los hitos se registran en ella: la feature se entrega en [un solo pull request](../architecture/development-workflow.md#un-pull-request-por-feature).

Los skills viven en [`.agents/skills/`](../../.agents/README.md) y se pueden usar desde cualquier herramienta compatible con el estándar Agent Skills. Cómo se invocan en cada herramienta está en su [adaptador](../../.agents/adapters/).

## Estados de una feature

`especificada` → `planificada` → `desglosada` → `en implementación` → `verificada` → `entregada`. El estado vigente se mantiene en el [índice](features/README.md).

## Cómo empezar

1. Pide el skill `sdd-specify` con el objetivo o la historia de usuario (por ejemplo, `sdd-specify` con `US06 comprar como invitado`).
2. Revisa la especificación y aprueba el hito de alcance.
3. Continúa con `sdd-plan` y el `NNN-slug` de la feature, y con las etapas siguientes, en la misma rama.
4. Con el hito de entrega aprobado, abre el PR de la feature con `pr-create`.
