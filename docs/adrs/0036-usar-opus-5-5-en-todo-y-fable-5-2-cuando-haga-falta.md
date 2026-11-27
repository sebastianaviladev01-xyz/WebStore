# 0036. Usar Opus 5.5 en todos los niveles y Fable 5.2 cuando haga falta

- Estado: Aceptada
- Fecha: 2026-11-27

Decidida por Sebastián Avila el 2026-11-27, al cerrar PBI-0242: «pa todo es opus 5.5, a menos de que necesites usar fable». Modifica el catálogo de [ADR-0008](0008-trabajar-con-claude-code-o-codex-mediante-adaptadores.md) (versión 1.2.0) y el tope que pidió Daniel Avila el 2026-11-13.

## Contexto

### Por qué había que decidir

[PBI-0242](../planning/backlog.md) pedía revisar el catálogo con el reparto de modelos por etapa que usa Daniel. En la reunión del 2026-11-20 contó que coordina «con Opus 5.5 alto», que diseña el plan «con Opus en extra alto o […] si es que tengo cuota bastante de sobra, lo uso con Fable 5.2» y que programa con Sonnet. El catálogo 1.1.0 daba Haiku al nivel ligero, Sonnet al estándar y Opus 5.5 al avanzado. Su tope era Opus 5.5 con esfuerzo alto, sin ningún modelo por encima.

### Opciones

| Opción | Qué habría significado | A favor | En contra |
|---|---|---|---|
| **Opus 5.5 en todo y Fable 5.2 cuando haga falta (elegida)** | Todos los niveles de Claude Code usan Opus 5.5. Fable 5.2 se usa solo cuando Opus 5.5 con esfuerzo alto no basta, y se dice el motivo | Un solo modelo, el que ya se usa y se validó en los lotes; una salida para lo que Opus no resuelve | Gasta más cuota que Haiku o Sonnet en el trabajo literal |
| El reparto de Daniel (Sonnet para programar, Opus para coordinar, Fable para el plan) | Un modelo por etapa | Ahorra cuota | Las tareas de los lotes se resolvieron con Opus 5.5; Sonnet no se ha medido en este repositorio |
| Dejar el catálogo 1.1.0 | Haiku, Sonnet y Opus por nivel, sin Fable | Nada cambia | No es lo que se hace: los subagentes de los lotes ya trabajan con Opus 5.5 |

## Decisión

En Claude Code usaremos **Opus 5.5 en los tres niveles** (ligero, estándar y avanzado) y en la revisión ciega. El esfuerzo sigue siendo el de cada tarea, con `alto` como máximo; nunca `xhigh` ni `max`.

Usaremos **Fable 5.2** (`escalation` en el catálogo, alias `fable`), con esfuerzo alto como máximo, solo cuando Opus 5.5 con esfuerzo alto no basta:
- si falló dos veces en la tarea;
- o si no llega a un resultado sólido en diseño o diagnóstico.

El motivo se escribe en el informe y en el PR. Si Fable 5.2 también falla dos veces, el agente se detiene y pregunta. Una persona puede pedir Fable 5.2 para una sesión concreta.

Codex no cambia: su adaptador sigue provisional. Fable 5.1 sigue excluido.

*Motivo:* el trabajo de los lotes ya se hace con Opus 5.5 y sale bien. Tener un solo modelo evita resultados distintos según el nivel, y Fable queda para lo que de verdad lo necesita.

## Consecuencias

- **Más fácil:** cualquier tarea se delega con `opus`, sin decidir el modelo por nivel. La subida a Fable tiene una regla y un registro.
- **Más difícil:** el trabajo literal gasta más cuota que con Haiku o Sonnet. Si la cuota se vuelve un problema, se revisa este ADR.
- **Cambia:** el [catálogo](../../.agents/execution-catalog.json) 1.2.0, el [adaptador de Claude Code](../../.agents/adapters/claude-code.md#modelo-y-esfuerzo) y las [reglas de escalado](../development/agent-execution.md#reglas-de-escalado).
- **Vigencia:** hasta que Sebastián Avila o Daniel Avila pidan otro reparto. Responsable: Sebastián Avila.
