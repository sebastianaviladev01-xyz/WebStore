# 0016. Volver a un pull request por hito

- Estado: Aceptada
- Fecha: 2026-11-14

Decidida por Sebastián Avila el 2026-11-14 («creo que mejor regresa al flujo anterior completo de idshield» y, al preguntarle qué alcance tenía, «Volver a un PR por hito»). Revierte la instrucción escrita de Daniel Avila del 2026-11-13, que dio lugar a [ADR-0015](0015-entregar-cada-feature-en-un-solo-pull-request.md). Sebastián Avila lo decidió sabiéndolo. La confirmación de Daniel Avila está pendiente: hasta que la dé, el PR de este cambio no se fusiona.

## Contexto

### Por qué había que decidir

[ADR-0015](0015-entregar-cada-feature-en-un-solo-pull-request.md) cambió el flujo de IdShield, con un PR por hito, por un solo PR por feature, y pidió estrenarlo con un piloto. El piloto fue la feature 007, entregada el 2026-11-14 con el PR #42. Su [revisión](../specs/features/007-desborde-de-productos-del-admin/verification.md#revisión-del-piloto) concluyó «funcionó, con ajustes» y anotó 17 fricciones.

Al comparar los dos flujos después del piloto, el de un solo PR conserva los controles de cada tarea, pero debilita cuatro cosas:

- el CI se ejecuta una vez, al final, y no en cada etapa;
- otra persona ve la feature entera de golpe, sin poder frenar la especificación o el plan antes de la implementación;
- la aprobación de cada hito es un commit que escribe un agente, no el merge de un PR hecho por una persona;
- la rama vive días y choca con `dev` en el backlog y en el índice.

Sebastián Avila preguntó dos veces si se perdía precisión y decidió volver al flujo de IdShield completo.

### Opciones

| Opción | Qué habría significado | A favor | En contra |
|---|---|---|---|
| **Un PR por hito, como IdShield (elegida)** | Alcance, arquitectura e implementación cierran cada uno su PR hacia `dev`; la implementación puede repartirse por bloques. Es la regla anterior a ADR-0015 | El CI y la revisión de una persona en cada hito; `dev` refleja el avance; ramas cortas, sin conflictos; el mismo flujo que IdShield | De cuatro a seis PR por feature: vuelve la lentitud que Sebastián Avila señaló el 2026-11-13. Contradice la instrucción de Daniel Avila |
| Un PR por feature (ADR-0015) | Seguir como en el piloto, con los ajustes de su revisión | Una sola ronda de integración por feature; ya probado en un piloto | Lo que debilita, descrito arriba |
| Un PR por feature y una corrección directa para los defectos | Añadir a ADR-0015 un camino corto, de una sesión y un PR, para defectos que no abren decisiones | El costo se ajusta al tamaño del cambio | Menos puntos de control todavía; no se probó. La sesión principal la propuso el 2026-11-14 en una rama que no se publicó |

## Decisión

Volveremos al flujo de IdShield: cada hito de una feature cierra un PR hacia `dev`.

- **Alcance:** `specification.md` y la fila del índice de features.
- **Arquitectura:** `planning.md`, los ADR y los documentos de arquitectura que cambien.
- **Implementación:** `tasks.md`, el código, las pruebas y `verification.md`. Puede repartirse en varios PR, por bloques o fases.
- Tras el merge de cada PR, `post-merge` cierra la rama local y la etapa siguiente vuelve a crearla desde la rama base.

El detalle vive en [Pull requests de una feature](../architecture/development-workflow.md#pull-requests-de-una-feature). Este ADR sustituye a ADR-0015.

Sebastián Avila pidió además que el flujo quedara igual al de IdShield, sin añadidos («Quítalas todas», el 2026-11-14, al ver las cinco diferencias que quedaban). Por eso este cambio devuelve los documentos del proceso, los skills, los adaptadores y el catálogo de niveles al estado anterior al PR #38, y retira también lo que llegó con él o después sin depender del número de PR:

- **El tope de modelo y esfuerzo.** El catálogo vuelve a la versión 1.0.0, con los esfuerzos `muy alto` y `máximo`. Daniel Avila había pedido el 2026-11-13 no pasar de Opus 5.5 con `high`, por el consumo de tokens: esa instrucción deja de estar escrita en el repositorio.
- **La regla de llevar a [decisiones pendientes](../planning/PENDING-DECISIONS.md)** lo que las fuentes no dicen de forma explícita, y la de que todo hallazgo fuera de alcance tenga su PBI. Las filas que ya están en decisiones pendientes y en el backlog no se tocan.
- **El aviso del adaptador de Claude Code** sobre las líneas de coautoría (PR #41). La [convención de commits](../git/conventional-commits.md) las sigue prohibiendo.
- **El apartado «Registro de la entrega».** El registro se hacía antes sin estar escrito, en las features 004 y 005, y vuelve a no estarlo.

*Motivo:* un PR por hito pone el CI y la revisión de una persona antes de cada etapa siguiente. Sebastián Avila prefiere esa precisión, y un flujo idéntico al de IdShield, al tiempo que ahorra un solo PR.

## Consecuencias

**Lo que se vuelve más fácil:**

- Un fallo que solo aparece en el CI se descubre en la etapa que lo causa.
- Quien revisa ve diffs pequeños y puede frenar una especificación o un plan antes de que se escriba código.
- `dev` muestra el estado de cada feature en curso, y el índice y el backlog no entran en conflicto.
- WebStore vuelve a tener el mismo flujo que IdShield.

**Lo que se vuelve más difícil:**

- Una feature vuelve a necesitar de cuatro a seis PR, con su ronda de publicar, esperar el CI, revisar, fusionar y cerrar la rama. Es la lentitud que motivó ADR-0015, y esta decisión no la resuelve.
- `dev` recibe documentos de features sin terminar.
- Falta la confirmación de Daniel Avila, que pidió lo contrario. Si no la da, este ADR se sustituye.
- Sin el tope escrito, un agente puede volver a usar los esfuerzos `muy alto` y `máximo`, que consumen más tokens. Son dos instrucciones de Daniel Avila las que se revierten, no una.
- Sin la regla de decisiones pendientes, una pregunta de negocio que las fuentes no responden puede volver a decidirse en un hito.
- Sin el aviso del adaptador, Claude Code puede volver a añadir la línea de coautoría que la convención prohíbe: pasó tres veces el 2026-11-14.

**Transición y fuera de alcance:**

- La feature 007 se entregó con un solo PR y no se reescribe. Sus documentos conservan lo que pasó; sus enlaces al apartado retirado apuntan ahora a ADR-0015.
- La feature 006, con su especificación ya en `dev`, sigue con un PR por hito desde su siguiente etapa.
- PBI-0135, los ajustes del flujo de un solo PR, pasa a `descartada`. Las fricciones del piloto que valen con cualquier flujo quedan en PBI-0136.
- La corrección directa no se adopta: los defectos del backlog siguen el flujo de una feature o, si no lo son, una rama y un PR, como hasta ahora.
