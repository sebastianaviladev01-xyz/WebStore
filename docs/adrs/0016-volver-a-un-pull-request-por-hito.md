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

El cambio devuelve los documentos del proceso y los skills al estado anterior al PR #38 en todo lo que toca a los PR de una feature. Se conserva lo que llegó con ese PR o después y protege el trabajo sin depender de cuántos PR tiene una feature:

- **El tope de modelo y esfuerzo:** Opus 5.5 con `high`, que pidió Daniel Avila el 2026-11-13 por el consumo de tokens. El catálogo sigue en la versión 1.1.0, sin los esfuerzos `muy alto` y `máximo`.
- **La regla de llevar a [decisiones pendientes](../planning/PENDING-DECISIONS.md)** lo que las fuentes no dicen de forma explícita, y la de que todo hallazgo fuera de alcance tenga su PBI.
- **El aviso del adaptador de Claude Code** sobre las líneas de coautoría (PR #41).

Sebastián Avila pidió primero retirar también estas tres, para dejar el flujo literal («Quítalas todas»), y el mismo 2026-11-14, antes del merge, pidió reponerlas al ver el riesgo que volvía con cada una («vuélvelo por favor»).

No se conserva el apartado «Registro de la entrega», que llegó con ADR-0015: el registro se hacía antes sin estar escrito, en las features 004 y 005, y vuelve a no estarlo.

*Motivo:* un PR por hito pone el CI y la revisión de una persona antes de cada etapa siguiente. Sebastián Avila prefiere esa precisión al tiempo que ahorra un solo PR, y quiere trabajar con el flujo ya probado de IdShield antes de volver a cambiarlo.

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

**Transición y fuera de alcance:**

- La feature 007 se entregó con un solo PR y no se reescribe. Sus documentos conservan lo que pasó; sus enlaces al apartado retirado apuntan ahora a ADR-0015.
- La feature 006, con su especificación ya en `dev`, sigue con un PR por hito desde su siguiente etapa.
- PBI-0135, los ajustes del flujo de un solo PR, pasa a `descartada`. Las fricciones del piloto que valen con cualquier flujo quedan en PBI-0136.
- La corrección directa no se adopta: los defectos del backlog siguen el flujo de una feature o, si no lo son, una rama y un PR, como hasta ahora.

> Nota (2026-11-27): la auditoría de las reuniones encontró que la confirmación de Daniel Avila que pedía este ADR no consta. Queda registrado como decisión abierta de Sebastián Avila y Daniel en las [decisiones pendientes](../planning/PENDING-DECISIONS.md) («Un PR por feature o un PR por hito»). El 2026-11-24 Daniel dijo que reescribirá el flujo al migrar el repositorio. Mientras tanto, este ADR sigue vigente.
