# 0034. Decidir las preguntas de negocio sin esperar a Daniel

- Estado: Aceptada
- Fecha: 2026-11-27

Decidida por Sebastián Avila. El 2026-11-26, al registrar la reunión del 2026-11-24, dijo: «no quiero dejar nada para Daniel o que responda, eso demora mucho, hay que tomar la iniciativa nosotros y aplicar la mejor opción». El 2026-11-27 aprobó convertir en decisiones suyas las que seguían provisionales («Sí, conviértelas», [PR #112](https://github.com/sebastianaviladev01-xyz/WebStore/pull/112)) y corregir esta regla del flujo («Sí, corrígela»).

## Contexto

### Por qué había que decidir

Desde el 2026-11-14, una pregunta de negocio que las fuentes no responden de forma explícita va a las [decisiones pendientes](../planning/PENDING-DECISIONS.md) para Daniel Avila, y la feature queda bloqueada hasta su respuesta. Así lo dicen [`AGENTS.md`](../../AGENTS.md), los [hitos humanos](../architecture/development-workflow.md#hitos-humanos) y el skill [`sdd-specify`](../../.agents/skills/sdd-specify/SKILL.md). Las respuestas de Daniel tardaron días: la agenda del 2026-11-14 la respondió entre el 2026-11-18 y el 2026-11-20. Desde el 2026-11-26 Sebastián Avila decide esas preguntas, y la regla escrita ya no coincidía con lo que se hace ([ADR-0033](0033-construir-por-lotes-lo-que-salio-de-la-reunion-del-2026-11-24.md) y [PR #112](https://github.com/sebastianaviladev01-xyz/WebStore/pull/112)).

### Opciones

| Opción | Qué habría significado | A favor | En contra |
|---|---|---|---|
| **Decide Sebastián Avila, sin bloquear (elegida)** | La pregunta se presenta en el hito como las demás, con alternativas, recomendación y citas, y la decide Sebastián Avila. Se registra como suya y la feature sigue | Nada espera días a una respuesta; las citas y la recomendación siguen a la vista | Daniel puede pedir otra cosa después y habrá que rehacerla |
| Mantener la regla del 2026-11-14 | La pregunta va a Daniel y la feature se bloquea | Lo construido coincide con lo que decide el producto desde el principio | Bloquea días cada feature, y la regla ya no se cumple |
| Decidir como provisional, por confirmar con Daniel | Como en los lotes de [ADR-0017](0017-cerrar-el-backlog-por-lotes-como-excepcion-al-flujo.md): se construye, pero la decisión queda abierta | No bloquea | Deja decisiones abiertas sin fecha: el 2026-11-27 había 16 filas y 21 detalles así |

## Decisión

Una pregunta de negocio que las fuentes no responden de forma explícita la decide Sebastián Avila, no Daniel, y no bloquea la feature:

- Se presenta en el hito como las demás: de una en una, con sus alternativas, la recomendación, la evidencia y las citas de Daniel o de las reuniones que la tocan. Una lectura dudosa de una fuente se presenta como lectura, no como hecho.
- Si Sebastián Avila delegó la decisión (por ejemplo, en una entrega por lotes), la sesión elige la opción recomendada. La recomendación sigue lo que Daniel mostró como patrón y conserva el comportamiento actual cuando nada lo contradice. Entre las demás, gana la que mantiene la coherencia de los temas y la accesibilidad.
- Se registra en las [decisiones pendientes](../planning/PENDING-DECISIONS.md) con la forma «**Decidido por Sebastián Avila (fecha)**, sin esperar a Daniel: si él pide otra cosa, se cambia», con las citas y la opción elegida. No se escribe «Provisional, por confirmar con Daniel».
- Si Daniel pide otra cosa después, el cambio es un PBI del [backlog](../planning/backlog.md) y se especifica como cualquier otro.

Siguen abiertas, y bloquean lo que dependa de ellas, las decisiones que no se pueden tomar en el repositorio: las de terceros (pasarela, correo, facturación, revisión legal), las que dependen de algo que Daniel entrega (la arquitectura y el modelo de datos base, el nombre y el logo del producto) y las que dependen del cliente.

*Motivo:* Sebastián Avila es quien aprueba los hitos y ya decide estas preguntas desde el 2026-11-26. Escribirlo evita que un agente bloquee una feature por una regla que ya no se aplica.

## Consecuencias

- **Más fácil:** ninguna feature espera días a una respuesta de negocio, y el flujo escrito coincide con lo que se hace.
- **Más difícil:** lo construido puede no ser lo que Daniel habría elegido. Si pide otra cosa, se rehace con un PBI nuevo. Las citas y la recomendación de cada fila sirven para que pueda revisarlo.
- **Sin cambios:** las preguntas técnicas o de proceso las sigue respondiendo quien aprueba el hito. Las decisiones de terceros siguen bloqueando lo que dependa de ellas.
- **Cambia:** la regla de [`AGENTS.md`](../../AGENTS.md), los [hitos humanos](../architecture/development-workflow.md#hitos-humanos) y el skill [`sdd-specify`](../../.agents/skills/sdd-specify/SKILL.md). Las decisiones que ya estaban provisionales se convirtieron el 2026-11-27 en el [PR #112](https://github.com/sebastianaviladev01-xyz/WebStore/pull/112).
