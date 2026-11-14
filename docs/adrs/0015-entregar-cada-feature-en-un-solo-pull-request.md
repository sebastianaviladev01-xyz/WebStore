# 0015. Entregar cada feature en un solo pull request

- Estado: Propuesta
- Fecha: 2026-11-14

## Contexto

### Por qué había que decidir

El [flujo de trabajo](../architecture/development-workflow.md) cerraba un pull request por hito. La feature 005 necesitó seis PR para un solo cambio (#31 a #36: especificación, plan, ADR, tareas, implementación y registro de la entrega), la 004 otros seis (#22 a #27) y la 003, cinco (#17 a #21). Cada PR intermedio repite la ronda de publicar, esperar el CI, revisar, fusionar, cerrar la rama y volver a crearla, y lleva a `dev` documentos de una feature sin terminar. Daniel Avila pidió el 2026-11-14 entregar cada feature como un lote completo.

### Opciones

| Opción | Qué habría significado | A favor | En contra |
|---|---|---|---|
| **Un PR por feature, abierto al final (elegida)** | Todas las etapas y los hitos son commits de `feature/NNN-slug`. El PR se abre con el hito de entrega aprobado. Solo el registro de la entrega va en un PR nuevo | Una sola ronda de CI, revisión y merge; `dev` recibe features completas; quien revisa ve el cambio entero | El CI se ejecuta al final; la feature en curso no está en `dev`; el PR es grande y la rama vive más |
| Un PR en borrador desde la primera etapa | El PR se abre con la especificación y recibe los commits de las etapas siguientes | El CI corre en cada push y el avance se ve en GitHub | El título y el cuerpo se redactan sin conocer el resultado y se reescriben; el CI se gasta en commits de documentación |
| Un PR por hito (regla anterior) | Especificación, plan, ADR, tareas e implementación en PR separados | Revisiones pequeñas; `dev` refleja el avance de cada feature | De cuatro a seis PR por feature; cada corrección pequeña tarda como una feature |

## Decisión

Entregaremos cada feature en un solo pull request hacia `dev`:

- **Una rama.** Todas las etapas (especificación, plan, ADR, tareas, bloques de implementación y verificación) son commits de la misma rama `feature/NNN-slug`, que vive desde `sdd-specify` hasta el merge.
- **Hitos como commits.** Los hitos humanos de alcance, arquitectura y entrega, y las aprobaciones de las tareas, de cada tarea ⚠ y de cada bloque, se siguen pidiendo igual. Se registran en el artefacto de su etapa (quién aprobó y cuándo), en un commit de la rama. Un hito no abre un PR, y la etapa siguiente no empieza sin el hito anterior registrado.
- **Un PR.** Se abre con el skill `pr-create` cuando `sdd-verify` ha terminado y el hito de entrega está aprobado. Una persona lo revisa y lo fusiona con merge commit.
- **Registro de la entrega.** Después del merge, un PR nuevo deja la feature como `entregada`, con el número del PR y el SHA del merge, que no existen antes. Es el único PR adicional de una feature.

No cambian las sesiones por etapa y por bloque, el worktree de la implementación, el ciclo TDD, los controles de cada tarea ni la [política de ramas](../git/conventional-pull-requests.md#política-de-pull-requests). Este ADR amplía [ADR-0002](0002-adoptar-sdd-y-tdd.md) y [ADR-0005](0005-adoptar-convenciones-de-versionamiento-y-entrega.md); no los sustituye. El detalle vive en [Un pull request por feature](../architecture/development-workflow.md#un-pull-request-por-feature).

*Motivo:* los PR intermedios no añadían una revisión que no existiera ya en el hito: solo repetían la ronda de integración. Un PR por feature conserva los hitos y la evidencia en el historial y quita esa repetición.

## Consecuencias

**Lo que se vuelve más fácil:**

- Una feature pasa por una ronda de CI, revisión y merge, más la del registro de la entrega.
- `dev` solo recibe features verificadas y con el hito de entrega aprobado.
- El merge commit conserva, en orden, los commits de cada etapa, de cada hito y de cada par rojo y verde.

**Lo que se vuelve más difícil:**

- El CI no se ejecuta hasta el final. Los controles de cada tarea (`npm run verify` y el e2e) se siguen ejecutando en local, y un fallo que solo aparece en el CI se descubre más tarde.
- Una feature en curso no figura en el índice de `dev` hasta su merge: su fila y sus artefactos están en su rama. Para elegir el siguiente `NNN` hay que mirar también las ramas `feature/NNN-*`.
- La rama vive más y puede chocar con `dev`, sobre todo en el índice de features y en el backlog. Se resuelve con la [rama de integración](../git/conventional-pull-requests.md#1-actualizar-y-revisar-las-referencias), sin fusionar `dev` en la feature.
- El PR es más grande. Se revisa por commits, en el orden de las etapas.
- Mientras la rama no se publique, el trabajo solo está en un equipo. La rama se puede publicar sin abrir el PR.

**Transición y fuera de alcance:**

- Las features 001 a 005 se entregaron con la regla anterior y no se reescriben.
- Una feature con etapas ya fusionadas en `dev` (hoy, la 006, con su especificación) sigue con esta regla desde su siguiente etapa: una rama y un PR para lo que falta.
- Los cambios que no son una feature (documentación, correcciones) ya iban en un solo PR y no cambian.
